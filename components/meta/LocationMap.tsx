"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type LocationPin = {
  id: string;
  geo: {
    key: string;
    name: string;
    type: string;
    region: string;
    latitude?: number;
    longitude?: number;
  };
  radius: number;
};

type Props = {
  pins: LocationPin[];
};

export function LocationMap({ pins }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const layersRef = useRef<L.LayerGroup | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    mapInstance.current = L.map(mapRef.current, {
      center: [-15.78, -47.93], // Brazil center
      zoom: 4,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
    }).addTo(mapInstance.current);

    layersRef.current = L.layerGroup().addTo(mapInstance.current);

    return () => {
      mapInstance.current?.remove();
      mapInstance.current = null;
    };
  }, []);

  // Update markers and circles when pins change
  useEffect(() => {
    if (!mapInstance.current || !layersRef.current) return;

    layersRef.current.clearLayers();

    const validPins = pins.filter((p) => p.geo.latitude && p.geo.longitude);

    if (validPins.length === 0) {
      mapInstance.current.setView([-15.78, -47.93], 4);
      return;
    }

    const bounds = L.latLngBounds([]);

    for (const pin of validPins) {
      const lat = pin.geo.latitude!;
      const lng = pin.geo.longitude!;
      const latlng = L.latLng(lat, lng);

      // Circle for radius
      const circle = L.circle(latlng, {
        radius: pin.radius * 1000, // km to meters
        color: "#6366f1",
        fillColor: "#6366f1",
        fillOpacity: 0.12,
        weight: 2,
      });
      circle.addTo(layersRef.current!);

      // Marker
      const marker = L.circleMarker(latlng, {
        radius: 7,
        color: "#4f46e5",
        fillColor: "#4f46e5",
        fillOpacity: 1,
        weight: 2,
      });
      marker.bindTooltip(`${pin.geo.name} — ${pin.radius} km`, {
        permanent: false,
        direction: "top",
        offset: [0, -10],
      });
      marker.addTo(layersRef.current!);

      // Extend bounds to include the circle
      bounds.extend(circle.getBounds());
    }

    if (bounds.isValid()) {
      mapInstance.current.fitBounds(bounds, { padding: [30, 30], maxZoom: 13 });
    }
  }, [pins]);

  return (
    <div
      ref={mapRef}
      className="w-full h-[200px] rounded-xl overflow-hidden border border-slate-200"
      style={{ zIndex: 0 }}
    />
  );
}
