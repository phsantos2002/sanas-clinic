"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { updateAccountName, updateAccountPassword, deleteAccount } from "@/app/actions/account";
import { toast } from "sonner";
import { User, Lock, Trash2, Mail, Calendar, Shield, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

type Props = {
  account: {
    email: string;
    name: string;
    createdAt: Date;
    provider: string;
  };
};

export function AccountPageClient({ account }: Props) {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Minha Conta</h1>
        <p className="text-sm text-slate-400 mt-1">
          Gerencie suas informações pessoais e segurança
        </p>
      </div>

      {/* Account info */}
      <Card className="border-slate-100 rounded-2xl shadow-sm">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
              <User className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-base font-semibold text-slate-900">{account.name || "Sem nome"}</p>
              <p className="text-xs text-slate-400">{account.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Mail className="h-3.5 w-3.5 text-slate-400" />
              <span>{account.email}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Shield className="h-3.5 w-3.5 text-slate-400" />
              <span className="capitalize">{account.provider === "email" ? "Email e senha" : account.provider}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <span>Membro desde {new Date(account.createdAt).toLocaleDateString("pt-BR")}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Name */}
      <NameSection name={account.name} />

      {/* Password */}
      <PasswordSection />

      {/* Danger zone */}
      <DangerZone />
    </div>
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
        <p className="text-sm text-slate-400 mt-0.5">
          Como você aparece no sistema.
        </p>
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
        <Button onClick={handleSave} disabled={loading} className="rounded-xl">
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
        <p className="text-sm text-slate-400 mt-0.5">
          Altere sua senha de acesso ao sistema.
        </p>
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
        <p className="text-sm text-slate-400 mt-0.5">
          Ações irreversíveis. Tenha cuidado.
        </p>
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
            Isso vai excluir permanentemente sua conta, todos os leads, conversas, configurações e dados.
            Esta ação não pode ser desfeita.
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
              onClick={() => { setShowConfirm(false); setConfirmText(""); }}
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
