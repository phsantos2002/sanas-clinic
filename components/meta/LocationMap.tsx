"use client";

import { useEffect, useRef, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type MapPin = {
  id: string;
  lat: number;
  lng: number;
  radius: number; // km
  name: string;
};

type Props = {
  pins: MapPin[];
  onAddPin: (lat: number, lng: number) => void;
  height?: number;
  addMode: boolean;
  onPinPlaced: () => void; // called after a pin is placed to exit add mode
};

export function LocationMap({ pins, onAddPin, height = 260, addMode, onPinPlaced }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const layersRef = useRef<L.LayerGroup | null>(null);
  const onAddPinRef = useRef(onAddPin);
  const onPinPlacedRef = useRef(onPinPlaced);
  const addModeRef = useRef(addMode);
  onAddPinRef.current = onAddPin;
  onPinPlacedRef.current = onPinPlaced;
  addModeRef.current = addMode;

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    mapInstance.current = L.map(mapRef.current, {
      center: [-23.18, -45.88], // São José dos Campos default
      zoom: 12,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
    }).addTo(mapInstance.current);

    layersRef.current = L.layerGroup().addTo(mapInstance.current);

    // Click to add pin only in add mode
    mapInstance.current.on("click", (e: L.LeafletMouseEvent) => {
      if (!addModeRef.current) return;
      onAddPinRef.current(e.latlng.lat, e.latlng.lng);
      onPinPlacedRef.current();
    });

    return () => {
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
  }, []);

  // Toggle cursor style based on addMode
  useEffect(() => {
    const container = mapInstance.current?.getContainer();
    if (!container) return;
    container.style.cursor = addMode ? "crosshair" : "";
  }, [addMode]);

  // Update markers and circles when pins change
  useEffect(() => {
    if (!mapInstance.current || !layersRef.current) return;

    layersRef.current.clearLayers();

    if (pins.length === 0) return;

    const bounds = L.latLngBounds([]);

    for (const pin of pins) {
      const latlng = L.latLng(pin.lat, pin.lng);

      // Circle for radius
      const circle = L.circle(latlng, {
        radius: pin.radius * 1000,
        color: "#6366f1",
        fillColor: "#6366f1",
        fillOpacity: 0.12,
        weight: 2,
        dashArray: "6 4",
      });
      circle.addTo(layersRef.current!);

      // Marker dot
      const marker = L.circleMarker(latlng, {
        radius: 8,
        color: "#ffffff",
        fillColor: "#4f46e5",
        fillOpacity: 1,
        weight: 3,
      });
      marker.bindTooltip(
        `<strong>${pin.name || "Pino"}</strong><br/>${pin.radius} km de raio`,
        { direction: "top", offset: [0, -12] }
      );
      marker.addTo(layersRef.current!);

      bounds.extend(circle.getBounds());
    }

    if (bounds.isValid()) {
      mapInstance.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [pins]);

  // Pan to location
  const panTo = useCallback((lat: number, lng: number, zoom?: number) => {
    mapInstance.current?.setView([lat, lng], zoom ?? 13);
  }, []);

  // Expose panTo via ref-like pattern
  useEffect(() => {
    if (mapRef.current) {
      (mapRef.current as unknown as { panTo: typeof panTo }).panTo = panTo;
    }
  }, [panTo]);

  return (
    <div className="relative">
      <div
        ref={mapRef}
        className="w-full rounded-xl overflow-hidden border border-slate-200"
        style={{ height: `${height}px`, zIndex: 0 }}
      />
      {addMode && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1000] bg-indigo-600 text-white text-[10px] font-semibold px-3 py-1.5 rounded-full shadow-lg pointer-events-none animate-pulse">
          Clique no mapa para posicionar o pino
        </div>
      )}
    </div>
  );
}
