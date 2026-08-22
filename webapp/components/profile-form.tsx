"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/avatar";
import { buttonClass } from "@/components/button";
import { useProfile } from "@/components/profile-context";
import { ProfileStrength } from "@/components/profile-strength";
import { createClient } from "@/lib/supabase/client";
import {
  TRAVEL_STYLES,
  TRAVEL_WITH,
  TRIP_LENGTHS,
  labelFor,
  type TravelStyle,
  type TravelWith,
  type TripLength,
} from "@/lib/profile-types";
import { mediaPath, storagePathFromUrl } from "@/lib/storage";

// The "everything you can do with your profile" page body.
//
// Three things earn their place here beyond a plain settings form:
//  1. The picture uploads the moment it's chosen, with its own status line —
//     a file picker followed by a separate "Save" is a classic place people
//     lose an upload (Nielsen #1, visibility of system status).
//  2. A live "How hosts see you" card renders the draft as you type. These
//     exact fields already drive the "Hosted by" block on every listing, so
//     without a preview you edit a bio and never learn what it looks like —
//     a Gulf of Evaluation (Lecture 3). Now the result is on screen while you
//     write it.
//  3. Everything typed is governed by ONE Save button. The form grew a second
//     section ("Travel & swap"), and a page where two Save buttons each own
//     some of the fields makes the member track which half they changed —
//     recognition over recall, the wrong way round (Nielsen #6).

const BIO_MAX = 300;
const AVATAR_MAX_BYTES = 5 * 1024 * 1024; // matches the bucket's own limit
const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/** Chips always render in TRAVEL_STYLES order, so a re-toggle can't reorder the
 *  array and make an unchanged selection look dirty. */
function orderedStyles(picked: Set<string>): TravelStyle[] {
  return TRAVEL_STYLES.filter((s) => picked.has(s.value)).map((s) => s.value);
}

