"use client";

import { useState, type ReactNode } from "react";
import { CodeIcon } from "@/components/icons";

// A code block for the blog, with a copy button and a small amount of
// highlighting — no syntax-highlighting dependency.
//
// The course brief asks the blog to carry code snippets (Overview §5). A real
// highlighter (Shiki, Prism) would add 200KB+ to a content site whose PageSpeed
// score is itself a deliverable, to colour two snippets. This tokenises
// comments, strings, numbers and a keyword list instead: it is not a parser and
// it is not trying to be, but it is enough that code reads as code, which is
// the whole point of Lecture 5 opening on "even source code has a visual design
// dimension".
//
// Colours reuse existing palette tokens rather than introducing a code theme —
// nothing here is a new hue the rest of the site does not already have.

const KEYWORDS: Record<string, string[]> = {
  sql: [
    "select", "from", "where", "and", "or", "not", "null", "create", "replace",
    "function", "returns", "language", "stable", "as", "exists", "interval",
    "now", "boolean", "is", "insert", "into", "update", "set", "delete",
    "table", "policy", "on", "using", "check", "default",
  ],
  ts: [
    "const", "let", "var", "function", "return", "if", "else", "for", "of",
    "in", "await", "async", "export", "import", "from", "type", "interface",
    "new", "class", "extends", "true", "false", "null", "undefined", "as",
    "boolean", "string", "number", "void",
  ],
};
KEYWORDS.tsx = KEYWORDS.ts;
KEYWORDS.js = KEYWORDS.ts;
KEYWORDS.postgres = KEYWORDS.sql;

/** Label shown on the block. Falls back to the raw language string. */
const LANGUAGE_LABELS: Record<string, string> = {
  sql: "SQL",
  postgres: "SQL",
  ts: "TypeScript",
  tsx: "TSX",
  js: "JavaScript",
  bash: "Shell",
};

function highlight(code: string, language: string): ReactNode {
  const keywords = new Set(KEYWORDS[language] ?? []);
  // One alternation, ordered so a comment swallows anything inside it and a
  // string swallows a keyword that happens to sit in quotes.
  const token = /(--[^\n]*|\/\/[^\n]*)|('[^']*'|"[^"]*"|`[^`]*`)|(\b\d+(?:\.\d+)?\b)|(\b[A-Za-z_][A-Za-z0-9_]*\b)/g;

  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;

  for (const m of code.matchAll(token)) {
    const start = m.index ?? 0;
    if (start > last) out.push(code.slice(last, start));
    last = start + m[0].length;

    if (m[1]) {
      out.push(<span key={key++} className="text-muted italic">{m[1]}</span>);
    } else if (m[2]) {
      out.push(<span key={key++} className="text-success">{m[2]}</span>);
    } else if (m[3]) {
      out.push(<span key={key++} className="text-selected">{m[3]}</span>);
    } else if (m[4] && keywords.has(m[4].toLowerCase())) {
      out.push(<span key={key++} className="font-semibold text-accent">{m[4]}</span>);
    } else {
      out.push(m[0]);
    }
  }
  if (last < code.length) out.push(code.slice(last));
  return out;
}

export function CodeBlock({
  code,
  language,
  caption,
}: {
  code: string;
  language: string;
  caption?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      // Reverts on its own: a button that stays "Copied!" forever stops being
      // feedback about *this* press and becomes a label.
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard denied (insecure context, or the user said no). Saying
      // nothing is better than an error the reader cannot act on — the code is
      // right there and selectable.
    }
  }

  return (
    <figure className="my-10">
      <div className="overflow-hidden rounded-2xl border border-border bg-surface-2">
        <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-2">
          <span className="flex items-center gap-2 text-xs font-semibold text-muted">
            <CodeIcon className="h-4 w-4" />
            {LANGUAGE_LABELS[language] ?? language}
          </span>
          <button
            type="button"
            onClick={copy}
            className="rounded px-2 py-1 text-xs font-semibold text-muted transition hover:bg-surface-2 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        {/* The one place on the page allowed to scroll sideways — the article
            body must never do so, so the overflow is trapped here. */}
        <pre className="overflow-x-auto p-4 text-sm leading-relaxed">
          <code className="font-mono">{highlight(code, language)}</code>
        </pre>
      </div>
      {caption && (
        <figcaption className="mt-3 text-center text-sm text-muted">{caption}</figcaption>
      )}
    </figure>
  );
}
