"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  updateAccountName,
  updateAccountEmail,
  updateAccountPhoto,
  updateAccountPassword,
  deleteAccount,
} from "@/app/actions/account";
import { toast } from "sonner";
import { User, Lock, Trash2, Mail, Calendar, Shield, AlertTriangle, Camera, X } from "lucide-react";
import { useRouter } from "next/navigation";

type Props = {
  account: {
    email: string;
    name: string;
    photoUrl: string | null;
    createdAt: Date;
    provider: string;
  };
};

function resizeImage(file: File, maxSize: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let w = img.width;
      let h = img.height;
      if (w > h) {
        if (w > maxSize) {
          h = Math.round((h * maxSize) / w);
          w = maxSize;
        }
      } else {
        if (h > maxSize) {
          w = Math.round((w * maxSize) / h);
          h = maxSize;
        }
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not supported"));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = URL.createObjectURL(file);
  });
}

export function AccountPageClient({ account }: Props) {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Minha Conta</h1>
        <p className="text-sm text-slate-400 mt-1">
          Gerencie suas informações pessoais e segurança
        </p>
      </div>

      <ProfileHeader
        name={account.name}
        email={account.email}
        photoUrl={account.photoUrl}
        provider={account.provider}
        createdAt={account.createdAt}
      />
      <NameSection name={account.name} />
      <EmailSection email={account.email} />
      <PasswordSection />
      <DangerZone />
    </div>
  );
}

// ─── Profile Header ───

function ProfileHeader({
  name,
  email,
  photoUrl,
  provider,
  createdAt,
}: {
  name: string;
  email: string;
  photoUrl: string | null;
  provider: string;
  createdAt: Date;
}) {
  const [photo, setPhoto] = useState<string | null>(photoUrl);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A foto deve ter no máximo 5MB");
      return;
    }

    setUploading(true);
    try {
      const dataUrl = await resizeImage(file, 256);
      setPhoto(dataUrl);
      const result = await updateAccountPhoto(dataUrl);
      if (result.success) {
        toast.success("Foto atualizada");
      } else {
        toast.error(result.error);
        setPhoto(photoUrl);
      }
    } catch {
      toast.error("Erro ao processar a imagem");
      setPhoto(photoUrl);
    }
    setUploading(false);
  }

  async function handleRemovePhoto() {
    setUploading(true);
    const result = await updateAccountPhoto(null);
    setUploading(false);
    if (result.success) {
      setPhoto(null);
      toast.success("Foto removida");
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Card className="border-slate-100 rounded-2xl shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className="relative group">
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-indigo-50 flex items-center justify-center flex-shrink-0">
              {photo ? (
                <img src={photo} alt="Foto" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-indigo-600">
                  {name ? name.charAt(0).toUpperCase() : "U"}
                </span>
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
            >
              <Camera className="h-5 w-5 text-white" />
            </button>
            {photo && (
              <button
                onClick={handleRemovePhoto}
                disabled={uploading}
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
              >
                <X className="h-3 w-3" />
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handlePhotoChange}
              className="hidden"
            />
          </div>

          <div className="flex-1">
            <p className="text-base font-semibold text-slate-900">{name || "Sem nome"}</p>
            <p className="text-xs text-slate-400">{email}</p>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Shield className="h-3 w-3 text-slate-400" />
                <span className="capitalize">
                  {provider === "email" ? "Email e senha" : provider}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Calendar className="h-3 w-3 text-slate-400" />
                <span>Desde {new Date(createdAt).toLocaleDateString("pt-BR")}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Name Section ───

function NameSection({ name }: { name: string }) {
  const [value, setValue] = useState(name);
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!value.trim()) return;
    setLoading(true);
    const result = await updateAccountName(value.trim());
    setLoading(false);
    if (result.success) {
      toast.success("Nome atualizado");
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
          <User className="h-4 w-4 text-slate-400" />
          Nome
        </h2>
        <p className="text-sm text-slate-400 mt-0.5">Como você aparece no sistema.</p>
      </div>
      <div className="flex items-end gap-3 max-w-md">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="name">Nome completo</Label>
          <Input
            id="name"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Seu nome"
          />
        </div>
        <Button
          onClick={handleSave}
          disabled={loading || value.trim() === name}
          className="rounded-xl"
        >
          {loading ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </div>
  );
}

// ─── Email Section ───

function EmailSection({ email }: { email: string }) {
  const [value, setValue] = useState(email);
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    if (!value.trim() || value.trim() === email) return;
    if (!value.includes("@")) {
      toast.error("Email inválido");
      return;
    }
    setLoading(true);
    const result = await updateAccountEmail(value.trim());
    setLoading(false);
    if (result.success) {
      toast.success("Email atualizado. Verifique sua caixa de entrada para confirmar.");
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
          <Mail className="h-4 w-4 text-slate-400" />
          Email
        </h2>
        <p className="text-sm text-slate-400 mt-0.5">Seu email de acesso ao sistema.</p>
      </div>
      <div className="flex items-end gap-3 max-w-md">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="seu@email.com"
          />
        </div>
        <Button
          onClick={handleSave}
          disabled={loading || value.trim() === email}
          className="rounded-xl"
        >
          {loading ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </div>
  );
}

// ─── Password Section ───

function PasswordSection() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleChangePassword() {
    if (newPassword.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    setLoading(true);
    const result = await updateAccountPassword(newPassword);
    setLoading(false);
    if (result.success) {
      toast.success("Senha atualizada com sucesso");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-6 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
          <Lock className="h-4 w-4 text-slate-400" />
          Senha
        </h2>
        <p className="text-sm text-slate-400 mt-0.5">Altere sua senha de acesso ao sistema.</p>
      </div>
      <div className="space-y-3 max-w-md">
        <div className="space-y-1.5">
          <Label htmlFor="newPassword">Nova senha</Label>
          <Input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repita a nova senha"
          />
        </div>
        <Button onClick={handleChangePassword} disabled={loading} className="rounded-xl">
          {loading ? "Atualizando..." : "Alterar senha"}
        </Button>
      </div>
    </div>
  );
}

// ─── Danger Zone ───

function DangerZone() {
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    if (confirmText !== "EXCLUIR") return;
    setLoading(true);
    const result = await deleteAccount();
    setLoading(false);
    if (result.success) {
      router.push("/login");
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="bg-white border border-red-100 rounded-2xl p-6 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-red-600 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          Zona de perigo
        </h2>
        <p className="text-sm text-slate-400 mt-0.5">Ações irreversíveis. Tenha cuidado.</p>
      </div>

      {!showConfirm ? (
        <Button
          variant="outline"
          onClick={() => setShowConfirm(true)}
          className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Excluir minha conta
        </Button>
      ) : (
        <div className="space-y-3 bg-red-50 rounded-xl p-4">
          <p className="text-xs text-red-700 font-medium">
            Isso vai excluir permanentemente sua conta, todos os leads, conversas, configurações e
            dados. Esta ação não pode ser desfeita.
          </p>
          <div className="space-y-1.5">
            <Label className="text-xs text-red-600">
              Digite <strong>EXCLUIR</strong> para confirmar
            </Label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="EXCLUIR"
              className="border-red-200 max-w-xs"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleDelete}
              disabled={confirmText !== "EXCLUIR" || loading}
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? "Excluindo..." : "Confirmar exclusão"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setShowConfirm(false);
                setConfirmText("");
              }}
              className="rounded-xl text-slate-500"
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
