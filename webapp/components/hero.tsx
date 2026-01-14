"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function Hero() {
  const router = useRouter();

  const [where, setWhere] = useState("");
  const [when, setWhen] = useState("");
  const [who, setWho] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.push("/explore");
  }

  return (
    <section className="relative min-h-[90vh] flex items-center justify-center px-6 text-center">
      <div className="max-w-4xl w-full">
        <p className="text-blue-500 mb-3 font-semibold">
          Swap Homes. Travel Better.
        </p>

        <h1 className="text-4xl md:text-6xl font-extrabold leading-tight">
          Trade homes with verified travelers worldwide
        </h1>

        <p className="text-gray-400 mt-6">
          Experience authentic living without accommodation costs.
        </p>

        {/* SEARCH BAR (UI only -> navigates to /explore) */}
        <form
          onSubmit={onSubmit}
          className="mt-10 grid grid-cols-1 md:grid-cols-4 gap-4 bg-[#1a1d23] p-4 rounded-xl"
        >
          <input
            value={where}
            onChange={(e) => setWhere(e.target.value)}
            className="bg-transparent border border-gray-700 rounded-lg px-4 py-3 outline-none"
            placeholder="Where"
          />

          <input
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            className="bg-transparent border border-gray-700 rounded-lg px-4 py-3 outline-none"
            placeholder="When"
          />

          <input
            value={who}
            onChange={(e) => setWho(e.target.value)}
            className="bg-transparent border border-gray-700 rounded-lg px-4 py-3 outline-none"
            placeholder="Who"
            inputMode="numeric"
          />

          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 rounded-lg px-6 py-3 font-semibold"
          >
            Search Homes
          </button>
        </form>
      </div>
    </section>
  );
}