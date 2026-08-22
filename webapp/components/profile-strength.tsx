"use client";

import { useState } from "react";
import { profileStrength, type ProfileStrengthInput } from "@/lib/profile-types";

// "Profile strength" — the answer to a question the page never used to ask:
// *why* should a member bother filling any of this in, and what's left?
//
// The fields on /profile are the only thing a cautious host has to go on before
// handing over their keys (Persona 2 Sarah, Persona 3 Mateo & Elena), but the
// form gave no reading of the result — you typed into boxes and learned nothing.
// That is a Gulf of Evaluation (Lecture 3), and the fix is the same one the
// live "How hosts see you" card uses: put the outcome on screen beside the
// input. The bar reads the draft, not the saved row, so it moves as you type.
//
// Deliberately NOT a red→amber→green traffic light: the palette is
// blue-monochrome by design (Lecture 6), and a colour scale would be the only
// thing carrying the message. The percentage, the named next step and the
// checklist all say it in words; colour only marks the finished state.

export function ProfileStrength(props: ProfileStrengthInput) {
  const [open, setOpen] = useState(false);
  const { percent, items, next } = profileStrength(props);
  const complete = next === null;
  const remaining = items.filter((i) => !i.done).length;

  return (
    <section
      aria-labelledby="strength-heading"
      className="rounded-2xl border border-border bg-surface/60 p-5"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="strength-heading" className="font-semibold">
          Profile strength
        </h2>
        <p
          className={`text-sm font-semibold tabular-nums ${
            complete ? "text-success" : "text-fg"
          }`}
        >
          {complete && <span aria-hidden>✓ </span>}
          {percent}%
        </p>
      </div>

      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-labelledby="strength-heading"
        className="mt-3 h-2 overflow-hidden rounded-full bg-border"
      >
        <div
          className={`h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none ${
            complete ? "bg-success" : "bg-brand"
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {complete ? (
        <p className="mt-3 text-sm text-muted">
          Nothing left to fill in — hosts see a complete profile.
        </p>
      ) : (
        <p className="mt-3 text-sm text-muted">
          Next:{" "}
          <a
            href={`#${next.target}`}
            className="font-medium text-accent transition hover:text-brand"
          >
            {next.todo} →
          </a>
        </p>
      )}

      {/* The rest sits behind one control rather than as a seven-row list of
          mostly-ticked boxes (progressive disclosure, Hick's law). The count is
          in the label so the button is a known quantity before it's pressed. */}
      {!complete && (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="mt-3 text-sm font-medium text-muted transition hover:text-fg"
          >
            {open ? "Hide the list" : `Show all ${remaining} remaining`}
          </button>

          {open && (
            <ul className="mt-3 space-y-2 border-t border-border pt-3">
              {items.map((item) => (
                <li key={item.target} className="flex items-start gap-2.5 text-sm">
                  {/* Tick vs. empty ring — the state is a shape, not a colour. */}
                  <span
                    aria-hidden
                    className={`mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border text-[10px] leading-none ${
                      item.done
                        ? "border-success bg-success/15 text-success"
                        : "border-muted/50 text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                  {item.done ? (
                    <span className="text-muted/70 line-through">{item.todo}</span>
                  ) : (
                    <a
                      href={`#${item.target}`}
                      className="text-muted transition hover:text-fg"
                    >
                      {item.todo}
                    </a>
                  )}
                  <span className="sr-only">{item.done ? " — done" : " — still to do"}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
