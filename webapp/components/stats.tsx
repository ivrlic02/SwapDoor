const STATS = [
  { value: "50K+", label: "Members", hint: "Verified swappers" },
  { value: "180+", label: "Countries", hint: "Homes worldwide" },
  { value: "100K+", label: "Swaps", hint: "Trips completed" },
];

export function Stats() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 rounded-2xl border border-border bg-surface p-10 text-center sm:grid-cols-3">
        {STATS.map((s) => (
          <div key={s.label}>
            <div className="text-3xl font-bold text-accent">{s.value}*</div>
            <div className="mt-1 font-semibold">{s.label}</div>
            <div className="text-sm text-muted">{s.hint}</div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-center text-xs text-muted">
        * Illustrative figures for this student project — not real platform data.
      </p>
    </section>
  );
}
