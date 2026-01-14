"use client";

import { useState } from "react";
import Link from "next/link";

export function Navigation() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 bg-[#0f1115]/90 backdrop-blur border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">SwapDoor</Link>

          <nav className="hidden md:flex gap-8">
            <Link href="/explore">Explore</Link>
            <Link href="/how-it-works">How it Works</Link>
          </nav>

          <div className="hidden md:flex items-center gap-4 h-full">
            <Link
              href="/sign-in"
              className="flex items-center h-full text-gray-300 hover:text-white"
            >
              Sign In
            </Link>

            <Link
              href="/sign-in"
              className="flex items-center h-10 border border-gray-600 px-4 rounded-lg hover:bg-gray-800 transition"
            >
              List Your Home
            </Link>
          </div>

          <button className="md:hidden" onClick={() => setOpen(true)}>☰</button>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/80">
          <div className="absolute right-0 top-0 h-full w-[85%] bg-[#0f1115] p-6">
            <div className="flex justify-between mb-10">
              <span className="font-bold">SwapDoor</span>
              <button onClick={() => setOpen(false)}>✕</button>
            </div>

            <div className="flex flex-col gap-6">
              <Link href="/explore" onClick={() => setOpen(false)}>Explore</Link>
              <Link href="/how-it-works" onClick={() => setOpen(false)}>How it Works</Link>
              <Link href="/sign-in" onClick={() => setOpen(false)}>Sign In</Link>
              <Link
                href="/sign-in"
                onClick={() => setOpen(false)}
                className="border px-4 py-3 rounded-lg text-center"
              >
                List Your Home
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