export function ProfileForm() {
  const { profile, ready, refresh, patch } = useProfile();
  const supabase = useRef(createClient()).current;
  const fileRef = useRef<HTMLInputElement>(null);

  // Draft copy of the editable fields. Seeded from the loaded profile, then
  // owned by the form until saved.
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [bio, setBio] = useState("");
  const [travelWith, setTravelWith] = useState<TravelWith | null>(null);
  const [travelStyle, setTravelStyle] = useState<TravelStyle[]>([]);
  const [typicalTrip, setTypicalTrip] = useState<TripLength | null>(null);
  const [hasPets, setHasPets] = useState<boolean | null>(null);
  const [smoker, setSmoker] = useState<boolean | null>(null);
  const [seededFor, setSeededFor] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The photo's own status line, carrying its tone explicitly rather than
  // inferring "is this an error?" from the wording.
  const [photoStatus, setPhotoStatus] = useState<{
    text: string;
    tone: "info" | "error";
  } | null>(null);
  const [uploading, setUploading] = useState(false);

  // Seed the draft once the profile arrives (it loads client-side). Keyed on the
  // user's id, so it seeds exactly once per account: a later context update —
  // notably the refresh() after saving — must not overwrite what's in the boxes.
  // Done as a render-phase adjustment rather than in an effect, so the fields
  // are already filled on the render the profile appears in (no flash of empty
  // inputs, and no cascading re-render).
  if (profile && seededFor !== profile.id) {
    setSeededFor(profile.id);
    setName(profile.fullName);
    setLocation(profile.location ?? "");
    setBio(profile.bio ?? "");
    setTravelWith(profile.travelWith);
    setTravelStyle(profile.travelStyle);
    setTypicalTrip(profile.typicalTrip);
    setHasPets(profile.hasPets);
    setSmoker(profile.smoker);
  }

  // Let a "Saved" confirmation fade instead of sitting there forever.
  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 2600);
    return () => clearTimeout(t);
  }, [saved]);

  if (!ready) return <FormSkeleton />;
  if (!profile) return null; // route is gated; this is just belt-and-braces

  const dirty =
    name.trim() !== profile.fullName ||
    location.trim() !== (profile.location ?? "") ||
    bio.trim() !== (profile.bio ?? "") ||
    travelWith !== profile.travelWith ||
    travelStyle.join("|") !== profile.travelStyle.join("|") ||
    typicalTrip !== profile.typicalTrip ||
    hasPets !== profile.hasPets ||
    smoker !== profile.smoker;

  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    // Check before uploading rather than surfacing a storage error afterwards
    // (Nielsen #5, error prevention — the bucket enforces the same limits).
    if (!AVATAR_TYPES.includes(file.type)) {
      setPhotoStatus({
        text: "That file isn't an image. Use a JPG, PNG, WEBP or GIF.",
        tone: "error",
      });
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setPhotoStatus({
        text: `That image is ${(file.size / 1024 / 1024).toFixed(1)} MB. The limit is 5 MB.`,
        tone: "error",
      });
      return;
    }

    setUploading(true);
    setPhotoStatus({ text: "Uploading…", tone: "info" });

    const path = mediaPath(profile.id, file.name);

    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { cacheControl: "3600", upsert: false });

    if (upErr) {
      setUploading(false);
      setPhotoStatus({ text: `Upload failed: ${upErr.message}`, tone: "error" });
      return;
    }

    const url = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;
    const { error: dbErr } = await supabase
      .from("profiles")
      .update({ avatar_url: url })
      .eq("id", profile.id);

    if (dbErr) {
      setUploading(false);
      setPhotoStatus({ text: `Couldn't save the photo: ${dbErr.message}`, tone: "error" });
      return;
    }

    // Clean up the file this one replaces, so a user swapping their picture ten
    // times doesn't leave ten orphans in the bucket.
    await removeStoredAvatar(profile.avatarUrl);

    patch({ avatarUrl: url });
    setUploading(false);
    setPhotoStatus({ text: "Photo updated.", tone: "info" });
    if (fileRef.current) fileRef.current.value = "";
  }

  async function removeStoredAvatar(url: string | null) {
    if (!profile) return;
    const path = storagePathFromUrl(url, "avatars", profile.id);
    if (path) await supabase.storage.from("avatars").remove([path]);
  }

  async function onRemovePhoto() {
    if (!profile?.avatarUrl) return;
    setUploading(true);
    setPhotoStatus({ text: "Removing…", tone: "info" });
    const { error: dbErr } = await supabase
      .from("profiles")
      .update({ avatar_url: null })
      .eq("id", profile.id);
    if (dbErr) {
      setUploading(false);
      setPhotoStatus({ text: `Couldn't remove the photo: ${dbErr.message}`, tone: "error" });
      return;
    }
    await removeStoredAvatar(profile.avatarUrl);
    patch({ avatarUrl: null });
    setUploading(false);
    setPhotoStatus({
      text: "Photo removed — your initials are shown instead.",
      tone: "info",
    });
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setError(null);

    const trimmed = name.trim();
    if (!trimmed) {
      setError("Your name can't be empty — it's what hosts see on your swap requests.");
      return;
    }

    setSaving(true);
    const { error: dbErr } = await supabase
      .from("profiles")
      .update({
        full_name: trimmed,
        location: location.trim() || null,
        bio: bio.trim() || null,
        travel_with: travelWith,
        // An empty selection is stored as NULL rather than `{}`: both mean "not
        // answered", and one representation is easier to reason about than two.
        travel_style: travelStyle.length > 0 ? travelStyle : null,
        typical_trip: typicalTrip,
        has_pets: hasPets,
        smoker,
      })
      .eq("id", profile.id);
    setSaving(false);

    if (dbErr) {
      setError(dbErr.message);
      return;
    }
    await refresh();
    setSaved(true);
  }

  function onReset() {
    if (!profile) return;
    setName(profile.fullName);
    setLocation(profile.location ?? "");
    setBio(profile.bio ?? "");
    setTravelWith(profile.travelWith);
    setTravelStyle(profile.travelStyle);
    setTypicalTrip(profile.typicalTrip);
    setHasPets(profile.hasPets);
    setSmoker(profile.smoker);
    setError(null);
  }

  function toggleStyle(value: TravelStyle) {
    setTravelStyle((prev) => {
      const next = new Set<string>(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return orderedStyles(next);
    });
  }

  const previewName = name.trim() || profile.fullName;

  return (
    <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:gap-12">
      <div>
        {/* ---- Photo ---------------------------------------------------- */}
        <section
          id="photo"
          className="scroll-mt-24 rounded-2xl border border-border bg-surface/60 p-6"
        >
          <h2 className="font-semibold">Profile photo</h2>
          <p className="mt-1 text-sm text-muted">
            A real face is the single strongest trust signal on a swap request.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-5">
            <Avatar name={previewName} src={profile.avatarUrl} size={88} />
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className={buttonClass("secondary")}
              >
                {profile.avatarUrl ? "Change photo" : "Upload photo"}
              </button>
              {profile.avatarUrl && (
                <button
                  type="button"
                  disabled={uploading}
                  onClick={onRemovePhoto}
                  className={buttonClass("ghost")}
                >
                  Remove
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept={AVATAR_TYPES.join(",")}
                onChange={onPickPhoto}
                className="hidden"
                aria-label="Choose a profile photo"
              />
            </div>
          </div>

          {/* One status line covering upload, success and every failure —
              always in words, never only a colour (Lecture 6). */}
          <p
            role="status"
            aria-live="polite"
            className={`mt-4 min-h-5 text-sm ${
              photoStatus?.tone === "error" ? "text-danger" : "text-muted"
            }`}
          >
            {photoStatus?.text ?? "JPG, PNG, WEBP or GIF · up to 5 MB"}
          </p>
        </section>

        {/* ---- Details + travel, under one Save ------------------------- */}
        <form onSubmit={onSave}>
          <section className="mt-6 rounded-2xl border border-border bg-surface/60 p-6">
            <h2 className="font-semibold">About you</h2>
            <p className="mt-1 text-sm text-muted">
              Shown on your listings and next to any review you write.
            </p>

            <div className="mt-5 flex flex-col gap-5">
              <Field label="Full name" htmlFor="fullName">
                <input
                  id="fullName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                  required
                  className={inputClass}
                />
              </Field>

              <Field
                label="Where you live"
                htmlFor="location"
                hint="City and country — helps a host place you."
              >
                <input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Split, Croatia"
                  maxLength={80}
                  className={inputClass}
                />
              </Field>

              <Field label="Bio" htmlFor="bio">
                <textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
                  rows={4}
                  placeholder="Who you are, how you travel, how you'll treat someone's home."
                  className={`${inputClass} resize-y`}
                />
                <span className="mt-1 block text-right text-xs text-muted">
                  {bio.length} / {BIO_MAX}
                </span>
              </Field>
            </div>
          </section>

          {/* ---- Travel & swap ------------------------------------------ */}
          {/* These are the questions a host asks before handing over keys, and
              until now the answers lived nowhere — a bio had to carry all of
              them in prose, if the member thought to write them at all. Chips
              rather than free text so they're comparable between profiles and
              stay skimmable (Hick's law: recognise, don't compose). */}
          <section className="mt-6 rounded-2xl border border-border bg-surface/60 p-6">
            <h2 className="font-semibold">Travel &amp; swap</h2>
            <p className="mt-1 text-sm text-muted">
              What a host wants to know before agreeing. Every answer is
              optional — anything you skip simply isn&apos;t shown.
            </p>

            <div className="mt-6 flex flex-col gap-7">
              <ChipField
                id="travelWith"
                label="Who you usually travel with"
                hint="Tap again to unset."
              >
                {TRAVEL_WITH.map((o) => (
                  <Chip
                    key={o.value}
                    label={o.label}
                    pressed={travelWith === o.value}
                    onClick={() =>
                      setTravelWith((prev) => (prev === o.value ? null : o.value))
                    }
                  />
                ))}
              </ChipField>

              <ChipField
                id="travelStyle"
                label="What you travel for"
                hint="Pick as many as fit."
              >
                {TRAVEL_STYLES.map((o) => (
                  <Chip
                    key={o.value}
                    label={o.label}
                    pressed={travelStyle.includes(o.value)}
                    onClick={() => toggleStyle(o.value)}
                  />
                ))}
              </ChipField>

              <ChipField id="typicalTrip" label="How long you usually go for">
                {TRIP_LENGTHS.map((o) => (
                  <Chip
                    key={o.value}
                    label={o.label}
                    pressed={typicalTrip === o.value}
                    onClick={() =>
                      setTypicalTrip((prev) => (prev === o.value ? null : o.value))
                    }
                  />
                ))}
              </ChipField>

              {/* Two facts a host asks about their own home, not the trip.
                  Deliberately three-state: leaving them blank says "hasn't
                  answered", which is honest, where a default "No" would put a
                  claim in the member's mouth. */}
              <div id="household" className="scroll-mt-24">
                <p className="text-sm font-medium text-fg">Your household</p>
                {/* One question per row, its answer on the same line. Side by
                    side, two labels above four buttons read as a single row of
                    four and you have to work out which pair belongs to which
                    question — proximity failing at exactly the job it does
                    (Lecture 5). */}
                <div className="mt-3 max-w-sm divide-y divide-border rounded-xl border border-border">
                  <YesNo
                    label="Travelling with pets"
                    value={hasPets}
                    onChange={setHasPets}
                  />
                  <YesNo label="Smoker" value={smoker} onChange={setSmoker} />
                </div>
              </div>
            </div>
          </section>

          {error && (
            <p role="alert" className="mt-4 text-sm text-danger">
              {error}
            </p>
          )}

          {/* The form is long enough now that the Save button can sit a full
              screen below whatever was just typed. While there are unsaved
              changes the action row sticks to the bottom of the viewport, so
              the way out is always in reach (Nielsen #1, and Fitts: the screen
              edge is the cheapest target there is). */}
          <div
            className={`mt-6 flex flex-wrap items-center gap-3 ${
              dirty
                ? "sticky bottom-4 z-10 rounded-xl border border-border bg-surface/95 px-4 py-3 backdrop-blur"
                : ""
            }`}
          >
            <button type="submit" disabled={!dirty || saving} className={buttonClass("primary")}>
              {saving ? "Saving…" : "Save changes"}
            </button>
            {dirty && (
              <>
                <button type="button" onClick={onReset} className={buttonClass("ghost")}>
                  Discard
                </button>
                <span className="text-sm text-muted">Unsaved changes</span>
              </>
            )}
            <span role="status" aria-live="polite" className="text-sm text-success">
              {saved && "✓ Saved"}
            </span>
          </div>
        </form>
      </div>

      {/* ---- Strength + live preview ------------------------------------- */}
      <aside className="lg:sticky lg:top-24 h-fit">
        <ProfileStrength
          avatarUrl={profile.avatarUrl}
          location={location}
          bio={bio}
          travelWith={travelWith}
          travelStyle={travelStyle}
          typicalTrip={typicalTrip}
          hasPets={hasPets}
          smoker={smoker}
        />

        <h2 className="mt-8 font-semibold">How hosts see you</h2>
        <p className="mt-1 text-sm text-muted">
          The same card that appears on your listings — updating as you type.
        </p>

        <section className="mt-4 rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-center gap-4">
            <Avatar name={previewName} src={profile.avatarUrl} size={52} />
            <div className="min-w-0">
              <p className="truncate font-semibold text-fg">{previewName}</p>
              <p className="truncate text-sm text-muted">
                {[
                  location.trim() || null,
                  profile.createdAt
                    ? `Member since ${new Date(profile.createdAt).getFullYear()}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          </div>
          {bio.trim() ? (
            <p className="mt-4 text-sm leading-relaxed text-muted">{bio.trim()}</p>
          ) : (
            <p className="mt-4 text-sm italic leading-relaxed text-muted/60">
              No bio yet — hosts see an empty space here.
            </p>
          )}

          <TravelSummary
            travelWith={travelWith}
            travelStyle={travelStyle}
            typicalTrip={typicalTrip}
            hasPets={hasPets}
            smoker={smoker}
          />
        </section>
      </aside>
    </div>
  );
}

/**
 * The travel answers as a host reads them. Unanswered fields render nothing at
 * all — never "Pets: not specified", which would fill the card with the shape
 * of information without any information in it (Nielsen #8).
 */
function TravelSummary({
  travelWith,
  travelStyle,
  typicalTrip,
  hasPets,
  smoker,
}: {
  travelWith: TravelWith | null;
  travelStyle: TravelStyle[];
  typicalTrip: TripLength | null;
  hasPets: boolean | null;
  smoker: boolean | null;
}) {
  const line1 = [labelFor(TRAVEL_WITH, travelWith), labelFor(TRIP_LENGTHS, typicalTrip)]
    .filter(Boolean)
    .join(" · ");

  const styles = travelStyle
    .map((s) => labelFor(TRAVEL_STYLES, s))
    .filter(Boolean)
    .join(", ");

  const household = [
    hasPets === null ? null : hasPets ? "Travels with pets" : "No pets",
    smoker === null ? null : smoker ? "Smoker" : "Non-smoker",
  ]
    .filter(Boolean)
    .join(" · ");

  if (!line1 && !styles && !household) return null;

  return (
    <dl className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm text-muted">
      {line1 && (
        <div className="flex gap-2">
          <dt className="sr-only">Travels</dt>
          <dd>{line1}</dd>
        </div>
      )}
      {styles && (
        <div className="flex gap-2">
          <dt className="shrink-0 text-muted/70">Travels for</dt>
          <dd className="text-fg/90">{styles}</dd>
        </div>
      )}
      {household && (
        <div className="flex gap-2">
          <dt className="sr-only">Household</dt>
          <dd>{household}</dd>
        </div>
      )}
    </dl>
  );
}

const inputClass =
  "w-full scroll-mt-28 rounded-lg border border-border bg-surface px-4 py-3 text-fg outline-none transition focus:border-brand";

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="text-sm font-medium text-fg">
        {label}
      </label>
      {hint && <span className="-mt-1 text-xs text-muted">{hint}</span>}
      {children}
    </div>
  );
}

/** A labelled group of toggle chips. `role="group"` rather than a radiogroup:
 *  every one of these can be unset, which radio semantics don't allow. */
function ChipField({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div id={id} className="scroll-mt-24">
      <p className="text-sm font-medium text-fg">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      <div role="group" aria-label={label} className="mt-3 flex flex-wrap gap-2">
        {children}
      </div>
    </div>
  );
}

/** The same active look as the Explore filter pills — brand outline + soft tint
 *  + brand text, never a solid fill, so a row of chosen chips doesn't blow past
 *  the 10% accent budget (Lecture 6, 60-30-10). State is carried by the border
 *  and the label weight too, never by colour alone. */
function Chip({
  label,
  pressed,
  onClick,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={pressed}
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm transition",
        pressed
          ? "border-brand bg-brand/10 font-semibold text-brand"
          : "border-border bg-surface font-medium text-fg hover:border-muted/60",
      ].join(" ")}
    >
      {pressed && (
        <span aria-hidden className="text-xs">
          ✓
        </span>
      )}
      {label}
    </button>
  );
}

/** A three-state yes/no. Pressing the chosen answer again clears it, which is
 *  the only way back to "hasn't answered" once something is picked (#3, user
 *  control and freedom). */
function YesNo({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | null;
  onChange: (next: boolean | null) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <p className="text-sm text-muted">{label}</p>
      <div role="group" aria-label={label} className="flex shrink-0 gap-2">
        <Chip
          label="Yes"
          pressed={value === true}
          onClick={() => onChange(value === true ? null : true)}
        />
        <Chip
          label="No"
          pressed={value === false}
          onClick={() => onChange(value === false ? null : false)}
        />
      </div>
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
      <div className="flex flex-col gap-6">
        <div className="skeleton h-48 rounded-2xl" />
        <div className="skeleton h-96 rounded-2xl" />
        <div className="skeleton h-80 rounded-2xl" />
      </div>
      <div className="flex flex-col gap-8">
        <div className="skeleton h-32 rounded-2xl" />
        <div className="skeleton h-48 rounded-2xl" />
      </div>
    </div>
  );
}
