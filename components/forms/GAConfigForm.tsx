"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveGAConfig } from "@/app/actions/ga";
import { toast } from "sonner";

type Props = {
  config: { measurementId: string } | null;
};

export function GAConfigForm({ config }: Props) {
  const [measurementId, setMeasurementId] = useState(config?.measurementId ?? "");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!measurementId.trim()) return;
    setLoading(true);
    const result = await saveGAConfig(measurementId.trim());
    setLoading(false);
    if (result.success) {
      toast.success("Google Analytics configurado");
    } else {
      toast.error(result.error);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div className="space-y-1.5">
        <Label htmlFor="measurementId">Measurement ID</Label>
        <Input
          id="measurementId"
          placeholder="G-XXXXXXXXXX"
          value={measurementId}
          onChange={(e) => setMeasurementId(e.target.value)}
          required
        />
        <p className="text-xs text-zinc-400">
          Encontre em Google Analytics → Admin → Data Streams → seu site → Measurement ID.
        </p>
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Salvando..." : "Salvar Google Analytics"}
      </Button>
    </form>
  );
}
