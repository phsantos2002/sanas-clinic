"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Calendar, Check, ExternalLink, Clock, X } from "lucide-react";
import { saveCalendarConfig, disconnectCalendar } from "@/app/actions/calendar";
import { GoogleCalendarSetupWizard } from "./GoogleCalendarSetupWizard";

type CalendarConfigData = {
  connected: boolean;
  email: string | null;
  calendarId: string;
  businessHoursStart: string;
  businessHoursEnd: string;
  workDays: number[];
  timezone: string;
} | null;

type SetupInfo = {
  googleCloudConfigured: boolean;
  redirectUri: string;
  vercelEnvUrl: string;
};

const DAYS = [
  { id: 0, label: "Dom" },
  { id: 1, label: "Seg" },
  { id: 2, label: "Ter" },
  { id: 3, label: "Qua" },
  { id: 4, label: "Qui" },
  { id: 5, label: "Sex" },
  { id: 6, label: "Sab" },
];

export function CalendarConfig({
  config,
  setup,
}: {
  config: CalendarConfigData;
  setup?: SetupInfo;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [hoursStart, setHoursStart] = useState(config?.businessHoursStart || "09:00");
  const [hoursEnd, setHoursEnd] = useState(config?.businessHoursEnd || "18:00");
  const [workDays, setWorkDays] = useState<number[]>(config?.workDays || [1, 2, 3, 4, 5, 6]);

  // Setup OAuth do Google Cloud não feito ainda → mostra wizard em vez do
  // botão "Conectar" (que daria erro 500 sem GOOGLE_CLIENT_ID/SECRET).
  if (setup && !setup.googleCloudConfigured) {
    return (
      <GoogleCalendarSetupWizard
        redirectUri={setup.redirectUri}
        vercelEnvUrl={setup.vercelEnvUrl}
      />
    );
  }

  const toggleDay = (day: number) => {
    setWorkDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const handleSave = async () => {
    setSaving(true);
    const result = await saveCalendarConfig({
      businessHoursStart: hoursStart,
      businessHoursEnd: hoursEnd,
      workDays,
    });
    setSaving(false);
    if (result.success) toast.success("Horarios salvos!");
    else toast.error(result.error);
  };

  const handleDisconnect = async () => {
    const result = await disconnectCalendar();
    if (result.success) {
      toast.success("Google Calendar desconectado");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  };

  if (!config?.connected) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-100 rounded-xl">
          <Calendar className="h-5 w-5 text-amber-500 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">Desconectado</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Conecte o Google Calendar para a IA agendar procedimentos automaticamente via WhatsApp
            </p>
          </div>
        </div>

        <a
          href="/api/auth/google-calendar"
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Calendar className="h-4 w-4" /> Conectar Google Calendar
        </a>

        <div className="text-xs text-slate-400 space-y-1">
          <p>Com o Calendar conectado, a IA podera:</p>
          <p>- Ver horarios livres e ocupados</p>
          <p>- Sugerir horarios para o cliente</p>
          <p>- Criar eventos automaticamente ao confirmar agendamento</p>
          <p>- Respeitar horario comercial e dias de trabalho</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status */}
      <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-100 rounded-xl">
        <Check className="h-5 w-5 text-green-600 shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-green-800">Conectado</p>
          {config.email && <p className="text-xs text-green-600">{config.email}</p>}
        </div>
        <button
          onClick={handleDisconnect}
          className="text-xs text-slate-400 hover:text-red-500 transition-colors"
        >
          Desconectar
        </button>
      </div>

      {/* Business Hours */}
      <div>
        <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-1.5">
          <Clock className="h-4 w-4" /> Horario de funcionamento
        </label>
        <div className="flex items-center gap-2">
          <input
            type="time"
            value={hoursStart}
            onChange={(e) => setHoursStart(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <span className="text-sm text-slate-400">ate</span>
          <input
            type="time"
            value={hoursEnd}
            onChange={(e) => setHoursEnd(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Work Days */}
      <div>
        <label className="text-sm font-medium text-slate-700 mb-2 block">Dias de trabalho</label>
        <div className="flex gap-1.5">
          {DAYS.map((day) => (
            <button
              key={day.id}
              onClick={() => toggleDay(day.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                workDays.includes(day.id)
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {day.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
      >
        {saving ? "Salvando..." : "Salvar Horarios"}
      </button>
    </div>
  );
}
