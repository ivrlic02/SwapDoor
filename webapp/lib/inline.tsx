import Link from "next/link";
import type { ReactNode } from "react";

// A deliberately tiny inline syntax for CMS body copy: **bold**, *italic*,
// `code` and [text](/path).
//
// Why not full markdown, and why not rich text: the admin editor is a plain
// <textarea>, and a plain textarea is the one editor that cannot produce a
// broken document. Anything richer (a contenteditable WYSIWYG) would let an
// editor paste styled HTML from Word and quietly break the page typography,
// which is the exact failure the block model exists to prevent.
//
// It returns React nodes, never `dangerouslySetInnerHTML` — CMS text is data,
// so it is escaped by React like any other string. A post author cannot inject
// markup even if they try.

/** Schemes a [text](target) link may use. Anything else renders as plain text.
 *  Without this, `javascript:` in a link target would be a stored-XSS vector
 *  the moment a second person gets write access to the CMS. */
function safeHref(raw: string): string | null {
  const href = raw.trim();
  if (href.startsWith("/") || href.startsWith("#")) return href;
  if (/^https?:\/\//i.test(href)) return href;
  if (/^mailto:/i.test(href)) return href;
  return null;
}

// One pass, four alternatives. Ordered so `**bold**` is tried before `*italic*`
// (otherwise the italic branch would eat the first asterisk of a bold run).
const TOKEN =
  /(\*\*[^*]+\*\*)|(\*[^*]+\*)|(`[^`]+`)|(\[[^\]]+\]\([^)\s]+\))/g;

/** Render one string of body copy with the inline syntax applied. */
export function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let key = 0;

  for (const match of text.matchAll(TOKEN)) {
    const token = match[0];
    const start = match.index ?? 0;

    if (start > last) nodes.push(text.slice(last, start));
    last = start + token.length;

    if (token.startsWith("**")) {
      nodes.push(
        <strong key={key++} className="font-semibold text-fg">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("`")) {
      nodes.push(
        <code
          key={key++}
          className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[0.9em] text-accent"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else if (token.startsWith("[")) {
      const split = token.indexOf("](");
      const label = token.slice(1, split);
      const href = safeHref(token.slice(split + 2, -1));

      if (!href) {
        nodes.push(label);
      } else if (href.startsWith("/") || href.startsWith("#")) {
        nodes.push(
          <Link
            key={key++}
            href={href}
            className="text-accent underline decoration-accent/40 underline-offset-2 transition hover:text-brand hover:decoration-brand"
          >
            {label}
          </Link>,
        );
      } else {
        nodes.push(
          <a
            key={key++}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline decoration-accent/40 underline-offset-2 transition hover:text-brand hover:decoration-brand"
          >
            {label}
          </a>,
        );
      }
    } else {
      nodes.push(
        <em key={key++} className="italic">
          {token.slice(1, -1)}
        </em>,
      );
    }
  }

  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}
