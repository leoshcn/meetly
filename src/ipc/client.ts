export type AppError = {
  code: string;
  message: string;
  details?: unknown;
};

export function isAppError(value: unknown): value is AppError {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    "message" in value &&
    typeof (value as AppError).code === "string" &&
    typeof (value as AppError).message === "string"
  );
}

/**
 * Normalize any invoke rejection into a stable AppError.
 * Unknown / string shapes become INTERNAL.
 */
export function normalizeError(err: unknown): AppError {
  if (isAppError(err)) {
    return {
      code: err.code,
      message: err.message,
      details: err.details,
    };
  }

  // Tauri sometimes surfaces serialized errors as nested objects.
  if (typeof err === "object" && err !== null) {
    const record = err as Record<string, unknown>;
    if (isAppError(record.error)) {
      return normalizeError(record.error);
    }
    // Payload may be a JSON string in `message`.
    if (typeof record.message === "string") {
      try {
        const parsed: unknown = JSON.parse(record.message);
        if (isAppError(parsed)) {
          return normalizeError(parsed);
        }
      } catch {
        // fall through
      }
    }
  }

  return {
    code: "INTERNAL",
    message: "Unexpected error",
  };
}

type InvokeFn = <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;

let invokeImpl: InvokeFn | null = null;

async function getInvoke(): Promise<InvokeFn> {
  if (invokeImpl) {
    return invokeImpl;
  }
  const mod = await import("@tauri-apps/api/core");
  invokeImpl = mod.invoke as InvokeFn;
  return invokeImpl;
}

/** Test-only: inject a mock invoke implementation. */
export function __setInvokeForTests(fn: InvokeFn | null): void {
  invokeImpl = fn;
}

/**
 * Sole entry point for Tauri IPC. UI code must not call raw `invoke`.
 */
export async function invokeCommand<T>(
  cmd: string,
  args?: Record<string, unknown>,
): Promise<T> {
  try {
    const invoke = await getInvoke();
    return await invoke<T>(cmd, args);
  } catch (err) {
    throw normalizeError(err);
  }
}
