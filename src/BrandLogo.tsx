/**
 * @file BrandLogo — the Omakase suite's brand mark (single SoT).
 *
 * The square "O" seal that carries the suite's identity on its own, at any
 * surface width. Promoted from `robot-operations-web-service`'s
 * `packages/web/src/modules/brand/BrandLogo.tsx` — the only host that
 * carried it — so a second consuming app does not reimplement, or drift
 * from, the artwork (R04 P0, `ui-brand-upstream`).
 *
 * Rendered as an inline `<svg>` rather than an imported `.svg` asset file:
 * this library ships its `"."` export as raw `src/index.ts` with no build
 * step between it and a consumer's own bundler (see `package.json`'s
 * `main`/`module`/`types` all pointing at source), and the library's one
 * existing SVG precedent — `Avatar`'s `DefaultSilhouette` — already inlines
 * markup rather than importing a file, so this follows the same house
 * pattern instead of introducing a new asset-loading contract that every
 * consumer's bundler would have to support identically.
 *
 * The three fill colors below are the mark's own fixed identity (matching
 * the source `omakase-logo.svg` byte-for-byte in geometry and color) and are
 * deliberately NOT bound to `--ds-*` tokens: a brand mark does not repaint
 * itself to a host's theme the way a themed control does — see the file
 * header of `BrandLogo.module.css` for the token-mapping decision on the
 * mark's SIZE, which is the one thing here that is a length rather than a
 * color.
 *
 * The product name (e.g. a console's own header tag) is NOT part of this
 * mark on any surface — it lives at the call site, same as the source.
 */
import styles from "./BrandLogo.module.css";

export type BrandLogoProps = {
  /**
   * Accessible name for the mark. Defaults to "Omakase" (the suite brand,
   * not any one host's product name) — a host may pass its own product name
   * for extra specificity, but every existing call site renders correctly
   * with no `alt` at all.
   */
  alt?: string;
};

/** The Omakase suite's brand logo: a fixed-color square "O" seal. */
export function BrandLogo({ alt = "Omakase" }: BrandLogoProps = {}) {
  return (
    <svg
      className={styles.logo}
      viewBox="0 0 157.53051 157.53051"
      role="img"
      aria-label={alt}
    >
      <path
        fill="#c4c4c4"
        d="M0,58.959275C0,26.396967,26.396967,0,58.959275,0h39.61196c32.562308,0,58.959275,26.396967,58.959275,58.959275v39.61196c0,32.562308-26.396967,58.959275-58.959275,58.959275h-39.61196C26.396967,157.53051,0,131.133543,0,98.571235v-39.61196Z"
      />
      <path
        fill="#000"
        d="M1.909461,59.43942C1.909461,27.666501,27.666501,1.909461,59.43942,1.909461h38.65167c31.772919,0,57.529959,25.75704,57.529959,57.529959v38.65167c0,31.772919-25.75704,57.529959-57.529959,57.529959h-38.65167c-31.772919,0-57.529959-25.75704-57.529959-57.529959v-38.65167Z"
      />
      <path
        fill="#fff"
        d="M78.895906,126.501773c-7.374864,0-14.227124-1.180885-20.535538-3.55295-6.221844-2.372065-11.649693-5.713958-16.272393-10.025938-4.5356-4.311979-8.081228-9.361626-10.669812-15.160006-2.48024-5.808934-3.730982-12.13444-3.730982-18.997624,0-6.852632,1.250742-13.188691,3.730982-18.987072,2.588585-5.798381,6.188916-10.858837,10.811616-15.160264,4.6227-4.311722,10.039396-7.653873,16.260709-10.025938,6.232466-2.372065,12.987004-3.563245,20.274767-3.563245,7.374333,0,14.140024,1.19118,20.274767,3.563245,6.221313,2.372065,11.594458,5.714216,16.130589,10.025938,4.6227,4.301427,8.2225,9.361883,10.800463,15.160264,2.577963,5.713958,3.872255,12.050017,3.872255,18.987072,0,6.863185-1.294292,13.230902-3.872255,19.124001-2.577963,5.798381-6.177763,10.858837-10.800463,15.170817-4.536131,4.217004-9.909276,7.516686-16.130589,9.888751-6.134744,2.372065-12.845732,3.55295-20.144117,3.55295ZM78.765255,108.361896c4.176576,0,8.00528-.696636,11.464339-2.110519,3.556781-1.403577,6.667438-3.429593,9.343123-6.067741,2.665063-2.638148,4.709801-5.772238,6.134744-9.370837,1.512044-3.608905,2.262489-7.618942,2.262489-12.019291,0-4.400607-.750445-8.399823-2.262489-12.008986-1.424943-3.608905-3.469681-6.732431-6.134744-9.370579-2.577963-2.638148-5.645069-4.664422-9.20185-6.067741-3.556781-1.41414-7.429036-2.121082-11.605612-2.121082s-8.04883.706941-11.605612,2.121082c-3.459059,1.40332-6.526165,3.429593-9.20185,6.067741-2.665063,2.638148-4.753351,5.761675-6.265394,9.370579-1.424943,3.609162-2.131838,7.608379-2.131838,12.008986,0,4.315846.706895,8.31532,2.131838,12.019291,1.512044,3.598599,3.556781,6.732689,6.134744,9.370837,2.665063,2.638148,5.77572,4.664164,9.332501,6.067741,3.556781,1.413883,7.429036,2.110519,11.605612,2.110519Z"
      />
    </svg>
  );
}
