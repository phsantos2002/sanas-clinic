import { SocialSubNav } from "@/components/social/SocialSubNav";

export default function SocialLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg sm:text-xl font-bold text-slate-900">Conteudo</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Crie, agende e publique conteudo em todas as plataformas
        </p>
      </div>
      <SocialSubNav />
      {children}
    </div>
  );
}
