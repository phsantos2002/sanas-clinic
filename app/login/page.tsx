import { signInWithEmail, signUpWithEmail, resetPassword } from "@/app/actions/auth";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const params = await searchParams;

  const errorMessages: Record<string, string> = {
    invalid_credentials: "Email ou senha incorretos.",
    signup_failed: "Erro ao criar conta. Tente outro email.",
    oauth_failed: "Falha na autenticação com Facebook.",
    reset_failed: "Erro ao enviar email de recuperação.",
  };

  const successMessages: Record<string, string> = {
    reset_sent: "Email de recuperação enviado. Verifique sua caixa de entrada.",
  };

  const errorMsg = params.error ? (errorMessages[params.error] ?? "Erro ao autenticar.") : null;
  const successMsg = params.success ? successMessages[params.success] : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50/30 flex items-center justify-center">
      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 space-y-6">
          <div className="text-center space-y-2">
            <Image
              src="/logo.png"
              alt="Sanas Pulse"
              width={64}
              height={64}
              className="mx-auto rounded-2xl"
            />
            <h1 className="text-xl font-bold text-slate-900">Bem-vindo</h1>
            <p className="text-slate-400 text-sm">CRM de Performance para quem anuncia no Meta</p>
          </div>

          {errorMsg && (
            <div className="text-sm text-red-600 text-center bg-red-50 border border-red-100 rounded-xl p-3">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="text-sm text-emerald-600 text-center bg-emerald-50 border border-emerald-100 rounded-xl p-3">
              {successMsg}
            </div>
          )}

          <div className="space-y-4">
            <form action={signInWithEmail} className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-slate-600 text-xs font-medium">Email</Label>
                <Input
                  name="email"
                  type="email"
                  placeholder="seu@email.com"
                  required
                  className="rounded-xl h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-600 text-xs font-medium">Senha</Label>
                <Input
                  name="password"
                  type="password"
                  placeholder="Sua senha"
                  required
                  className="rounded-xl h-10"
                />
              </div>
              <Button type="submit" className="w-full h-10 rounded-xl font-semibold">
                Entrar
              </Button>
            </form>

            <div className="text-center">
              <details className="group">
                <summary className="text-xs text-slate-400 hover:text-indigo-500 cursor-pointer transition-colors">
                  Esqueci minha senha
                </summary>
                <form action={resetPassword} className="mt-3 space-y-2">
                  <Input
                    name="email"
                    type="email"
                    placeholder="seu@email.com"
                    required
                    className="rounded-xl h-10"
                  />
                  <Button type="submit" variant="outline" size="sm" className="w-full rounded-xl">
                    Enviar email de recuperação
                  </Button>
                </form>
              </details>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-100" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-slate-300">ou</span>
              </div>
            </div>

            <form action={signUpWithEmail} className="space-y-3">
              <Input
                name="email"
                type="email"
                placeholder="seu@email.com"
                required
                className="rounded-xl h-10"
              />
              <Input
                name="password"
                type="password"
                placeholder="Senha (mín. 6 caracteres)"
                required
                className="rounded-xl h-10"
              />
              <Button
                type="submit"
                variant="outline"
                className="w-full h-10 rounded-xl font-medium"
              >
                Criar conta
              </Button>
            </form>
          </div>
        </div>

        <p className="text-center text-xs text-slate-300 mt-6">
          Ao continuar, você concorda com nossos termos de uso.
        </p>
      </div>
    </div>
  );
}
