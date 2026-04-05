"use client";

import { useState, useEffect } from "react";
import { TutorialOverlay } from "./TutorialOverlay";

export function TutorialGate({ shouldShow }: { shouldShow: boolean }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (shouldShow) {
      // Small delay to let the dashboard render first
      const t = setTimeout(() => setShow(true), 800);
      return () => clearTimeout(t);
    }
  }, [shouldShow]);

  if (!show) return null;
  return <TutorialOverlay onClose={() => setShow(false)} />;
}
