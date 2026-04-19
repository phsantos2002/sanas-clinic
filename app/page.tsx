import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Target,
  MessageCircle,
  Kanban,
  BarChart3,
  CheckCircle2,
  Zap,
  ShieldCheck,
  Activity,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard/overview");
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image
              src="/logo.png"
              alt="Sanas Pulse"
              width={32}
              height={32}
              className="rounded-lg"
            />
            <span className="font-semibold tracking-tight">Sanas Pulse</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-600">
            <a href="#como-funciona" className="hover:text-slate-900">
              Como funciona
            </a>
            <a href="#features" className="hover:text-slate-900">
              Recursos
            </a>
            <a href="#verticais" className="hover:text-slate-900">
              Para quem é
            </a>
            <Link href="/pricing" className="hover:text-slate-900">
              Planos
            </Link>
          </nav>
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

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-violet-50/40 -z-10" />
        <div className="max-w-6xl mx-auto px-5 pt-16 pb-20 md:pt-24 md:pb-28 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-100 text-indigo-700 px-3 py-1 text-xs font-medium">
            <Activity className="h-3.5 w-3.5" /> CRM de Performance para quem anuncia no Meta
          </span>
          <h1 className="mt-6 text-4xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-br from-slate-900 to-indigo-700 bg-clip-text text-transparent">
            Do clique no Meta Ads
            <br />
            ao cliente agendado.
          </h1>
          <p className="mt-5 text-lg text-slate-600 max-w-2xl mx-auto">
            Rastreie cada real investido até virar agendamento. Pixel + CAPI, atribuição real,
            WhatsApp com IA e pipeline que fecha sozinho — tudo em uma tela.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-indigo-600 text-white rounded-xl px-6 py-3 font-semibold shadow-lg shadow-indigo-500/20 hover:bg-indigo-700"
            >
              Começar grátis <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 border border-slate-200 rounded-xl px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Ver planos
            </Link>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Pixel + CAPI nativos
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> WhatsApp oficial ou Uazapi
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Conformidade LGPD
            </span>
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-5 py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold">O problema de quem anuncia no Brasil</h2>
          <p className="mt-3 text-slate-600 max-w-2xl mx-auto">
            Você gasta em Meta Ads, o lead cai no WhatsApp, alguém atende, e depois… ninguém sabe
            qual campanha trouxe cliente. A planilha mente, a IA da Meta não conversa com seu
            WhatsApp, e o ROI vira chute.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              title: "Gasto sem rastro",
              desc: "Lead some entre o clique e o agendamento. Sem Pixel + CAPI, você otimiza no escuro.",
            },
            {
              title: "WhatsApp desconectado",
              desc: "Atendente responde, não loga. Histórico perdido, zero métrica de conversão.",
            },
            {
              title: "Relatório manual",
              desc: "Planilha que o time preenche quando lembra. Decisão de verba baseada em achismo.",
            },
          ].map((p) => (
            <div key={p.title} className="rounded-2xl border border-slate-100 bg-white p-6">
              <p className="text-base font-semibold text-slate-900">{p.title}</p>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="como-funciona" className="bg-slate-50/50 border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-5 py-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold">Como funciona</h2>
            <p className="mt-3 text-slate-600">Três passos e o ciclo se fecha sozinho.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                n: "1",
                title: "Conecta o Pixel + Meta Ads",
                desc: "Em 2 minutos: Pixel ID, token de CAPI e conta de anúncios. A gente traz campanhas, ad sets e anúncios automaticamente.",
              },
              {
                n: "2",
                title: "IA atende no WhatsApp",
                desc: "Lead chega pelo anúncio, a IA responde, qualifica e passa para o atendente humano no momento certo — sem perder o contexto.",
              },
              {
                n: "3",
                title: "Fecha no agendamento",
                desc: "Pipeline Kanban + Google Calendar. O evento Purchase dispara de volta no Pixel, alimentando a IA da Meta com conversões reais.",
              },
            ].map((step) => (
              <div key={step.n} className="rounded-2xl bg-white border border-slate-100 p-6">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white font-bold flex items-center justify-center shadow-md shadow-indigo-500/20">
                  {step.n}
                </div>
                <p className="mt-4 text-lg font-semibold">{step.title}</p>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="max-w-6xl mx-auto px-5 py-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold">Tudo no mesmo sistema</h2>
          <p className="mt-3 text-slate-600">
            Sem integrações por fora. Sem Zapier no meio do caminho.
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            {
              icon: Target,
              title: "Ads & Atribuição",
              desc: "Pixel + CAPI nativos, atribuição multi-touch (first, last, linear, time-decay), diagnóstico automático de fase da conta (learning → scaling → mature) e alertas IA para CPL alto, frequência, fadiga de criativo.",
              color: "text-blue-600",
              bg: "bg-blue-50",
            },
            {
              icon: MessageCircle,
              title: "Chat WhatsApp com IA",
              desc: "Oficial (Meta Cloud API) ou Uazapi. IA que qualifica, responde e agenda. Templates, broadcast, equipe de atendentes, follow-up automático e sugestão de resposta.",
              color: "text-green-600",
              bg: "bg-green-50",
            },
            {
              icon: Kanban,
              title: "Pipeline inteligente",
              desc: "Kanban drag-and-drop, lead scoring automático (0–100), tags, filtros, histórico completo por lead. Eventos Meta disparados automaticamente em cada avanço de etapa.",
              color: "text-violet-600",
              bg: "bg-violet-50",
            },
            {
              icon: BarChart3,
              title: "Analytics de verdade",
              desc: "Funil, LTV por fonte, CAC, ROAS, distribuição de score, cohort. Insights gerados por IA com leitura em linguagem natural do que está acontecendo na sua conta.",
              color: "text-amber-600",
              bg: "bg-amber-50",
            },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border border-slate-100 bg-white p-6">
              <div className={`h-11 w-11 ${f.bg} rounded-xl flex items-center justify-center`}>
                <f.icon className={`h-5 w-5 ${f.color}`} />
              </div>
              <p className="mt-4 text-lg font-semibold">{f.title}</p>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="verticais" className="bg-slate-50/50 border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-5 py-20">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold">Feito para quem anuncia local</h2>
            <p className="mt-3 text-slate-600">
              Dois perfis onde a gente já viu resultado rodando Meta Ads todos os dias.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-slate-100 bg-white p-8">
              <p className="text-xs font-semibold tracking-wider text-indigo-600">CLÍNICAS</p>
              <p className="mt-2 text-xl font-bold">Estética, odontológica, saúde</p>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                Anúncios de Click-to-WhatsApp + IA que pré-qualifica + agendamento no Google
                Calendar + evento Purchase voltando no Pixel. Cada procedimento vira um serviço com
                preço e duração, e a atribuição mostra qual anúncio fechou.
              </p>
              <ul className="mt-5 space-y-2 text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />{" "}
                  Procedimentos cadastrados com preço e duração
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" /> Agenda
                  integrada ao Google Calendar
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" /> LGPD:
                  exportação, anonimização e exclusão de paciente
                </li>
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-8">
              <p className="text-xs font-semibold tracking-wider text-violet-600">
                SERVIÇOS LOCAIS
              </p>
              <p className="mt-2 text-xl font-bold">Academia, restaurante, imobiliária</p>
              <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                Anúncio regional + WhatsApp + conversão medida. Alerta quando frequência explode,
                CPL sobe ou criativo cansa. Reativação automática de leads parados há 7+ dias.
                Equipe de atendimento com round-robin.
              </p>
              <ul className="mt-5 space-y-2 text-sm text-slate-700">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" /> Segmentação
                  por cidade e região
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" /> Alertas IA:
                  CPL, frequência, fadiga de criativo
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" /> Reativação
                  automática de leads inativos
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-4xl mx-auto px-5 py-20 text-center">
        <Zap className="h-8 w-8 text-indigo-600 mx-auto" />
        <h2 className="mt-4 text-2xl md:text-3xl font-bold">Pare de anunciar no escuro.</h2>
        <p className="mt-3 text-slate-600 max-w-xl mx-auto">
          Você já gasta em Meta Ads. O mínimo que o dinheiro merece é ser rastreado até o cliente
          fechado.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white rounded-xl px-6 py-3 font-semibold shadow-lg shadow-indigo-500/20 hover:bg-indigo-700"
          >
            Começar grátis <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 border border-slate-200 rounded-xl px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50"
          >
            Ver planos
          </Link>
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
            <Link href="/pricing" className="hover:text-slate-900">
              Planos
            </Link>
            <Link href="/login" className="hover:text-slate-900">
              Entrar
            </Link>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4" /> LGPD-ready
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
