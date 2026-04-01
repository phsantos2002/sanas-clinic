"use client";

import { useState, useEffect } from "react";
import { WifiOff, Wifi } from "lucide-react";

export function OfflineBanner() {
  const [online, setOnline] = useState(true);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 3000);
    };
    const handleOffline = () => { setOnline(false); setShowReconnected(false); };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setOnline(navigator.onLine);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (online && !showReconnected) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium transition-all ${
        online
          ? "bg-emerald-500 text-white"
          : "bg-red-500 text-white"
      }`}
    >
      {online ? (
        <>
          <Wifi className="h-3.5 w-3.5" />
          Conexao restaurada
        </>
      ) : (
        <>
          <WifiOff className="h-3.5 w-3.5" />
          Voce esta offline. Tentando reconectar...
        </>
      )}
    </div>
  );
}
