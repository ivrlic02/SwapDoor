"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { buttonClass } from "@/components/button";
import { Calendar, nightsBetween, todayISO } from "@/components/calendar";
import { ListingPreview } from "@/components/listing-preview";
import { MiniMap } from "@/components/mini-map";
import { Select } from "@/components/select";
import { SuggestInput, type Suggestion } from "@/components/suggest-input";
import { useProfile } from "@/components/profile-context";
import { createClient } from "@/lib/supabase/client";
import { geocode, type Coords } from "@/lib/geocode";
import { clearDraft, loadDraft, saveDraft, timeAgo } from "@/lib/listing-draft";
import { cityLabel, findCountry, searchCities, searchCountries } from "@/lib/places";
import { mediaPath, storagePathFromUrl } from "@/lib/storage";
import { AMENITIES, HOME_TYPES, type Amenity, type HomeType } from "@/lib/house-types";
import type { Destination } from "@/lib/houses";

// "List Your Home" — and, with the same component, "edit a home you already
// listed". It is the only screen where a member creates something other people
// will judge them by.
//
// Built as four steps, not one long form: Persona 3 (Mateo & Elena, low-moderate
// tech confidence) is explicitly "frustrated by complex sign-ups or too many
// buttons", and fifteen controls on one screen is exactly that. Splitting them
// is progressive disclosure (Hick's law, Lecture 3), and "Step 2 of 4" makes the
// remaining work a known quantity (Nielsen #1).
//
// The fourth step is a **review**: the exact card members will see, every detail
// with an Edit link back to where it was typed. Publishing used to be a one-way
// door, which is why the review exists; listings can now be edited afterwards
// too, so the review is a last look rather than a last chance.
//
// Everything else here exists to make sure work never disappears:
//  • the whole form autosaves to localStorage (new listings only), so a refresh
//    or a stray Back doesn't cost ten minutes (Nielsen #4);
//  • photos upload as they're picked — with a per-file status line, because a
//    handful of 10 MB files is far past the 5-second mark where Nielsen says
//    progress must be visible — and removing one is undoable for a few seconds;
//  • the city is geocoded *while it's typed*, with a small map confirming the
//    place, instead of silently at submit time where a failure meant a listing
//    that quietly never appeared on any map (a Gulf of Evaluation, Lecture 3);
//  • validation names the field that's wrong and moves focus to it, rather than
//    greying out Continue and leaving the reader to guess (Nielsen #6).

const STEPS = ["Your home", "Photos", "Dates & value", "Review"] as const;
const MAX_PHOTOS = 8;
const PHOTO_MAX_BYTES = 10 * 1024 * 1024; // matches the bucket limit
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const DESCRIPTION_MIN = 20;
const DESCRIPTION_MAX = 600;
/** How long a removed photo can be brought back before the file is deleted. */
const UNDO_MS = 8000;

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

// Which control each validation message belongs to, in the order they appear on
// screen — so "focus the first problem" really means the topmost one.
const STEP_FIELDS: string[][] = [
  ["name", "location", "country", "description"],
  ["photos"],
  ["from", "to", "value"],
  [],
];
const FIELD_IDS: Record<string, string> = {
  name: "listingName",
  location: "listingCity",
  country: "listingCountry",
  description: "listingDescription",
  photos: "photoPicker",
  from: "listingDates",
  to: "listingDates",
  value: "listingValue",
};

type Errors = Record<string, string>;

/** Everything the form needs to reopen an existing listing for editing. */
export type ListingInitial = {
  name: string;
  type: HomeType;
  location: string;
  country: string;
  /** The row's existing structured place, so an edit that doesn't touch the
   *  address writes it back unchanged instead of clearing it. */
  countryCode: string | null;
  cityId: number | null;
  /** The coordinates already on the row, so re-opening the form neither looks
   *  the place up again nor quietly moves the pin. */
  lat: number | null;
  lng: number | null;
  maxGuests: number;
  description: string;
  amenities: Amenity[];
  photos: string[];
  from: string;
  to: string;
  value: string;
};

