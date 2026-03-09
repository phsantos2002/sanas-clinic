import { signInWithFacebook, signInWithEmail, signUpWithEmail } from "@/app/actions/auth";
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

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-zinc-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-zinc-400">ou</span>
            </div>
          </div>

          <form action={signInWithFacebook}>
            <Button type="submit" variant="secondary" className="w-full">
              <FacebookIcon />
              Continuar com Facebook
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

function FacebookIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-4 w-4"
    >
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}
