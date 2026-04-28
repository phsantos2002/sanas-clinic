"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateBusinessProfile, type BusinessProfileData } from "@/app/actions/businessProfile";
import type { BusinessProfile } from "@prisma/client";

type Props = {
  initial: BusinessProfile | null;
};

const PIX_TYPES = [
  { value: "", label: "Selecione..." },
  { value: "cpf", label: "CPF" },
  { value: "cnpj", label: "CNPJ" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Telefone" },
  { value: "random", label: "Chave aleatoria" },
];

export function BusinessProfileForm({ initial }: Props) {
  const [pending, startTransition] = useTransition();
  const [data, setData] = useState<BusinessProfileData>({
    companyName: initial?.companyName ?? "",
    description: initial?.description ?? "",
    businessEmail: initial?.businessEmail ?? "",
    businessPhone: initial?.businessPhone ?? "",
    website: initial?.website ?? "",
    instagram: initial?.instagram ?? "",
    address: initial?.address ?? "",
    city: initial?.city ?? "",
    state: initial?.state ?? "",
    zipCode: initial?.zipCode ?? "",
    businessHours: initial?.businessHours ?? "",
    pixKey: initial?.pixKey ?? "",
    pixKeyType: initial?.pixKeyType ?? "",
  });

  const update = (k: keyof BusinessProfileData, v: string) =>
    setData((prev) => ({ ...prev, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateBusinessProfile(data);
      if (res.success) toast.success("Dados do negocio salvos");
      else toast.error(res.error || "Erro ao salvar");
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <FieldGroup label="Identidade">
        <Field label="Nome da empresa">
          <Input
            value={data.companyName ?? ""}
            onChange={(e) => update("companyName", e.target.value)}
            placeholder="Ex: Clinica Sanas"
          />
        </Field>
        <Field label="Descricao" hint="Sobre o negocio, especialidades, diferenciais">
          <textarea
            value={data.description ?? ""}
            onChange={(e) => update("description", e.target.value)}
            rows={3}
            className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Ex: Clinica de estetica especializada em harmonizacao facial..."
          />
        </Field>
      </FieldGroup>

      <FieldGroup label="Contato">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Email comercial">
            <Input
              type="email"
              value={data.businessEmail ?? ""}
              onChange={(e) => update("businessEmail", e.target.value)}
              placeholder="contato@empresa.com.br"
            />
          </Field>
          <Field label="Telefone comercial">
            <Input
              value={data.businessPhone ?? ""}
              onChange={(e) => update("businessPhone", e.target.value)}
              placeholder="(11) 99999-9999"
            />
          </Field>
          <Field label="Site">
            <Input
              value={data.website ?? ""}
              onChange={(e) => update("website", e.target.value)}
              placeholder="empresa.com.br"
            />
          </Field>
          <Field label="Instagram">
            <Input
              value={data.instagram ?? ""}
              onChange={(e) => update("instagram", e.target.value)}
              placeholder="@empresa"
            />
          </Field>
        </div>
      </FieldGroup>

      <FieldGroup label="Localizacao">
        <Field label="Endereco">
          <Input
            value={data.address ?? ""}
            onChange={(e) => update("address", e.target.value)}
            placeholder="Rua X, 123, Bairro Y"
          />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Cidade">
            <Input
              value={data.city ?? ""}
              onChange={(e) => update("city", e.target.value)}
              placeholder="Sao Jose dos Campos"
            />
          </Field>
          <Field label="Estado">
            <Input
              value={data.state ?? ""}
              onChange={(e) => update("state", e.target.value)}
              placeholder="SP"
              maxLength={2}
            />
          </Field>
          <Field label="CEP">
            <Input
              value={data.zipCode ?? ""}
              onChange={(e) => update("zipCode", e.target.value)}
              placeholder="00000-000"
            />
          </Field>
        </div>
      </FieldGroup>

      <FieldGroup label="Operacao">
        <Field
          label="Horario de funcionamento"
          hint="Texto livre que a IA usa pra responder pergunta de horario"
        >
          <Input
            value={data.businessHours ?? ""}
            onChange={(e) => update("businessHours", e.target.value)}
            placeholder="Ex: Seg-Sex 9-18h, Sab 9-13h"
          />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Tipo de chave PIX">
            <select
              value={data.pixKeyType ?? ""}
              onChange={(e) => update("pixKeyType", e.target.value)}
              className="w-full h-9 px-3 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {PIX_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Chave PIX">
              <Input
                value={data.pixKey ?? ""}
                onChange={(e) => update("pixKey", e.target.value)}
                placeholder="Ex: 12345678000190 ou contato@empresa.com.br"
              />
            </Field>
          </div>
        </div>
      </FieldGroup>

      <div className="flex justify-end pt-2">
        <Button type="submit" disabled={pending} size="sm">
          {pending ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-slate-700">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-slate-400">{hint}</p>}
    </div>
  );
}
