import { SocialSubNav } from "@/components/social/SocialSubNav";

export default function SocialLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg sm:text-xl font-bold text-slate-900">Social Media</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Gerencie seu conteudo, agende posts e acompanhe resultados
        </p>
      </div>
      <SocialSubNav />
      {children}
    </div>
  );
}