export function ListingForm({
  destinations = [],
  initial,
  houseId,
}: {
  /** Real SwapDoor destinations, offered first in the City field. */
  destinations?: Destination[];
  /** Present when editing an existing listing. */
  initial?: ListingInitial;
  /** The row to update. Absent → this publishes a new listing. */
  houseId?: number;
}) {
  const editing = typeof houseId === "number";
  const router = useRouter();
  const { profile, ready, refresh } = useProfile();
  const supabase = useRef(createClient()).current;
  const fileRef = useRef<HTMLInputElement>(null);
  const dragFrom = useRef<number | null>(null);

  const [step, setStep] = useState(0);
  /** Furthest step reached — what the stepper allows jumping back and forth to. */
  const [maxStep, setMaxStep] = useState(0);
  /** Per step: has Continue been pressed once? Errors only appear after it has. */
  const [submitted, setSubmitted] = useState([false, false, false, false]);

  // Step 1 — the home itself
  const [name, setName] = useState("");
  const [type, setType] = useState<HomeType>("Apartment");
  const [location, setLocation] = useState("");
  const [country, setCountry] = useState("");
  // The structured half of the address. `country` / `location` stay the source
  // of truth for everything that renders (a card says "Split, Croatia", not
  // "3190261"), while these two are what get written to houses.country_code and
  // houses.city_id — so counting the homes in a country stops being a string
  // comparison against whatever spelling the host used. Both are null whenever
  // the place was typed rather than picked, which is allowed: a home in a hamlet
  // no gazetteer lists still has to be publishable.
  const [countryCode, setCountryCode] = useState<string | null>(null);
  const [cityId, setCityId] = useState<number | null>(null);
  const [maxGuests, setMaxGuests] = useState(4);
  const [description, setDescription] = useState("");
  // Amenities live here rather than beside the dates: they describe the home,
  // and the listing page itself puts "What this home offers" directly under
  // "About this home". Grouping them the same way is proximity (Lecture 5) and
  // keeps the form's order matching the page it produces.
  const [amenities, setAmenities] = useState<Amenity[]>(["Wi-Fi", "Kitchen"]);

  // Step 2 — photos
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState<{ id: string; name: string }[]>([]);
  const [uploadNote, setUploadNote] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ url: string; index: number } | null>(null);
  /** Edit mode only: files to delete *after* the change is saved (see below). */
  const [graveyard, setGraveyard] = useState<string[]>([]);

  // Step 3 — availability & value
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [value, setValue] = useState("");

  // Draft restore + saving
  const [seededFor, setSeededFor] = useState<string | null>(null);
  const [restoredAt, setRestoredAt] = useState<number | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveNote, setSaveNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  // ── Country → City ────────────────────────────────────────────────────────
  // Country is asked first and City is scoped to it. The old pair of fields was
  // two independent boxes over two hardcoded lists: picking a city filled the
  // country, but picking a country did nothing to the city list, so nothing
  // stopped anyone publishing "Kyoto, Croatia". Scoping the second field to the
  // first makes that combination unreachable rather than merely discouraged —
  // a constraint, not a warning (Lecture 2).

  /** Both loaders are memoised: SuggestInput treats a new `load` as a new source
   *  and drops the list it is showing, so an inline arrow would clear the panel
   *  on every keystroke. */
  const loadCountries = useCallback(async (query: string): Promise<Suggestion[]> => {
    const rows = await searchCountries(query, 8);
    return rows.map((c) => ({
      key: c.code,
      value: c.name,
      label: c.name,
      leading: c.emoji,
      hint: c.cityCount > 0 ? `${c.cityCount.toLocaleString()} cities` : undefined,
      extra: { code: c.code },
    }));
  }, []);

  const loadCities = useCallback(
    async (query: string): Promise<Suggestion[]> => {
      if (!countryCode) return [];
      const rows = await searchCities(countryCode, query, 8);

      // SwapDoor's own destinations lead, with their live "N homes" count —
      // the one thing GeoNames cannot tell a host: that somebody is already
      // swapping there.
      const q = query.trim().toLowerCase();
      const mine = destinations.filter(
        (d) =>
          d.country.toLowerCase() === country.trim().toLowerCase() &&
          (!q || d.city.toLowerCase().includes(q))
      );
      const seen = new Set(mine.map((d) => d.city.toLowerCase()));

      return [
        ...mine.map((d) => {
          const match = rows.find((r) => r.name.toLowerCase() === d.city.toLowerCase());
          return {
            key: `dest-${d.city}`,
            value: d.city,
            label: d.city,
            hint: `${d.count} ${d.count === 1 ? "home" : "homes"} to swap here`,
            // A destination whose name has no row in `cities` (Provence, say)
            // carries nothing extra, so it falls back to the geocoder like any
            // typed place rather than pretending to an id it hasn't got.
            extra: match
              ? { cityId: String(match.id), lat: String(match.lat), lng: String(match.lng) }
              : undefined,
          };
        }),
        ...rows
          .filter((r) => !seen.has(r.name.toLowerCase()))
          .map((r) => ({
            key: String(r.id),
            value: r.name,
            label: cityLabel(r),
            hint: r.population > 0 ? `${r.population.toLocaleString()} people` : undefined,
            extra: { cityId: String(r.id), lat: String(r.lat), lng: String(r.lng) },
          })),
      ];
    },
    [countryCode, country, destinations]
  );

  function pickCountry(name: string, code: string | null) {
    setCountry(name);
    setCountryCode(code);
    // The city belonged to the previous country, so it cannot survive the
    // change. Clearing it is the honest move — leaving "Split" under "Japan"
    // would look like a working combination.
    setLocation("");
    setCityId(null);
    setResolved(null);
  }

  function pickCity(name: string, id: number | null, coords: Coords | null) {
    setLocation(name);
    setCityId(id);
    // A picked city IS its coordinates, so the map confirms instantly and the
    // Nominatim lookup below never has to run — no 800ms wait, no rate limit,
    // and no silent failure for a place that is right there in the table.
    setResolved(
      coords && country.trim() ? { key: `${name}, ${country.trim()}`, coords } : null
    );
  }

  // Geocoding. `resolved` caches the answer for one "City, Country" string, so
  // the status can be derived during render instead of being pushed into state
  // from the effect — and so saving doesn't have to look the place up again.
  const placeKey =
    location.trim().length > 1 && country.trim().length > 1
      ? `${location.trim()}, ${country.trim()}`
      : "";
  const [resolved, setResolved] = useState<{ key: string; coords: Coords | null } | null>(null);
  const placeStatus = !placeKey
    ? "idle"
    : resolved?.key === placeKey
      ? resolved.coords
        ? "found"
        : "missing"
      : "checking";

  // Seed once we know whose form this is. Done as a render-phase adjustment
  // (the pattern profile-form.tsx already uses) so the fields are filled on the
  // same render the profile arrives in — no flash of empty boxes.
  if (profile && seededFor !== profile.id) {
    setSeededFor(profile.id);
    if (initial) {
      // Editing: every step is already complete, so all of them are reachable
      // from the start — the point of opening this form is usually to change
      // one thing on step 3.
      setName(initial.name);
      setType(initial.type);
      setLocation(initial.location);
      setCountry(initial.country);
      setCityId(initial.cityId);
      if (initial.countryCode) setCountryCode(initial.countryCode);
      // Seeding the lookup with the point the row already has does two things:
      // the map confirms the place on the first render, and — because the
      // effect below skips a place it has an answer for — an edit that never
      // touches the address makes no request and saves the same coordinates
      // back. Without this, opening the form re-ran the geocoder and silently
      // moved the pin from the gazetteer's point to whatever OpenStreetMap
      // returned for the same name.
      if (initial.lat !== null && initial.lng !== null) {
        setResolved({
          key: `${initial.location.trim()}, ${initial.country.trim()}`,
          coords: { lat: initial.lat, lng: initial.lng },
        });
      }
      // A listing published before these columns existed carries only the name
      // its host typed. Resolving it is what stops the City field opening with
      // nothing to suggest — and, since it happens off the render path, a name
      // nothing matches simply leaves the field in free-text mode.
      else void findCountry(initial.country).then((c) => c && setCountryCode(c.code));
      setMaxGuests(initial.maxGuests);
      setDescription(initial.description);
      setAmenities(initial.amenities);
      setPhotos(initial.photos);
      setFrom(initial.from);
      setTo(initial.to);
      setValue(initial.value);
      setMaxStep(STEPS.length - 1);
    } else {
      const draft = loadDraft(profile.id);
      if (draft) {
        setName(draft.name);
        setType(draft.type);
        setLocation(draft.location);
        setCountry(draft.country);
        setCityId(draft.cityId ?? null);
        if (draft.countryCode) setCountryCode(draft.countryCode);
        else void findCountry(draft.country).then((c) => c && setCountryCode(c.code));
        setMaxGuests(draft.maxGuests);
        setDescription(draft.description);
        setAmenities(draft.amenities);
        setPhotos(draft.photos);
        setFrom(draft.from);
        setTo(draft.to);
        setValue(draft.value);
        setStep(draft.step);
        setMaxStep(draft.step);
        setRestoredAt(draft.savedAt);
      }
    }
  }

  // Autosave — new listings only. An edit already has a saved home behind it;
  // stashing half-finished changes in localStorage would silently reapply them
  // the next time any listing is opened.
  useEffect(() => {
    if (editing || !profile || seededFor !== profile.id || finished) return;
    saveDraft({
      v: 1,
      userId: profile.id,
      savedAt: Date.now(),
      step,
      name,
      type,
      location,
      country,
      countryCode,
      cityId,
      maxGuests,
      description,
      amenities,
      photos,
      from,
      to,
      value,
    });
  }, [
    editing,
    profile,
    seededFor,
    finished,
    step,
    name,
    type,
    location,
    country,
    countryCode,
    cityId,
    maxGuests,
    description,
    amenities,
    photos,
    from,
    to,
    value,
  ]);

  // Look the place up 800ms after typing stops — debounced both for the user's
  // sake and for Nominatim's one-request-a-second policy.
  useEffect(() => {
    if (!placeKey || resolved?.key === placeKey) return;
    let active = true;
    const timer = setTimeout(async () => {
      const coords = await geocode(location.trim(), country.trim());
      if (active) setResolved({ key: placeKey, coords });
    }, 800);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [placeKey, resolved, location, country]);

  // A removed photo is only really deleted once the undo window closes — and
  // when editing, not even then: the live row still points at that file until
  // the change is saved, so an abandoned edit must not leave a broken image on
  // a published listing. Those go to the graveyard and are deleted on save.
  useEffect(() => {
    if (!pendingDelete || !profile) return;
    const { url } = pendingDelete;
    const userId = profile.id;
    const timer = setTimeout(async () => {
      if (editing) {
        setGraveyard((g) => [...g, url]);
      } else {
        const path = storagePathFromUrl(url, "house-photos", userId);
        if (path) await supabase.storage.from("house-photos").remove([path]);
      }
      setPendingDelete((current) => (current?.url === url ? null : current));
    }, UNDO_MS);
    return () => clearTimeout(timer);
  }, [pendingDelete, profile, supabase, editing]);

  if (!ready) return <FormSkeleton />;
  if (!profile) return null; // the route is gated; this is just belt-and-braces

  // ---- Validation ---------------------------------------------------------
  // Every rule returns the sentence the user will read next to the field it
  // belongs to. Recomputed during render, so a message disappears the moment
  // the problem is fixed rather than on the next Continue.
  function validateStep(index: number): Errors {
    const e: Errors = {};
    if (index === 0) {
      if (name.trim().length < 2) e.name = "Give your home a name — this is the card's title.";
      if (location.trim().length < 2) e.location = "Which city is it in?";
      if (country.trim().length < 2) e.country = "Which country?";
      const short = DESCRIPTION_MIN - description.trim().length;
      if (short > 0)
        e.description = `${short} more character${short === 1 ? "" : "s"} — say what makes it worth swapping into.`;
    }
    if (index === 1 && photos.length === 0)
      e.photos = "Add at least one photo — the first one becomes the cover.";
    if (index === 2) {
      if (!from) e.from = "Pick the first day your home is free.";
      else if (!to) e.to = "Now pick the last day — click a second date on the calendar.";
      if (!(Number(value) > 0))
        e.value = "Add a rough nightly value — members use it to judge a fair swap.";
    }
    return e;
  }

  const errors = submitted[step] ? validateStep(step) : {};

  function markSubmitted(index: number) {
    setSubmitted((prev) => prev.map((v, i) => (i === index ? true : v)));
  }

  /** Move focus to the first thing that needs fixing, so the fix starts there. */
  function focusFirstError(index: number, found: Errors) {
    const key = STEP_FIELDS[index].find((f) => found[f]);
    if (!key) return;
    setTimeout(() => {
      const el = document.getElementById(FIELD_IDS[key]);
      el?.focus();
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 0);
  }

  function goTo(target: number) {
    // Backwards is always free (Nielsen #4). Forwards runs the same check
    // Continue does, so the stepper can't be used to skip past a problem.
    if (target > step) {
      const found = validateStep(step);
      if (Object.keys(found).length > 0) {
        markSubmitted(step);
        focusFirstError(step, found);
        return;
      }
      setMaxStep((m) => Math.max(m, target));
    }
    setStep(target);
  }

  function next() {
    const found = validateStep(step);
    if (Object.keys(found).length > 0) {
      markSubmitted(step);
      focusFirstError(step, found);
      return;
    }
    setMaxStep((m) => Math.max(m, step + 1));
    setStep((s) => s + 1);
  }

  // ---- Photos -------------------------------------------------------------
  async function addFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (files.length === 0) return;
    setPhotoError(null);

    const room = MAX_PHOTOS - photos.length - uploading.length;
    if (room <= 0) {
      setPhotoError(`You've reached the ${MAX_PHOTOS} photo limit. Remove one to add another.`);
      return;
    }
    if (files.length > room) {
      setPhotoError(`Only ${room} more photo${room === 1 ? "" : "s"} fit — the rest were skipped.`);
    }

    // Check every file before uploading any of them, so the reasons appear at
    // once instead of one per round trip (Nielsen #5).
    const accepted: File[] = [];
    const rejected: string[] = [];
    for (const file of files.slice(0, room)) {
      if (!PHOTO_TYPES.includes(file.type)) rejected.push(`“${file.name}” isn't a JPG, PNG or WEBP`);
      else if (file.size > PHOTO_MAX_BYTES)
        rejected.push(
          `“${file.name}” is ${(file.size / 1024 / 1024).toFixed(1)} MB, over the 10 MB limit`
        );
      else accepted.push(file);
    }
    if (rejected.length > 0) setPhotoError(`${rejected.join("; ")} — skipped.`);
    if (accepted.length === 0) return;

    const queued = accepted.map((file, i) => ({
      id: `${Date.now()}-${i}-${file.name}`,
      name: file.name,
    }));
    setUploading(queued);

    for (let i = 0; i < accepted.length; i++) {
      const file = accepted[i];
      // Per-file progress: supabase-js uploads over fetch and reports no byte
      // progress, so the honest unit here is files, not a fake percentage.
      setUploadNote(`Uploading ${i + 1} of ${accepted.length} — ${file.name}`);
      const path = mediaPath(profile!.id, file.name);
      const { error: upErr } = await supabase.storage
        .from("house-photos")
        .upload(path, file, { cacheControl: "3600", upsert: false });

      if (upErr) {
        setPhotoError(`Couldn't upload “${file.name}”: ${upErr.message}`);
      } else {
        const url = supabase.storage.from("house-photos").getPublicUrl(path).data.publicUrl;
        setPhotos((prev) => [...prev, url]);
      }
      setUploading((prev) => prev.filter((u) => u.id !== queued[i].id));
    }

    setUploading([]);
    setUploadNote(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  /** Really delete files from the bucket — only ever ones in this user's own
   *  folder, which is also all the storage policy would allow. */
  async function purge(urls: string[]) {
    const paths = urls
      .map((url) => storagePathFromUrl(url, "house-photos", profile!.id))
      .filter((p): p is string => p !== null);
    if (paths.length > 0) await supabase.storage.from("house-photos").remove(paths);
  }

  function removePhoto(index: number) {
    const url = photos[index];
    // Only one undo is offered at a time — a second removal commits the first.
    if (pendingDelete) {
      if (editing) setGraveyard((g) => [...g, pendingDelete.url]);
      else void purge([pendingDelete.url]);
    }
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPendingDelete({ url, index });
  }

  function undoRemove() {
    if (!pendingDelete) return;
    const { url, index } = pendingDelete;
    setPhotos((prev) => {
      const next = [...prev];
      next.splice(Math.min(index, next.length), 0, url);
      return next;
    });
    setPendingDelete(null);
  }

  function movePhoto(index: number, to: number) {
    if (to < 0 || to >= photos.length) return;
    setPhotos((prev) => {
      const next = [...prev];
      const [moved] = next.splice(index, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  function toggleAmenity(a: Amenity) {
    setAmenities((prev) => (prev.includes(a) ? prev.filter((x) => x !== a) : [...prev, a]));
  }

  async function startOver() {
    const urls = photos.concat(pendingDelete ? [pendingDelete.url] : []);
    setName("");
    setType("Apartment");
    setLocation("");
    setCountry("");
    setMaxGuests(4);
    setDescription("");
    setAmenities(["Wi-Fi", "Kitchen"]);
    setPhotos([]);
    setPendingDelete(null);
    setFrom("");
    setTo("");
    setValue("");
    setStep(0);
    setMaxStep(0);
    setSubmitted([false, false, false, false]);
    setRestoredAt(null);
    setConfirmingReset(false);
    setError(null);
    setPhotoError(null);
    clearDraft();
    await purge(urls);
  }

  // ---- Publish / save -----------------------------------------------------
  async function submitListing() {
    if (!profile) return;

    // A jump back to step 1 could have emptied something after step 3 passed,
    // so the whole form is re-checked here and the user is taken to the problem.
    for (let i = 0; i < 3; i++) {
      const found = validateStep(i);
      if (Object.keys(found).length > 0) {
        markSubmitted(i);
        setStep(i);
        focusFirstError(i, found);
        return;
      }
    }

    setError(null);
    setSaving(true);

    // Usually already known from the live lookup on step 1 — this only runs if
    // the debounce never landed (very fast typist, or an offline moment).
    let coords = resolved?.key === placeKey ? resolved.coords : null;
    if (!coords) {
      setSaveNote("Finding your home on the map…");
      coords = await geocode(location.trim(), country.trim());
    }

    const fields = {
      name: name.trim(),
      location: location.trim(),
      country: country.trim(),
      description: description.trim(),
      type,
      amenities,
      max_guests: maxGuests,
      price_per_night: Number(value),
      date: from,
      available_to: to,
      image: photos[0],
      images: photos,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      // Null whenever the place was typed rather than picked. A wrong link is
      // worse than no link: a home filed under the wrong country would be found
      // by people who cannot travel to it.
      country_code: countryCode,
      city_id: cityId,
    };

    if (editing) {
      setSaveNote("Saving your changes…");
      // Only the fields this form owns. Rating, review count and the verified
      // flag belong to the listing's history, not to an edit of it.
      const { error: dbErr } = await supabase.from("houses").update(fields).eq("id", houseId);

      if (dbErr) {
        setSaving(false);
        setSaveNote("");
        setError(dbErr.message);
        return;
      }

      setFinished(true);
      // Safe now: the row no longer points at any of these.
      await purge([...graveyard, ...(pendingDelete ? [pendingDelete.url] : [])]);
      setSaveNote("Opening your listing…");
      router.push(`/explore/${houseId}?updated=1`);
      return;
    }

    setSaveNote("Publishing your listing…");
    const { data, error: dbErr } = await supabase
      .from("houses")
      .insert({
        ...fields,
        host_id: profile.id,
        // A brand-new listing has no stays behind it, so rating stays 0 and the
        // card shows "New" rather than a score nobody earned.
        //
        // `verified` is NULL, not false. Since 2026-08-22 the badge belongs to
        // the host and every home they offer inherits it, and NULL is what
        // "ask the host" looks like in that column. Writing `false` here — as
        // this did — would have pinned a listing to unverified permanently, no
        // matter how good a record its owner built up.
        rating: 0,
        review_count: 0,
        verified: null,
      })
      .select("id")
      .single();

    if (dbErr || !data) {
      setSaving(false);
      setSaveNote("");
      setError(dbErr?.message ?? "Something went wrong publishing your listing.");
      return;
    }

    // Published: the draft has served its purpose, and any photo still waiting
    // in the undo window is now genuinely unwanted.
    setFinished(true);
    clearDraft();
    if (pendingDelete) await purge([pendingDelete.url]);

    setSaveNote("Opening your listing…");
    await refresh(); // so the nav menu's "My listings" count is right immediately
    router.push(`/explore/${data.id}?published=1`);
  }

  // The same card three times over (the sticky rail, the review step, and the
  // small-screen block under the fields) — built once so the three can never
  // drift into showing different things.
  const preview = (
    <ListingPreview
      name={name}
      location={location}
      country={country}
      type={type}
      maxGuests={maxGuests}
      value={value}
      photo={photos[0] ?? null}
      photoCount={photos.length}
      hostName={profile.fullName}
      hostAvatar={profile.avatarUrl}
    />
  );

  // ---- Derived ------------------------------------------------------------
  const shortBy = DESCRIPTION_MIN - description.trim().length;
  const today = todayISO();
  const nights = from && to ? nightsBetween(from, to) : 0;


  return (
    // A fixed 380px rail rather than a 1fr share: at 1.5fr/1fr the preview
    // stretched with the viewport, so the card that is supposed to show members
    // exactly what they will see was a different width on every screen — and the
    // form column shrank on the narrow ones where it could least afford to. The
    // form now takes whatever is left (minmax(0,…) so a long word cannot push
    // the grid wider than the page).
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-12">
      <div>
        {/* ---- Progress ------------------------------------------------- */}
        <div aria-hidden className="mb-5 h-1.5 w-full overflow-hidden rounded-full bg-border/60">
          <div
            className="h-full rounded-full bg-brand transition-all duration-300 motion-reduce:transition-none"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        <Stepper step={step} maxStep={maxStep} onGo={goTo} />

        {/* ---- Restored draft ------------------------------------------- */}
        {restoredAt !== null && (
          <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm">
            {confirmingReset ? (
              <>
                <span className="text-muted">
                  Delete this draft{photos.length > 0 ? " and its uploaded photos" : ""}?
                </span>
                <button
                  type="button"
                  onClick={startOver}
                  className={`${buttonClass("secondary", "sm")} border-danger text-danger hover:bg-danger/10`}
                >
                  Yes, start over
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmingReset(false)}
                  className={buttonClass("ghost", "sm")}
                >
                  Keep it
                </button>
              </>
            ) : (
              <>
                <span className="text-muted">
                  Picked up where you left off — draft saved {timeAgo(restoredAt)}.
                </span>
                <button
                  type="button"
                  onClick={() => setConfirmingReset(true)}
                  className={buttonClass("ghost", "sm")}
                >
                  Start over
                </button>
                <button
                  type="button"
                  onClick={() => setRestoredAt(null)}
                  aria-label="Dismiss"
                  className="ml-auto grid size-7 place-items-center rounded-full text-muted transition hover:bg-surface hover:text-fg"
                >
                  ✕
                </button>
              </>
            )}
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-border bg-surface/60 p-6 md:p-8">
          {/* ---- Step 1: the home --------------------------------------- */}
          {step === 0 && (
            <div className="flex flex-col gap-8">
              <Group title="The basics">
                <Field label="What do you call it?" htmlFor="listingName" error={errors.name}>
                  <input
                    id="listingName"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Sunny flat above the old town"
                    maxLength={80}
                    className={inputClass(errors.name)}
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={errors.name ? "listingName-error" : undefined}
                  />
                </Field>

                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Type of home" htmlFor="listingType">
                    <Select
                      id="listingType"
                      value={type}
                      onChange={setType}
                      ariaLabel="Type of home"
                      options={HOME_TYPES.map((t) => ({ value: t, label: t }))}
                    />
                  </Field>

                  {/* A <label for> can only point at a form control, so the
                      +/− stepper is a labelled group with an <output> instead
                      of a <span> the label pretended to name. */}
                  <div role="group" aria-labelledby="guestsLabel" className="flex flex-col gap-2">
                    <span id="guestsLabel" className="text-sm font-medium text-fg">
                      How many guests can stay?
                    </span>
                    <div className="flex items-center gap-3">
                      <RoundButton
                        label="Fewer guests"
                        onClick={() => setMaxGuests((g) => Math.max(1, g - 1))}
                        disabled={maxGuests <= 1}
                      >
                        −
                      </RoundButton>
                      <output className="w-12 text-center text-lg font-semibold tabular-nums">
                        {maxGuests}
                      </output>
                      <RoundButton
                        label="More guests"
                        onClick={() => setMaxGuests((g) => Math.min(20, g + 1))}
                        disabled={maxGuests >= 20}
                      >
                        +
                      </RoundButton>
                    </div>
                  </div>
                </div>
              </Group>

              <Group title="Where it is">
                <div className="grid gap-5 sm:grid-cols-2">
                  {/* Country leads, because it is what narrows the city list.
                      Every ISO country is offered and searchable — including by
                      the name people actually type, so "usa", "holland" and
                      "hrvatska" all land on the right row. */}
                  <Field
                    label="Country"
                    htmlFor="listingCountry"
                    hint="Search any country."
                    error={errors.country}
                  >
                    <SuggestInput
                      id="listingCountry"
                      value={country}
                      onChange={(next) => {
                        // Typed rather than picked: we no longer know which
                        // country this is, so the code has to go with it.
                        setCountry(next);
                        setCountryCode(null);
                        setCityId(null);
                      }}
                      onPick={(sug) => pickCountry(sug.value, sug.extra?.code ?? null)}
                      load={loadCountries}
                      placeholder="Croatia"
                      maxLength={60}
                      invalid={Boolean(errors.country)}
                      describedBy={errors.country ? "listingCountry-error" : undefined}
                      className={`${inputClass(errors.country)} pr-10`}
                    />
                  </Field>

                  <Field
                    label="City"
                    htmlFor="listingCity"
                    hint={
                      !country.trim()
                        ? "Choose a country first."
                        : countryCode
                          ? `Cities in ${country.trim()} — or type your own.`
                          : "Type the city — we do not know this country."
                    }
                    error={errors.location}
                  >
                    <SuggestInput
                      id="listingCity"
                      value={location}
                      onChange={(next) => {
                        setLocation(next);
                        setCityId(null);
                      }}
                      onPick={(sug) =>
                        pickCity(
                          sug.value,
                          sug.extra?.cityId ? Number(sug.extra.cityId) : null,
                          sug.extra?.lat && sug.extra?.lng
                            ? { lat: Number(sug.extra.lat), lng: Number(sug.extra.lng) }
                            : null
                        )
                      }
                      // No country yet means no list to scope — the field still
                      // takes free text, it just has nothing to suggest.
                      load={countryCode ? loadCities : undefined}
                      disabled={!country.trim()}
                      emptyHint="Not on the list — you can still type it in."
                      placeholder="Split"
                      maxLength={60}
                      invalid={Boolean(errors.location)}
                      describedBy={errors.location ? "listingCity-error" : undefined}
                      className={`${inputClass(errors.location)} pr-10`}
                    />
                  </Field>
                </div>

                {/* The place is confirmed here, while it can still be corrected
                    — not silently at submit time, where a failed lookup meant a
                    listing that never appeared on any map and nobody was told. */}
                {placeKey && (
                  <div className="rounded-xl border border-border bg-surface-2 p-4">
                    <p
                      role="status"
                      aria-live="polite"
                      className={`text-sm ${placeStatus === "missing" ? "text-danger" : "text-muted"}`}
                    >
                      {placeStatus === "checking" && `Looking up ${placeKey}…`}
                      {placeStatus === "found" && (
                        <>
                          <span aria-hidden className="text-success">
                            ✓{" "}
                          </span>
                          Found <span className="font-medium text-fg">{placeKey}</span> — this is the
                          area members will see.
                        </>
                      )}
                      {placeStatus === "missing" && (
                        <>
                          <span aria-hidden>⚠ </span>
                          We couldn&apos;t find “{placeKey}” on the map. Check the spelling — you can
                          still publish, but your home won&apos;t show up on the maps.
                        </>
                      )}
                    </p>
                    {placeStatus === "found" && resolved?.coords && (
                      <div className="mt-3">
                        <MiniMap
                          lat={resolved.coords.lat}
                          lng={resolved.coords.lng}
                          label={`${name.trim() || "Your home"} — approximate area`}
                        />
                        <p className="mt-2 text-xs text-muted">
                          Listings show a neighbourhood circle, never your exact address.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </Group>

              <Group title="About the home">
                <Field
                  label="Describe it"
                  htmlFor="listingDescription"
                  hint="Rooms, the neighbourhood, what you'd tell a friend who's staying."
                  error={errors.description}
                >
                  <textarea
                    id="listingDescription"
                    value={description}
                    onChange={(e) => setDescription(e.target.value.slice(0, DESCRIPTION_MAX))}
                    rows={5}
                    placeholder="Two bedrooms, a big kitchen and a terrace over the harbour. Ten minutes on foot to the beach."
                    className={`${inputClass(errors.description)} resize-y`}
                    aria-invalid={Boolean(errors.description)}
                    aria-describedby={errors.description ? "listingDescription-error" : undefined}
                  />
                  <span className="mt-1 block text-right text-xs text-muted">
                    {shortBy > 0
                      ? `${shortBy} more character${shortBy === 1 ? "" : "s"} needed`
                      : `${description.length} / ${DESCRIPTION_MAX}`}
                  </span>
                </Field>

                <fieldset>
                  <legend className="text-sm font-medium text-fg">What does it offer?</legend>
                  <p className="mt-1 text-xs text-muted">
                    These are the filters members search by, so only tick what you really have.
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {AMENITIES.map((a) => {
                      const on = amenities.includes(a);
                      return (
                        <label
                          key={a}
                          className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition ${
                            on
                              ? "border-brand bg-brand/10 text-fg"
                              : "border-border text-muted hover:border-muted/50"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() => toggleAmenity(a)}
                            className="accent-[var(--color-brand)]"
                          />
                          {a}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              </Group>
            </div>
          )}

          {/* ---- Step 2: photos ----------------------------------------- */}
          {step === 1 && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-xl font-semibold">Add photos</h2>
                <p className="mt-1 text-sm text-muted">
                  Misrepresented listings are the #1 fear members report. Show every room
                  you&apos;re offering, not just the best one.
                </p>
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  void addFiles(e.dataTransfer.files);
                }}
                className={`rounded-2xl border-2 border-dashed px-6 py-8 text-center transition ${
                  dragOver ? "border-brand bg-brand/5" : "border-border"
                }`}
              >
                <button
                  id="photoPicker"
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading.length > 0 || photos.length >= MAX_PHOTOS}
                  className={buttonClass("secondary")}
                  aria-describedby={errors.photos ? "photoPicker-error" : undefined}
                >
                  {uploading.length > 0 ? "Uploading…" : "Choose photos"}
                </button>
                <p className="mt-3 text-sm text-muted">
                  or drag them here · {photos.length} of {MAX_PHOTOS} added
                </p>
                <p className="mt-1 text-xs text-muted">JPG, PNG or WEBP, up to 10 MB each</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept={PHOTO_TYPES.join(",")}
                  multiple
                  onChange={(e) => void addFiles(e.target.files ?? [])}
                  className="hidden"
                  aria-label="Choose photos of your home"
                />
              </div>

              {errors.photos && (
                <p id="photoPicker-error" role="alert" className="text-sm text-danger">
                  <span aria-hidden>⚠ </span>
                  {errors.photos}
                </p>
              )}
              {photoError && (
                <p role="alert" className="text-sm text-danger">
                  <span aria-hidden>⚠ </span>
                  {photoError}
                </p>
              )}
              <p role="status" aria-live="polite" className="min-h-5 text-sm text-muted">
                {uploadNote}
              </p>

              {photos.length > 0 || uploading.length > 0 ? (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {photos.map((url, i) => (
                    <li
                      key={url}
                      draggable
                      onDragStart={() => {
                        dragFrom.current = i;
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => {
                        if (dragFrom.current !== null) movePhoto(dragFrom.current, i);
                        dragFrom.current = null;
                      }}
                      className="overflow-hidden rounded-xl border border-border bg-surface"
                    >
                      <div className="relative aspect-[4/3]">
                        <Image
                          src={url}
                          alt={i === 0 ? "Cover photo" : `Photo ${i + 1}`}
                          fill
                          sizes="(max-width: 640px) 50vw, 220px"
                          className="object-cover"
                        />
                        {i === 0 && (
                          <span className="absolute left-2 top-2 rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                            Cover
                          </span>
                        )}
                      </div>

                      {/* Always visible, never hover-only: on a phone there is
                          no hover, so hidden controls are simply missing
                          controls (visibility, Lecture 2). */}
                      <div className="flex items-center justify-between gap-1 p-1.5">
                        <span className="flex gap-1">
                          <TileButton
                            label={`Move photo ${i + 1} earlier`}
                            disabled={i === 0}
                            onClick={() => movePhoto(i, i - 1)}
                          >
                            ←
                          </TileButton>
                          <TileButton
                            label={`Move photo ${i + 1} later`}
                            disabled={i === photos.length - 1}
                            onClick={() => movePhoto(i, i + 1)}
                          >
                            →
                          </TileButton>
                        </span>
                        <span className="flex gap-1">
                          {i !== 0 && (
                            <TileButton
                              label={`Make photo ${i + 1} the cover`}
                              onClick={() => movePhoto(i, 0)}
                            >
                              ★
                            </TileButton>
                          )}
                          <TileButton label={`Remove photo ${i + 1}`} onClick={() => removePhoto(i)}>
                            ✕
                          </TileButton>
                        </span>
                      </div>
                    </li>
                  ))}

                  {uploading.map((u) => (
                    <li key={u.id} className="overflow-hidden rounded-xl border border-border">
                      <div className="skeleton aspect-[4/3]" />
                      <p className="truncate p-2 text-xs text-muted">{u.name}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-muted">
                  No photos yet. The first one becomes the cover — drag a tile, or use ← →, to
                  change the order.
                </p>
              )}

              {pendingDelete && (
                <p
                  role="status"
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-muted"
                >
                  Photo removed.
                  <button
                    type="button"
                    onClick={undoRemove}
                    className={buttonClass("secondary", "sm")}
                  >
                    Undo
                  </button>
                  <span className="text-xs">
                    {editing
                      ? "Removed from the listing when you save."
                      : "Deleted for good in a few seconds."}
                  </span>
                </p>
              )}
            </div>
          )}

          {/* ---- Step 3: dates & value ---------------------------------- */}
          {step === 2 && (
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-xl font-semibold">When is it free, and what&apos;s it worth?</h2>
                <p className="mt-1 text-sm text-muted">
                  Members filter by these dates, so only offer a window you can really host.
                </p>
              </div>

              {/* The same calendar as the search bar's "When" — a host who has
                  searched for a stay already knows how this works, and there is
                  only one date picker on the site (Nielsen #2). */}
              <div id="listingDates" tabIndex={-1} className="flex flex-col gap-2 outline-none">
                <span className="text-sm font-medium text-fg">Available dates</span>
                <div className="rounded-2xl border border-border bg-surface p-3 sm:max-w-sm">
                  <div className="flex items-center justify-between px-1 pb-2">
                    <span className="text-sm font-semibold text-fg">
                      {from && to
                        ? `${nights} night${nights === 1 ? "" : "s"}`
                        : from
                          ? "Select the last day"
                          : "Select the first day"}
                    </span>
                    {(from || to) && (
                      <button
                        type="button"
                        onClick={() => {
                          setFrom("");
                          setTo("");
                        }}
                        className="text-xs font-medium text-accent transition hover:text-brand"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <Calendar
                    checkIn={from}
                    checkOut={to}
                    min={today}
                    onSelect={(start, end) => {
                      setFrom(start);
                      setTo(end);
                    }}
                  />
                </div>

                <p className="text-sm text-muted">
                  {from && to
                    ? `Open from ${fmtDate(from)} to ${fmtDate(to)}.`
                    : "Click the first day your home is free, then the last."}
                </p>

                {(errors.from || errors.to) && (
                  <p role="alert" className="text-sm text-danger">
                    <span aria-hidden>⚠ </span>
                    {errors.from || errors.to}
                  </p>
                )}
              </div>

              <Field
                label="Est. value / night"
                htmlFor="listingValue"
                hint="A reference figure only — SwapDoor is a swap, so no money changes hands. It helps members judge a fair exchange."
                error={errors.value}
              >
                <div className="relative sm:max-w-[12rem]">
                  <span
                    aria-hidden
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
                  >
                    $
                  </span>
                  <input
                    id="listingValue"
                    // A plain numeric text field, not type="number": the spinner
                    // arrows invite ±1 nudging of a figure nobody tunes one
                    // dollar at a time, and they hijack the scroll wheel.
                    type="text"
                    inputMode="numeric"
                    autoComplete="off"
                    value={value}
                    onChange={(e) => setValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="120"
                    className={`${inputClass(errors.value)} pl-8`}
                    aria-invalid={Boolean(errors.value)}
                    aria-describedby={errors.value ? "listingValue-error" : undefined}
                  />
                </div>
              </Field>
            </div>
          )}

          {/* ---- Step 4: review ----------------------------------------- */}
          {step === 3 && (
            <div className="flex flex-col gap-6">
              <div>
                <h2 className="text-xl font-semibold">
                  {editing ? "Check your changes" : "Check it before it goes live"}
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {editing
                    ? "Saving updates the listing for everyone straight away."
                    : "This is exactly what members will see. You can edit or unlist your home at any time from My listings."}
                </p>
              </div>

              {/* On desktop the same card is already sticky in the right-hand
                  column; on a phone it belongs at the top of the review. */}
              <div className="lg:hidden">{preview}</div>

              <dl className="divide-y divide-border rounded-xl border border-border">
                <SummaryRow label="Name" onEdit={() => setStep(0)}>
                  {name.trim()}
                </SummaryRow>
                <SummaryRow label="Home" onEdit={() => setStep(0)}>
                  {type} · up to {maxGuests} guest{maxGuests === 1 ? "" : "s"}
                </SummaryRow>
                <SummaryRow label="Where" onEdit={() => setStep(0)}>
                  {location.trim()}, {country.trim()}{" "}
                  <span
                    className={`text-sm ${placeStatus === "found" ? "text-muted" : "text-danger"}`}
                  >
                    {placeStatus === "found" && "· shown on the map"}
                    {placeStatus === "missing" && "· not found — it won't appear on the maps"}
                    {placeStatus === "checking" && "· still checking the map…"}
                  </span>
                </SummaryRow>
                <SummaryRow label="Description" onEdit={() => setStep(0)}>
                  <span className="line-clamp-3 block text-muted">{description.trim()}</span>
                </SummaryRow>
                <SummaryRow label="Offers" onEdit={() => setStep(0)}>
                  {amenities.length > 0 ? (
                    amenities.join(" · ")
                  ) : (
                    <span className="text-muted">
                      Nothing ticked — members filtering by amenities won&apos;t find it.
                    </span>
                  )}
                </SummaryRow>
                <SummaryRow label="Photos" onEdit={() => setStep(1)}>
                  <span className="flex flex-wrap items-center gap-2">
                    {photos.slice(0, 4).map((url, i) => (
                      <span
                        key={url}
                        className="relative size-12 overflow-hidden rounded-md border border-border"
                      >
                        <Image src={url} alt="" fill sizes="48px" className="object-cover" />
                        {i === 0 && (
                          <span className="absolute inset-x-0 bottom-0 bg-brand text-center text-[9px] font-semibold uppercase text-white">
                            Cover
                          </span>
                        )}
                      </span>
                    ))}
                    <span className="text-sm text-muted">
                      {photos.length} photo{photos.length === 1 ? "" : "s"}
                    </span>
                  </span>
                </SummaryRow>
                <SummaryRow label="Available" onEdit={() => setStep(2)}>
                  {from && to ? `${fmtDate(from)} – ${fmtDate(to)}` : "—"}
                </SummaryRow>
                <SummaryRow label="Est. value" onEdit={() => setStep(2)}>
                  ${Number(value).toLocaleString()} / night
                </SummaryRow>
              </dl>
            </div>
          )}

          {error && (
            <p role="alert" className="mt-6 text-sm text-danger">
              <span aria-hidden>⚠ </span>
              {error}
            </p>
          )}
        </div>

        {/* Below lg there is no right-hand rail, so without this the preview
            would appear for the first time on the review step and the host
            would have built the whole listing blind. It follows the fields on
            exactly the steps the rail covers on a wider screen. */}
        {step < STEPS.length - 1 && (
          <details className="group mt-6 rounded-xl border border-border bg-surface/60 lg:hidden">
            {/* Open on a wide screen, closed on a phone — and closed is the
                honest state. On the rail this is a *live* preview: the host
                types on the left and watches the card change on the right. A
                phone has one column, so the same card lands below every field
                on the step, where it cannot be watched while typing and mostly
                costs ~300px of scroll between the last field and the Continue
                button. As a disclosure it stays one tap away for anyone who
                wants to check (progressive disclosure, Lecture 3), and the
                review step still shows it open and unprompted, which is the
                moment it actually decides something. */}
            <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-3 px-4 font-semibold marker:content-none">
              How members will see it
              <span
                aria-hidden
                className="shrink-0 text-lg leading-none text-accent transition group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <div className="border-t border-border px-4 pb-4 pt-4">
              <p className="mb-3 text-sm text-muted">The Explore card, updating as you type.</p>
              {preview}
            </div>
          </details>
        )}

        {/* ---- Actions ---------------------------------------------------
            Fixed to the bottom of the phone screen, in normal flow from lg up.
            On a long step the primary action used to sit under a full screen of
            scroll; the same problem the listing page solved with its mobile
            swap bar (Fitts: the action should be where the thumb already is). */}
        <div className="fixed inset-x-0 bottom-0 z-30 flex flex-wrap items-center gap-3 border-t border-border bg-surface/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:px-6 lg:static lg:mt-8 lg:bg-transparent lg:px-0 lg:pb-0 lg:pt-6 lg:backdrop-blur-none">
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              disabled={saving}
              className={buttonClass("ghost")}
            >
              ← Back
            </button>
          )}

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-muted sm:inline">
              Step {step + 1} of {STEPS.length}
            </span>
            {step < STEPS.length - 1 ? (
              // Deliberately NOT disabled: a greyed-out button says "no" without
              // saying why. Pressing it names the missing field and jumps to it.
              <button type="button" onClick={next} className={buttonClass("primary")}>
                {step === STEPS.length - 2 ? "Review" : "Continue"}
              </button>
            ) : (
              <button
                type="button"
                onClick={submitListing}
                disabled={saving}
                className={buttonClass("primary")}
              >
                {saving
                  ? saveNote || "Saving…"
                  : editing
                    ? "Save changes"
                    : "Publish listing"}
              </button>
            )}
          </div>
        </div>
        {/* Clearance so the fixed bar never covers the last row on a phone. */}
        <div aria-hidden className="h-24 lg:hidden" />
      </div>

      {/* ---- Live preview + reassurance ---------------------------------- */}
      <aside className="hidden h-fit lg:sticky lg:top-24 lg:block">
        <h2 className="font-semibold">How members will see it</h2>
        <p className="mt-1 text-sm text-muted">The Explore card, updating as you type.</p>

        <div className="mt-4">{preview}</div>

        <ul className="mt-6 flex flex-col gap-3 text-sm text-muted">
          {[
            "Your exact address is never shown — listings display an approximate area.",
            "You can edit or unlist your home at any time from My listings.",
            "No money changes hands. The value is only a reference for a fair swap.",
          ].map((line) => (
            <li key={line} className="flex gap-2">
              <span aria-hidden className="text-success">
                ✓
              </span>
              {line}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

// ---- Small pieces ---------------------------------------------------------

// The step row doubles as the way back into a finished step, so it has to *look*
// like a control: pill, border, hover, and a pencil on every step you can open.
// Flat text with a number next to it reads as a progress indicator — a label,
// not a button — which is exactly the flat-UI ambiguity Nielsen #2 warns about,
// and the one-line hint underneath is the signifier for the rest (Lecture 2).
function Stepper({
  step,
  maxStep,
  onGo,
}: {
  step: number;
  maxStep: number;
  onGo: (i: number) => void;
}) {
  return (
    <div>
      <ol className="flex flex-wrap items-center gap-2">
        {STEPS.map((label, i) => {
          const current = i === step;
          const done = !current && i < maxStep;
          const reachable = i <= maxStep;
          return (
            <li key={label} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onGo(i)}
                disabled={!reachable || current}
                aria-current={current ? "step" : undefined}
                title={reachable && !current ? `Go back to “${label}”` : undefined}
                className={[
                  "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition",
                  current
                    ? "border-brand bg-brand/15 font-semibold text-fg"
                    : reachable
                      ? "cursor-pointer border-border bg-surface text-fg shadow-sm hover:-translate-y-px hover:border-brand hover:text-accent"
                      : "cursor-not-allowed border-dashed border-border text-muted",
                ].join(" ")}
              >
                {/* Number + tick + weight carry the state, never colour alone. */}
                <span
                  className={`grid size-6 place-items-center rounded-full text-xs font-semibold ${
                    current
                      ? "bg-brand text-white"
                      : done
                        ? "bg-brand/15 text-accent"
                        : "border border-border text-muted"
                  }`}
                >
                  {done ? "✓" : i + 1}
                </span>
                {label}
                {reachable && !current && <PencilIcon />}
              </button>
              {i < STEPS.length - 1 && (
                <span aria-hidden className="hidden h-px w-5 bg-border sm:block" />
              )}
            </li>
          );
        })}
      </ol>
      {maxStep > 0 && (
        <p className="mt-2 text-xs text-muted">
          Click any step above to go back and change it — nothing is lost.
        </p>
      )}
    </div>
  );
}

function PencilIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className="shrink-0 opacity-70"
    >
      <path
        d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** A labelled block of related fields — Hick's law's "group them" answer, so a
 *  long step reads as three small decisions instead of one wall of controls. */
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-5">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-accent">{title}</h2>
      {children}
    </section>
  );
}

function SummaryRow({
  label,
  onEdit,
  children,
}: {
  label: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start gap-x-4 gap-y-1 px-4 py-3">
      <dt className="w-24 shrink-0 pt-0.5 text-sm text-muted">{label}</dt>
      <dd className="min-w-0 flex-1 text-sm text-fg">{children}</dd>
      <button type="button" onClick={onEdit} className={buttonClass("ghost", "sm")}>
        Edit
      </button>
    </div>
  );
}

// The +/− control for the guest count. A 40px circle is a comfortable target
// (Fitts' law) for every persona, including the low-tech Empty Nesters.
function RoundButton({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="grid size-10 place-items-center rounded-full border border-border text-lg text-fg transition hover:border-brand disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function TileButton({
  children,
  label,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="grid size-8 place-items-center rounded-md text-sm text-muted transition hover:bg-surface-2 hover:text-fg disabled:opacity-30 disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

const inputClass = (error?: string) =>
  `w-full rounded-lg border bg-surface px-4 py-3 text-fg outline-none transition ${
    error ? "border-danger focus:border-danger" : "border-border focus:border-brand"
  }`;

function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="text-sm font-medium text-fg">
        {label}
      </label>
      {hint && <span className="-mt-1 text-xs text-muted">{hint}</span>}
      {children}
      {error && (
        <p id={`${htmlFor}-error`} role="alert" className="text-sm text-danger">
          <span aria-hidden>⚠ </span>
          {error}
        </p>
      )}
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex flex-col gap-6">
        <div className="skeleton h-1.5 rounded-full" />
        <div className="skeleton h-6 w-2/3 rounded-md" />
        <div className="skeleton h-96 rounded-2xl" />
      </div>
      <div className="skeleton h-80 rounded-2xl" />
    </div>
  );
}
