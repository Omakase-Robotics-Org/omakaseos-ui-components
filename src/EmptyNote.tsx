/**
 * @file EmptyNote — muted placeholder text for an empty result.
 *
 * Status layer. EmptyNote represents ABSENCE in flow: when it is not
 * rendered, it occupies no space. It is deliberately NOT ReservedText,
 * which reserves height for layout stability.
 */
import styles from "./EmptyNote.module.css";

export function EmptyNote(props: { label: string }) {
  return <p className={styles.note}>{props.label}</p>;
}
