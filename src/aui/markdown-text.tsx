"use client";

// NOTE: the upstream registry component imports
// `@assistant-ui/react-markdown/styles/dot.css` here. We deliberately
// strip that import in this vendored copy because:
//   - the surface ships its compiled CSS as `dist/aui/aui.css`, which
//     re-imports the same dot.css upstream stylesheet via a plain
//     `@import` (see `src/aui/aui.css`). The CSS lands once on the
//     consumer page either way.
//   - keeping the JS-side `import "...dot.css"` means EVERY consumer's
//     bundler has to resolve the `@assistant-ui/react-markdown` CJS
//     entry from THIS package's node_modules at dev time, which in
//     turn pulls in a second `react` copy and triggers React 19's
//     "Invalid hook call: more than one copy of React in the same app"
//     diagnostic. Routing the stylesheet through CSS-only fixes that.
//
// Refresh-from-registry note: when re-running `npx shadcn add ...thread.json`
// keep the JS-side import out and propagate the upstream stylesheet
// reference into `src/aui/aui.css` instead.

import {
  type CodeHeaderProps,
  MarkdownTextPrimitive,
  unstable_memoizeMarkdownComponents as memoizeMarkdownComponents,
  useIsMarkdownCodeBlock,
} from "@assistant-ui/react-markdown";
import remarkGfm from "remark-gfm";
import { type FC, memo, useState } from "react";
import { CheckIcon, CopyIcon } from "lucide-react";

import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { cn } from "@/lib/utils";
import styles from "./markdown-text.module.css";

const MarkdownTextImpl = () => {
  return (
    <MarkdownTextPrimitive
      remarkPlugins={[remarkGfm]}
      className="aui-md"
      components={defaultComponents}
      defer
    />
  );
};

export const MarkdownText = memo(MarkdownTextImpl);

const CodeHeader: FC<CodeHeaderProps> = ({ language, code }) => {
  const { isCopied, copyToClipboard } = useCopyToClipboard();
  const onCopy = () => {
    if (!code || isCopied) return;
    copyToClipboard(code);
  };

  return (
    <div className={cn("aui-code-header-root", styles.codeHeaderRoot)}>
      <span className={cn("aui-code-header-language", styles.codeHeaderLanguage)}>
        {language}
      </span>
      <TooltipIconButton tooltip="Copy" onClick={onCopy}>
        {!isCopied && <CopyIcon />}
        {isCopied && <CheckIcon />}
      </TooltipIconButton>
    </div>
  );
};

const useCopyToClipboard = ({
  copiedDuration = 3000,
}: {
  copiedDuration?: number;
} = {}) => {
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const copyToClipboard = (value: string) => {
    if (!value || typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }

    navigator.clipboard.writeText(value).then(
      () => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), copiedDuration);
      },
      () => {},
    );
  };

  return { isCopied, copyToClipboard };
};

const defaultComponents = memoizeMarkdownComponents({
  h1: ({ className, ...props }) => (
    <h1 className={cn("aui-md-h1", styles.h1, className)} {...props} />
  ),
  h2: ({ className, ...props }) => (
    <h2 className={cn("aui-md-h2", styles.h2, className)} {...props} />
  ),
  h3: ({ className, ...props }) => (
    <h3 className={cn("aui-md-h3", styles.h3, className)} {...props} />
  ),
  h4: ({ className, ...props }) => (
    <h4 className={cn("aui-md-h4", styles.h4, className)} {...props} />
  ),
  h5: ({ className, ...props }) => (
    <h5 className={cn("aui-md-h5", styles.h5, className)} {...props} />
  ),
  h6: ({ className, ...props }) => (
    <h6 className={cn("aui-md-h6", styles.h6, className)} {...props} />
  ),
  p: ({ className, ...props }) => (
    <p className={cn("aui-md-p", styles.p, className)} {...props} />
  ),
  a: ({ className, ...props }) => (
    <a className={cn("aui-md-a", styles.a, className)} {...props} />
  ),
  blockquote: ({ className, ...props }) => (
    <blockquote
      className={cn("aui-md-blockquote", styles.blockquote, className)}
      {...props}
    />
  ),
  ul: ({ className, ...props }) => (
    <ul className={cn("aui-md-ul", styles.ul, className)} {...props} />
  ),
  ol: ({ className, ...props }) => (
    <ol className={cn("aui-md-ol", styles.ol, className)} {...props} />
  ),
  hr: ({ className, ...props }) => (
    <hr className={cn("aui-md-hr", styles.hr, className)} {...props} />
  ),
  table: ({ className, ...props }) => (
    <table
      className={cn("aui-md-table", styles.table, className)}
      {...props}
    />
  ),
  th: ({ className, ...props }) => (
    <th className={cn("aui-md-th", styles.th, className)} {...props} />
  ),
  td: ({ className, ...props }) => (
    <td className={cn("aui-md-td", styles.td, className)} {...props} />
  ),
  tr: ({ className, ...props }) => (
    <tr className={cn("aui-md-tr", styles.tr, className)} {...props} />
  ),
  li: ({ className, ...props }) => (
    <li className={cn("aui-md-li", styles.li, className)} {...props} />
  ),
  strong: ({ className, ...props }) => (
    <strong
      className={cn("aui-md-strong", styles.strong, className)}
      {...props}
    />
  ),
  sup: ({ className, ...props }) => (
    <sup className={cn("aui-md-sup", styles.sup, className)} {...props} />
  ),
  pre: ({ className, ...props }) => (
    <pre className={cn("aui-md-pre", styles.pre, className)} {...props} />
  ),
  code: function Code({ className, ...props }) {
    const isCodeBlock = useIsMarkdownCodeBlock();
    return (
      <code
        className={cn(
          !isCodeBlock && cn("aui-md-inline-code", styles.inlineCode),
          className,
        )}
        {...props}
      />
    );
  },
  CodeHeader,
});

