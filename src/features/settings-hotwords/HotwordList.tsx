import { Button } from "../../shared/ui";
import styles from "./SettingsHotwords.module.css";

type Props = {
  words: string[];
  onRemove: (index: number) => void;
};

export function HotwordList({ words, onRemove }: Props) {
  if (words.length === 0) {
    return <p className={styles.empty}>暂无热词</p>;
  }

  return (
    <ul className={styles.list}>
      {words.map((word, index) => (
        <li key={`${word}-${index}`}>
          <span>{word}</span>
          <Button
            variant="ghost"
            onClick={() => onRemove(index)}
            aria-label={`移除 ${word}`}
          >
            移除
          </Button>
        </li>
      ))}
    </ul>
  );
}
