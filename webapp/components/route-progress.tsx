"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

// A thin brand-blue progress bar at the very top of the page. It starts creeping
// forward when the user clicks an internal link and completes once the new route
// commits — feedback for the >1s navigations (Nielsen's response-time limits,
// heuristic #3 "visibility of system status"). Pairs with the route-level
// loading.tsx skeletons: the bar says "something is happening", the skeleton
// shows the incoming page's shape. Styling lives in globals.css (.route-progress).
export function RouteProgress() {
  const pathname = usePathname();
  const [width, setWidth] = useState(0);
  const [visible, setVisible] = useState(false);
  const trickle = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function stopTrickle() {
    if (trickle.current) clearInterval(trickle.current);
    trickle.current = null;
  }

  function start() {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    stopTrickle();
    setVisible(true);
    setWidth(8);
    // Ease toward 90% but never reach it until the route actually commits.
    trickle.current = setInterval(() => {
      setWidth((w) => (w < 90 ? w + (90 - w) * 0.15 : w));
    }, 300);
  }

  function done() {
    stopTrickle();
    setWidth(100);
    hideTimer.current = setTimeout(() => {
      setVisible(false);
      setWidth(0);
    }, 350);
  }

  // Route committed → finish the bar.
  useEffect(() => {
    done();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Kick the bar off on internal link clicks (capture phase so we run before
  // the Link's own handler). Skip new-tab / modified / same-page clicks.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || !href.startsWith("/")) return;
      if (anchor.getAttribute("target") === "_blank") return;
      const dest = new URL(href, window.location.origin);
      if (dest.pathname === window.location.pathname) return; // hash / same page
      start();
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup on unmount.
  useEffect(
    () => () => {
      stopTrickle();
      if (hideTimer.current) clearTimeout(hideTimer.current);
    },
    []
  );

  if (!visible) return null;
  return (
    <div
      className="route-progress"
      style={{ width: `${width}%`, opacity: width >= 100 ? 0 : 1 }}
      aria-hidden
    />
  );
}
