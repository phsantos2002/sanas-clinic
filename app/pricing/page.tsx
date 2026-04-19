import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Sparkles, Crown, Building2 } from "lucide-react";

export default function PricingPage() {
  const plans = [
    {
      id: "starter",
      name: "Starter",
      icon: Sparkles,
      accent: "from-slate-500 to-slate-700",
      tagline: "Para começar a rastrear o que gasta no Meta.",
      price: "—",
      priceNote: "Em breve",
      features: [
        "1 usuário",
        "WhatsApp via Uazapi",
        "Pipeline Kanban + Lead Scoring",
        "Pixel + CAPI (Meta)",
        "Atribuição multi-touch",
        "Até 500 leads/mês",
      ],
      cta: "Entrar na lista",
      highlighted: false,
    },
    {
      id: "pro",
      name: "Pro",
      icon: Crown,
      accent: "from-indigo-500 to-violet-600",
      tagline: "Para quem já gasta R$3k–R$30k/mês em Meta Ads.",
      price: "—",
      priceNote: "Em breve",
      features: [
        "Até 3 usuários",
        "WhatsApp oficial (Meta Cloud API)",
        "Meta Ads com alertas IA (6 regras)",
        "Diagnóstico de fase da conta",
        "Workflows ilimitados",
        "Google Calendar + agendamento",
        "Até 5.000 leads/mês",
      ],
      cta: "Entrar na lista",
      highlighted: true,
    },
    {
      id: "agency",
      name: "Agency",
      icon: Building2,
      accent: "from-fuchsia-500 to-rose-500",
      tagline: "Para agências que rodam Meta Ads para vários clientes.",
      price: "—",
      priceNote: "Sob consulta",
      features: [
        "Multi-cliente (white-label)",
        "Domínio próprio e marca",
        "Usuários ilimitados",
        "Todas as features do Pro",
        "Relatórios por cliente",
        "Suporte prioritário",
      ],
      cta: "Falar com a gente",
      highlighted: false,
    },
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Sanas Pulse"
              width={32}
              height={32}
              className="rounded-lg"
            />
            <span className="font-semibold tracking-tight">Sanas Pulse</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/login" className="text-sm text-slate-600 hover:text-slate-900 px-3 py-1.5">
              Entrar
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium bg-indigo-600 text-white rounded-xl px-4 py-2 hover:bg-indigo-700 inline-flex items-center gap-1.5"
            >
              Começar agora <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <section className="max-w-6xl mx-auto px-5 pt-16 pb-10 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 text-indigo-700 px-3 py-1 text-xs font-medium">
          Planos
        </span>
        <h1 className="mt-6 text-3xl md:text-5xl font-extrabold tracking-tight">
          Escolha o plano certo para o seu Meta Ads.
        </h1>
        <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
          Preços em definição. Entre na lista e garanta condições de lançamento.
        </p>
      </section>

      <section className="max-w-6xl mx-auto px-5 pb-20">
        <div className="grid md:grid-cols-3 gap-5">
          {plans.map((plan) => {
            const Icon = plan.icon;
            return (
              <div
                key={plan.id}
                className={`relative rounded-3xl p-7 border ${
                  plan.highlighted
                    ? "bg-white border-indigo-200 shadow-xl shadow-indigo-500/10"
                    : "bg-white border-slate-100"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="inline-flex items-center gap-1 bg-gradient-to-r from-indigo-500 to-violet-600 text-white text-xs font-semibold px-3 py-1 rounded-full shadow">
                      Recomendado
                    </span>
                  </div>
                )}
                <div
                  className={`h-11 w-11 rounded-xl bg-gradient-to-br ${plan.accent} text-white flex items-center justify-center shadow`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <p className="mt-5 text-lg font-semibold">{plan.name}</p>
                <p className="text-sm text-slate-500 mt-1 min-h-[40px]">{plan.tagline}</p>
                <div className="mt-5 flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold">{plan.price}</span>
                  <span className="text-sm text-slate-500">{plan.priceNote}</span>
                </div>
                <ul className="mt-6 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-700">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/login"
                  className={`mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 font-semibold ${
                    plan.highlighted
                      ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-500/20"
                      : "border border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {plan.cta} <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            );
          })}
        </div>

        <div className="mt-12 rounded-2xl border border-slate-100 bg-slate-50/50 p-6 md:p-8 text-center">
          <p className="text-sm font-semibold text-slate-700">Dúvidas sobre qual plano escolher?</p>
          <p className="mt-1 text-sm text-slate-500">
            Se você gasta mais de R$3k/mês em Meta, o Pro compensa. Se tem uma agência de tráfego, o
            Agency foi desenhado para você.
          </p>
        </div>
      </section>

      <footer className="border-t border-slate-100 bg-slate-50/60">
        <div className="max-w-6xl mx-auto px-5 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Sanas Pulse"
              width={24}
              height={24}
              className="rounded-md"
            />
            <span>© {new Date().getFullYear()} Sanas Pulse</span>
          </div>
          <div className="flex items-center gap-5">
            <Link href="/" className="hover:text-slate-900">
              Home
            </Link>
            <Link href="/login" className="hover:text-slate-900">
              Entrar
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
