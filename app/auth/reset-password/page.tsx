import { updatePassword } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-full max-w-sm space-y-6 px-4">
        <div className="text-center space-y-1">
          <Image src="/logo.png" alt="Sanas Clinic" width={72} height={72} className="mx-auto" />
          <h1 className="text-lg font-semibold">Redefinir senha</h1>
          <p className="text-zinc-500 text-sm">Digite sua nova senha abaixo.</p>
        </div>

        {params.error === "update_failed" && (
          <div className="text-sm text-red-600 text-center bg-red-50 border border-red-200 rounded-md p-3">
            Erro ao atualizar senha. Tente novamente.
          </div>
        )}

        <form action={updatePassword} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password">Nova senha</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
            />
          </div>
          <Button type="submit" className="w-full">
            Salvar nova senha
          </Button>
        </form>

        <p className="text-center">
          <a href="/login" className="text-xs text-zinc-400 hover:text-zinc-600">
            Voltar ao login
          </a>
        </p>
      </div>
    </div>
  );
}
