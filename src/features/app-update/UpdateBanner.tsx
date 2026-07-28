import { Button } from "../../shared/ui";
import { useAppUpdate } from "./AppUpdateProvider";
import styles from "./UpdateBanner.module.css";

type Props = {
  onOpenAbout: () => void;
};

export function UpdateBanner({ onOpenAbout }: Props) {
  const {
    bannerVisible,
    availableVersion,
    phase,
    progressPercent,
    dismissBanner,
  } = useAppUpdate();

  if (!bannerVisible || !availableVersion) return null;

  let detail = `新版本 ${availableVersion} 可用`;
  if (phase === "downloading") {
    detail =
      progressPercent != null
        ? `正在下载 ${availableVersion}… ${progressPercent}%`
        : `正在下载 ${availableVersion}…`;
  } else if (phase === "readyToInstall") {
    detail = `${availableVersion} 已下载，可安装`;
  } else if (phase === "installing") {
    detail = `正在安装 ${availableVersion}…`;
  }

  return (
    <div className={styles.banner} role="status">
      <p className={styles.text}>{detail}</p>
      <div className={styles.actions}>
        <Button type="button" variant="secondary" onClick={onOpenAbout}>
          查看更新
        </Button>
        <Button type="button" variant="ghost" onClick={dismissBanner}>
          稍后
        </Button>
      </div>
    </div>
  );
}
