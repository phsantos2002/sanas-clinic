import { signInWithEmail, signUpWithEmail } from "@/app/actions/auth";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  const errorMessages: Record<string, string> = {
    invalid_credentials: "Email ou senha incorretos.",
    signup_failed: "Erro ao criar conta. Tente outro email.",
    oauth_failed: "Falha na autenticação com Facebook.",
  };

  const errorMsg = params.error ? (errorMessages[params.error] ?? "Erro ao autenticar.") : null;

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="w-full max-w-sm space-y-6 px-4">
        <div className="text-center space-y-1">
          <Image src="/logo.png" alt="Sanas Clinic" width={72} height={72} className="mx-auto" />
          <p className="text-zinc-500 text-sm">
            CRM para clínicas de estética
          </p>
        </div>

        {errorMsg && (
          <div className="text-sm text-red-600 text-center bg-red-50 border border-red-200 rounded-md p-3">
            {errorMsg}
          </div>
        )}

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Email</Label>
            <form action={signInWithEmail} className="space-y-2">
              <Input name="email" type="email" placeholder="seu@email.com" required />
              <Input name="password" type="password" placeholder="Senha" required />
              <Button type="submit" className="w-full">
                Entrar
              </Button>
            </form>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-zinc-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-zinc-400">ou</span>
            </div>
          </div>

          <form action={signUpWithEmail} className="space-y-2">
            <Input name="email" type="email" placeholder="seu@email.com" required />
            <Input name="password" type="password" placeholder="Senha (mín. 6 caracteres)" required />
            <Button type="submit" variant="outline" className="w-full">
              Criar conta com Email
            </Button>
          </form>

        </div>

        <p className="text-center text-xs text-zinc-400">
          Ao continuar, você concorda com nossos termos de uso.
        </p>
      </div>
    </div>
  );
}
