/**
 * @file Avatar — a generic circular identity tile.
 *
 * Status layer. This promotes the dashboard's tile/layout half while leaving
 * its domain half behind: the dashboard's `kind → lucide glyph` map
 * (`person` / `agent` / `robot`) is suite vocabulary and stays in that app.
 * The consumer passes its chosen glyph through `fallback`; this library owns
 * only the tile and a generic person silhouette for the no-fallback case.
 *
 * The accepted sibling is `./aui`'s Radix Avatar. It provides image/fallback
 * slot parts on the aui token ground because Thread needs them. That is a
 * different object and is not merged here, by design. `ParticipantTile`
 * consumes an avatar SLOT as part of a live-stage tile; it is not this
 * identity tile either.
 *
 * `url` uses the image branch when it is non-null and non-empty. The fallback
 * branch is named from `name` because the glyph is generic (or caller-owned)
 * and cannot provide a domain name of its own.
 */
import type { ReactNode } from "react";
import styles from "./Avatar.module.css";

export type AvatarSize = "xs" | "sm" | "md" | "lg";

/** A small, domain-neutral person silhouette for an unnamed fallback. */
function DefaultSilhouette() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 9c0-3.866 3.582-7 8-7s8 3.134 8 7H4Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function Avatar(props: {
  url: string | null;
  name: string;
  size: AvatarSize;
  fallback?: ReactNode;
}) {
  if (props.url !== null && props.url !== "") {
    return (
      <span className={styles.tile} data-size={props.size}>
        <img src={props.url} alt={props.name} className={styles.image} />
      </span>
    );
  }

  return (
    <span
      className={styles.tile}
      data-size={props.size}
      data-fallback="glyph"
      role="img"
      aria-label={props.name}
    >
      {props.fallback ?? <DefaultSilhouette />}
    </span>
  );
}
