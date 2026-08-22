"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Select } from "@/components/select";
import { buttonClass } from "@/components/button";
import { TextField, TextArea, FieldShell, ItemCard } from "@/components/admin/fields";
import { saveHowItWorks } from "@/app/admin/actions";
import { TRUST_ICON_NAMES, TrustIcon } from "@/components/icons";
import {
  PANEL_LABELS,
  STEP_PANELS,
  type FaqItem,
  type HowItWorksContent,
  type HowItWorksStep,
  type StepPanel,
  type TrustCard,
} from "@/lib/cms-types";

// The How it Works editor.
//
// Note what an editor can and cannot do here, because the split is the point of
// the whole design. They own every word on the page, the order of the steps, the
// order and grouping of the FAQ, and which product panel each step shows. They
// do not own the layout, the type scale, or the panels themselves — those are
// components, and the panel field is a dropdown over a fixed list rather than a
// free-text field or an image upload.
//
// That constraint is deliberate (Lecture 2, *constraints*: the interface should
// make the wrong action impossible rather than merely discouraged). A CMS that
// lets an editor upload a screenshot per step produces a page whose illustrations
// silently rot the next time the UI changes; a CMS that lets them pick from five
// live panels cannot.

export function HowItWorksEditor({ initial }: { initial: HowItWorksContent }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [content, setContent] = useState<HowItWorksContent>(initial);

  function save() {
    setMessage(null);
    startTransition(async () => {
      const result = await saveHowItWorks(content);
      setMessage(
        result.ok
          ? { tone: "ok", text: "Saved. /how-it-works updates within a minute." }
          : { tone: "error", text: result.error },
      );
    });
  }

  // One generic list helper rather than four near-identical sets of handlers.
  function listOps<T>(key: "steps" | "trust" | "faq", make: () => T) {
    return {
      update: (i: number, next: T) =>
        setContent((c) => ({
          ...c,
          [key]: (c[key] as T[]).map((item, index) => (index === i ? next : item)),
        })),
      add: () => setContent((c) => ({ ...c, [key]: [...(c[key] as T[]), make()] })),
      move: (i: number, by: -1 | 1) =>
        setContent((c) => {
          const list = [...(c[key] as T[])];
          const target = i + by;
          if (target < 0 || target >= list.length) return c;
          [list[i], list[target]] = [list[target], list[i]];
          return { ...c, [key]: list };
        }),
      remove: (i: number) =>
        setContent((c) => ({
          ...c,
          [key]: (c[key] as T[]).filter((_, index) => index !== i),
        })),
    };
  }

  // A new step carries no key. The server derives one from the title on save
  // (see `normaliseSteps` in app/admin/actions.ts), so the anchor the sticky
  // rail links to reads `#step-browse` rather than `#step-1771…` — and the
  // editor is not the thing minting ids.
  const steps = listOps<HowItWorksStep>("steps", () => ({
    key: "",
    title: "",
    body: "",
    panel: "search",
  }));
  const trust = listOps<TrustCard>("trust", () => ({ icon: "verified", title: "", body: "" }));
  const faq = listOps<FaqItem>("faq", () => ({ group: "Money", q: "", a: "" }));

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8 flex flex-wrap items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">How it Works</h1>
          <p className="mt-1 text-sm text-muted">
            Everything on{" "}
            <Link href="/how-it-works" target="_blank" className="text-accent hover:text-brand">
              /how-it-works
            </Link>{" "}
            except the layout and the product panels.
          </p>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className={buttonClass("primary", "md", "ml-auto")}
        >
          {pending ? "Saving…" : "Save all sections"}
        </button>
      </div>

      {message && (
        <p
          role="status"
          className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
            message.tone === "ok"
              ? "border-success/40 bg-success/10 text-fg"
              : "border-danger/40 bg-danger/10 text-fg"
          }`}
        >
          {message.text}
        </p>
      )}

      <div className="space-y-12">
        {/* Intro */}
        <Section title="Intro" note="The first thing on the page.">
          <div className="space-y-4 rounded-xl border border-border bg-surface p-4">
            <TextField
              label="Eyebrow"
              value={content.intro.eyebrow}
              onChange={(eyebrow) =>
                setContent((c) => ({ ...c, intro: { ...c.intro, eyebrow } }))
              }
            />
            <TextField
              label="Headline"
              value={content.intro.title}
              onChange={(title) => setContent((c) => ({ ...c, intro: { ...c.intro, title } }))}
            />
            <TextArea
              label="Subtitle"
              rows={3}
              value={content.intro.subtitle}
              onChange={(subtitle) =>
                setContent((c) => ({ ...c, intro: { ...c.intro, subtitle } }))
              }
            />
          </div>
        </Section>

        {/* Steps */}
        <Section
          title="Steps"
          note="Each step is one section of the page, with its own product panel and its own entry in the sticky rail."
          onAdd={steps.add}
          addLabel="Add a step"
        >
          {content.steps.map((step, i) => (
            <ItemCard
              key={i}
              title={`Step ${String(i + 1).padStart(2, "0")}`}
              canUp={i > 0}
              canDown={i < content.steps.length - 1}
              onUp={() => steps.move(i, -1)}
              onDown={() => steps.move(i, 1)}
              onRemove={() => steps.remove(i)}
            >
              <TextField
                label="Title"
                value={step.title}
                onChange={(title) => steps.update(i, { ...step, title })}
              />
              <TextArea
                label="Body"
                rows={4}
                value={step.body}
                onChange={(body) => steps.update(i, { ...step, body })}
              />
              <FieldShell
                label="Product panel"
                hint="The screen shown beside this step. Live components, not screenshots."
              >
                <Select
                  value={step.panel}
                  onChange={(v) => steps.update(i, { ...step, panel: v as StepPanel })}
                  ariaLabel="Product panel"
                  options={STEP_PANELS.map((p) => ({ value: p, label: PANEL_LABELS[p] }))}
                />
              </FieldShell>
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label="Link text (optional)"
                  value={step.ctaLabel ?? ""}
                  onChange={(ctaLabel) => steps.update(i, { ...step, ctaLabel })}
                />
                <TextField
                  label="Link target"
                  value={step.ctaHref ?? ""}
                  onChange={(ctaHref) => steps.update(i, { ...step, ctaHref })}
                  placeholder="/explore"
                  mono
                />
              </div>
            </ItemCard>
          ))}
        </Section>

        {/* Trust */}
        <Section
          title="Trust cards"
          note="Three cards under the steps. Keep the claims true — this is the page a cautious member reads before their first swap."
          onAdd={trust.add}
          addLabel="Add a card"
        >
          {content.trust.map((card, i) => (
            <ItemCard
              key={i}
              title={`Card ${i + 1}`}
              canUp={i > 0}
              canDown={i < content.trust.length - 1}
              onUp={() => trust.move(i, -1)}
              onDown={() => trust.move(i, 1)}
              onRemove={() => trust.remove(i)}
            >
              <FieldShell label="Icon">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand/15 text-accent">
                    <TrustIcon name={card.icon} className="h-5 w-5" />
                  </span>
                  <div className="flex-1">
                    <Select
                      value={card.icon}
                      onChange={(icon) => trust.update(i, { ...card, icon: String(icon) })}
                      ariaLabel="Card icon"
                      options={TRUST_ICON_NAMES.map((n) => ({ value: n, label: n }))}
                    />
                  </div>
                </div>
              </FieldShell>
              <TextField
                label="Title"
                value={card.title}
                onChange={(title) => trust.update(i, { ...card, title })}
              />
              <TextArea
                label="Body"
                rows={3}
                value={card.body}
                onChange={(body) => trust.update(i, { ...card, body })}
              />
            </ItemCard>
          ))}
        </Section>

        {/* FAQ */}
        <Section
          title="FAQ"
          note="Grouped by the Group field. A new group name creates a new column heading on the page — no code change needed."
          onAdd={faq.add}
          addLabel="Add a question"
        >
          {content.faq.map((item, i) => (
            <ItemCard
              key={i}
              title={item.group || "Ungrouped"}
              canUp={i > 0}
              canDown={i < content.faq.length - 1}
              onUp={() => faq.move(i, -1)}
              onDown={() => faq.move(i, 1)}
              onRemove={() => faq.remove(i)}
            >
              <TextField
                label="Group"
                value={item.group}
                onChange={(group) => faq.update(i, { ...item, group })}
                hint="Questions sharing a group are rendered under one heading, in this order."
              />
              <TextField
                label="Question"
                value={item.q}
                onChange={(q) => faq.update(i, { ...item, q })}
              />
              <TextArea
                label="Answer"
                rows={4}
                value={item.a}
                onChange={(a) => faq.update(i, { ...item, a })}
              />
            </ItemCard>
          ))}
        </Section>
      </div>

      {/* Repeated at the bottom: the page is long enough that scrolling back to
          the only Save button is a real cost. */}
      <div className="mt-10 flex items-center gap-4 border-t border-border pt-6">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className={buttonClass("primary")}
        >
          {pending ? "Saving…" : "Save all sections"}
        </button>
        <Link href="/admin" className="text-sm text-muted transition hover:text-fg">
          Back to posts
        </Link>
      </div>
    </div>
  );
}

function Section({
  title,
  note,
  onAdd,
  addLabel,
  children,
}: {
  title: string;
  note: string;
  onAdd?: () => void;
  addLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 max-w-[60ch] text-sm text-muted">{note}</p>
      </div>
      <div className="space-y-4">{children}</div>
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="mt-4 rounded-lg border border-dashed border-border px-4 py-2 text-sm font-medium text-muted transition hover:border-brand hover:text-fg"
        >
          + {addLabel}
        </button>
      )}
    </section>
  );
}
