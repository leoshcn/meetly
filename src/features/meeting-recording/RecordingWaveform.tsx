import { useEffect, useRef } from "react";
import { recordStatus } from "../../ipc";
import styles from "./RecordingWaveform.module.css";

const HISTORY = 56;
const POLL_MS = 40;

type Props = {
  active: boolean;
};

/**
 * Live dual-track amplitude ribbon driven by backend capture meters.
 * Mic draws above the midline; system loopback mirrors below.
 */
export function RecordingWaveform({ active }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const micHistRef = useRef<number[]>(Array.from({ length: HISTORY }, () => 0));
  const sysHistRef = useRef<number[]>(Array.from({ length: HISTORY }, () => 0));
  const rafRef = useRef<number | null>(null);
  const pollRef = useRef<number | null>(null);
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    reducedMotionRef.current = mq.matches;
    const onChange = () => {
      reducedMotionRef.current = mq.matches;
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!active) {
      micHistRef.current = Array.from({ length: HISTORY }, () => 0);
      sysHistRef.current = Array.from({ length: HISTORY }, () => 0);
      if (pollRef.current !== null) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    let cancelled = false;

    pollRef.current = window.setInterval(() => {
      void (async () => {
        try {
          const status = await recordStatus();
          if (cancelled || status.state !== "recording") return;
          push(micHistRef.current, boost(status.mic_level));
          push(sysHistRef.current, boost(status.system_level));
        } catch {
          // Keep last frame if a poll fails mid-recording.
        }
      })();
    }, POLL_MS);

    const draw = () => {
      if (cancelled) return;
      paint(
        canvasRef.current,
        micHistRef.current,
        sysHistRef.current,
        reducedMotionRef.current,
      );
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      cancelled = true;
      if (pollRef.current !== null) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [active]);

  return (
    <div className={styles.wrap} aria-hidden={!active}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        role="img"
        aria-label="录音电平波形"
      />
      <div className={styles.legend}>
        <span className={styles.legendMic}>麦克风</span>
        <span className={styles.legendSys}>系统声音</span>
      </div>
    </div>
  );
}

/** Expand quiet speech into the visible range without clipping peaks hard. */
function boost(level: number): number {
  const clamped = Math.min(1, Math.max(0, level));
  // Gentle gamma so conversational speech fills more of the ribbon.
  return Math.pow(clamped, 0.55);
}

function push(history: number[], value: number) {
  history.push(value);
  if (history.length > HISTORY) {
    history.shift();
  }
}

function paint(
  canvas: HTMLCanvasElement | null,
  mic: number[],
  sys: number[],
  reducedMotion: boolean,
) {
  if (!canvas) return;
  const parent = canvas.parentElement;
  if (!parent) return;

  const dpr = window.devicePixelRatio || 1;
  const cssW = parent.clientWidth;
  const cssH = 112;
  const w = Math.max(1, Math.floor(cssW * dpr));
  const h = Math.max(1, Math.floor(cssH * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, w, h);

  const midY = h * 0.5;
  const padX = 8 * dpr;
  const usableW = w - padX * 2;
  const maxAmp = h * 0.42;
  const barGap = usableW / HISTORY;
  const barW = Math.max(1.5 * dpr, barGap * 0.55);

  // Soft paper wash behind the ribbon.
  const wash = ctx.createLinearGradient(0, 0, 0, h);
  wash.addColorStop(0, "rgba(31, 92, 87, 0.04)");
  wash.addColorStop(0.5, "rgba(31, 92, 87, 0.00)");
  wash.addColorStop(1, "rgba(20, 24, 28, 0.04)");
  ctx.fillStyle = wash;
  roundRect(ctx, 0, 0, w, h, 12 * dpr);
  ctx.fill();

  // Midline — thin ink rule.
  ctx.strokeStyle = "rgba(20, 24, 28, 0.14)";
  ctx.lineWidth = Math.max(1, dpr * 0.75);
  ctx.beginPath();
  ctx.moveTo(padX, midY);
  ctx.lineTo(w - padX, midY);
  ctx.stroke();

  const now = performance.now();
  const breath = reducedMotion ? 1 : 0.94 + 0.06 * Math.sin(now / 1100);

  // Soft stem marks under the ribbons (tempo grid, not loud EQ bars).
  ctx.strokeStyle = "rgba(20, 24, 28, 0.05)";
  ctx.lineWidth = Math.max(1, dpr * 0.6);
  for (let i = 0; i < HISTORY; i += 4) {
    const x = padX + i * barGap + barGap * 0.5;
    ctx.beginPath();
    ctx.moveTo(x, midY - maxAmp * 0.9);
    ctx.lineTo(x, midY + maxAmp * 0.9);
    ctx.stroke();
  }

  drawRibbon(ctx, mic, padX, barGap, midY, maxAmp * breath, true, dpr);
  drawRibbon(ctx, sys, padX, barGap, midY, maxAmp * breath, false, dpr);

  // Discrete ink ticks at the crest of each sample — seismograph feel.
  for (let i = 0; i < HISTORY; i++) {
    const x = padX + i * barGap + barGap * 0.5;
    const fade = 0.2 + (i / HISTORY) * 0.8;
    const micH = mic[i] * maxAmp * breath;
    const sysH = sys[i] * maxAmp * breath;
    if (micH > dpr) {
      ctx.fillStyle = `rgba(31, 92, 87, ${fade.toFixed(3)})`;
      ctx.fillRect(x - barW * 0.35, midY - micH, barW * 0.7, Math.max(dpr, micH * 0.12));
    }
    if (sysH > dpr) {
      ctx.fillStyle = `rgba(20, 24, 28, ${(fade * 0.7).toFixed(3)})`;
      ctx.fillRect(x - barW * 0.35, midY + sysH - Math.max(dpr, sysH * 0.12), barW * 0.7, Math.max(dpr, sysH * 0.12));
    }
  }

  // Listening node — pulse with combined energy.
  const live =
    (mic[mic.length - 1] ?? 0) * 0.55 + (sys[sys.length - 1] ?? 0) * 0.45;
  const nodeR = (3.2 + live * 4.5) * dpr * (reducedMotion ? 1 : breath);
  ctx.beginPath();
  ctx.fillStyle = live > 0.04 ? "rgba(31, 92, 87, 0.95)" : "rgba(90, 99, 108, 0.55)";
  ctx.arc(w - padX - 2 * dpr, midY, nodeR, 0, Math.PI * 2);
  ctx.fill();
  if (live > 0.08 && !reducedMotion) {
    ctx.beginPath();
    ctx.strokeStyle = `rgba(31, 92, 87, ${Math.min(0.45, live * 0.6)})`;
    ctx.lineWidth = dpr;
    ctx.arc(w - padX - 2 * dpr, midY, nodeR + 4 * dpr * live, 0, Math.PI * 2);
    ctx.stroke();
  }
}

/** Filled amplitude ribbon above (mic) or below (system) the midline. */
function drawRibbon(
  ctx: CanvasRenderingContext2D,
  samples: number[],
  padX: number,
  step: number,
  midY: number,
  maxAmp: number,
  above: boolean,
  dpr: number,
) {
  if (samples.length === 0) return;
  const sign = above ? -1 : 1;
  const points = samples.map((v, i) => ({
    x: padX + i * step + step * 0.5,
    y: midY + sign * v * maxAmp,
  }));

  ctx.beginPath();
  ctx.moveTo(points[0].x, midY);
  ctx.lineTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const cur = points[i];
    const cpx = (prev.x + cur.x) / 2;
    ctx.quadraticCurveTo(prev.x, prev.y, cpx, (prev.y + cur.y) / 2);
  }
  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);
  ctx.lineTo(last.x, midY);
  ctx.closePath();

  const grad = ctx.createLinearGradient(0, midY, 0, midY + sign * maxAmp);
  if (above) {
    grad.addColorStop(0, "rgba(31, 92, 87, 0.08)");
    grad.addColorStop(1, "rgba(31, 92, 87, 0.38)");
  } else {
    grad.addColorStop(0, "rgba(20, 24, 28, 0.06)");
    grad.addColorStop(1, "rgba(20, 24, 28, 0.28)");
  }
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.strokeStyle = above ? "rgba(31, 92, 87, 0.55)" : "rgba(20, 24, 28, 0.4)";
  ctx.lineWidth = Math.max(1, 1.25 * dpr);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const cur = points[i];
    const cpx = (prev.x + cur.x) / 2;
    ctx.quadraticCurveTo(prev.x, prev.y, cpx, (prev.y + cur.y) / 2);
  }
  ctx.lineTo(last.x, last.y);
  ctx.stroke();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
