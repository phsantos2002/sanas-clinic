"use client";

import { useEffect } from "react";

/**
 * Locks <html>/<body> scroll while mounted. The chat shell sizes itself to the
 * viewport, so any body-level scroll exposes whitespace below the input — exactly
 * the rubber-band/drag-up bug we're killing here.
 *
 * Resets scrollY=0 BEFORE locking — otherwise the body freezes at whatever
 * position the previous route left behind, hiding the dashboard nav above
 * the chat shell. Restores the prior position on unmount so leaving /chat
 * doesn't yank the user to the top of the next page.
 */
export function ScrollLock() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prev = {
      htmlOverflow: html.style.overflow,
      htmlOverscroll: html.style.overscrollBehavior,
      bodyOverflow: body.style.overflow,
      bodyOverscroll: body.style.overscrollBehavior,
      scrollY: window.scrollY,
    };
    window.scrollTo({ top: 0, behavior: "auto" });
    html.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    return () => {
      html.style.overflow = prev.htmlOverflow;
      html.style.overscrollBehavior = prev.htmlOverscroll;
      body.style.overflow = prev.bodyOverflow;
      body.style.overscrollBehavior = prev.bodyOverscroll;
      window.scrollTo({ top: prev.scrollY, behavior: "auto" });
    };
  }, []);
  return null;
}
