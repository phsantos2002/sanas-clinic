export default function PostsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg sm:text-xl font-bold text-slate-900">Postagens</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">Agende e publique conteúdo em todas as plataformas</p>
      </div>
      {children}
    </div>
  );
}
