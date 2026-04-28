"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, AlertCircle } from "lucide-react";
import { toast } from "sonner";

type Props = {
  redirectUri: string;
  vercelEnvUrl: string;
};

export function GoogleCalendarSetupWizard({ redirectUri, vercelEnvUrl }: Props) {
  const [copied, setCopied] = useState(false);

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(`${label} copiado`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-100 rounded-xl">
        <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="flex-1 space-y-1">
          <p className="text-sm font-semibold text-amber-900">
            Setup inicial: registrar Sanas Pulse no Google Cloud
          </p>
          <p className="text-xs text-amber-700">
            ~5 min, uma vez só. Depois disso seus clientes vão ver &ldquo;Sanas Pulse pede
            permissão&rdquo; ao conectar o calendário deles.
          </p>
        </div>
      </div>

      {/* Step 1 */}
      <Step
        n={1}
        title="Criar projeto + ativar Google Calendar API"
        body={
          <>
            <p>
              Acessa o Google Cloud Console, cria um novo projeto (nome sugerido: &ldquo;Sanas
              Pulse&rdquo;) e ativa a Google Calendar API.
            </p>
            <a
              href="https://console.cloud.google.com/projectcreate"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800"
            >
              <ExternalLink className="h-3 w-3" />
              Abrir &ldquo;Criar projeto&rdquo;
            </a>
            <a
              href="https://console.cloud.google.com/apis/library/calendar-json.googleapis.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 ml-3"
            >
              <ExternalLink className="h-3 w-3" />
              Ativar Calendar API
            </a>
          </>
        }
      />

      {/* Step 2 */}
      <Step
        n={2}
        title="Configurar tela de consentimento OAuth"
        body={
          <>
            <p>
              Configura tela de consentimento OAuth como &ldquo;External&rdquo;, preenche nome do
              app (Sanas Pulse), email de contato. Marca os 3 escopos:{" "}
              <code className="px-1 bg-slate-100 rounded">userinfo.email</code>,{" "}
              <code className="px-1 bg-slate-100 rounded">calendar</code>,{" "}
              <code className="px-1 bg-slate-100 rounded">calendar.events</code>. No final clica{" "}
              <strong>&ldquo;Publicar app&rdquo;</strong> (senão fica em modo Testing e só você
              consegue conectar).
            </p>
            <a
              href="https://console.cloud.google.com/apis/credentials/consent"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800"
            >
              <ExternalLink className="h-3 w-3" />
              Abrir tela de consentimento
            </a>
          </>
        }
      />

      {/* Step 3 */}
      <Step
        n={3}
        title="Criar credenciais OAuth 2.0"
        body={
          <>
            <p>
              Cria <strong>ID do cliente OAuth</strong>, tipo
              <strong> &ldquo;Aplicativo da Web&rdquo;</strong>. Em &ldquo;URIs de redirecionamento
              autorizados&rdquo; cola este endereço:
            </p>
            <div className="flex items-center gap-2 mt-1">
              <code className="flex-1 px-2 py-1.5 text-[11px] bg-slate-100 rounded border border-slate-200 break-all">
                {redirectUri}
              </code>
              <button
                onClick={() => copy(redirectUri, "URI")}
                className="inline-flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 border border-indigo-200 rounded hover:bg-indigo-50"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                Copiar
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Salva e copia o <strong>Client ID</strong> e <strong>Client Secret</strong> que
              aparecerem — vai precisar deles no próximo passo.
            </p>
            <a
              href="https://console.cloud.google.com/apis/credentials/oauthclient"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800"
            >
              <ExternalLink className="h-3 w-3" />
              Abrir &ldquo;Criar credencial OAuth&rdquo;
            </a>
          </>
        }
      />

      {/* Step 4 */}
      <Step
        n={4}
        title="Adicionar credenciais na Vercel"
        body={
          <>
            <p>
              Vai nas Environment Variables da Vercel e cria 2 variáveis (em Production + Preview):
            </p>
            <ul className="text-[11px] mt-1 space-y-0.5">
              <li>
                <code className="px-1 bg-slate-100 rounded">GOOGLE_CLIENT_ID</code> = (cola o Client
                ID)
              </li>
              <li>
                <code className="px-1 bg-slate-100 rounded">GOOGLE_CLIENT_SECRET</code> = (cola o
                Client Secret)
              </li>
            </ul>
            <a
              href={vercelEnvUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800"
            >
              <ExternalLink className="h-3 w-3" />
              Abrir Environment Variables da Vercel
            </a>
            <p className="text-[11px] text-slate-500 mt-1">
              Depois de salvar, a Vercel vai pedir Redeploy — clica nele. Em ~1min essa tela vira o
              botão &ldquo;Conectar Google Calendar&rdquo; normal.
            </p>
          </>
        }
      />

      <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100">
        Após Vercel finalizar o redeploy, recarregue esta página (F5).
      </div>
    </div>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: React.ReactNode }) {
  return (
    <div className="flex gap-3 p-3 bg-slate-50 border border-slate-100 rounded-xl">
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
        {n}
      </div>
      <div className="flex-1 space-y-1.5">
        <p className="text-sm font-semibold text-slate-900">{title}</p>
        <div className="text-xs text-slate-600 space-y-1.5">{body}</div>
      </div>
    </div>
  );
}
