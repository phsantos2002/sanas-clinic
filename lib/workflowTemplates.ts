import type { CanvasNode } from "@/components/workflows/WorkflowNode";
import type { CanvasEdge } from "@/components/workflows/WorkflowCanvas";

export type WorkflowTemplate = {
  id: string;
  name: string;
  description: string;
  emoji: string;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
};

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: "welcome-ai",
    name: "Boas-vindas com IA",
    description: "Envia mensagem de boas-vindas personalizada quando um novo lead chega",
    emoji: "👋",
    nodes: [
      {
        id: "t1",
        type: "trigger",
        subtype: "new_lead",
        position: { x: 50, y: 100 },
        config: {},
        label: "Novo Lead",
      },
      {
        id: "a1",
        type: "action",
        subtype: "delay",
        position: { x: 350, y: 100 },
        config: { minutes: 5 },
        label: "Aguardar 5min",
      },
      {
        id: "a2",
        type: "action",
        subtype: "send_whatsapp",
        position: { x: 650, y: 100 },
        config: {
          message: "Ola {{nome}}! Seja bem-vindo(a) a {{clinica}}! Como posso ajudar voce hoje?",
        },
        label: "Enviar Boas-vindas",
      },
    ],
    edges: [
      { id: "e1", sourceNodeId: "t1", targetNodeId: "a1", sourcePort: "default" },
      { id: "e2", sourceNodeId: "a1", targetNodeId: "a2", sourcePort: "default" },
    ],
  },
  {
    id: "follow-up-24h",
    name: "Follow-up 24h",
    description: "Envia follow-up se o lead nao respondeu em 24 horas",
    emoji: "⏰",
    nodes: [
      {
        id: "t1",
        type: "trigger",
        subtype: "new_lead",
        position: { x: 50, y: 100 },
        config: {},
        label: "Novo Lead",
      },
      {
        id: "a1",
        type: "action",
        subtype: "delay",
        position: { x: 350, y: 100 },
        config: { minutes: 1440 },
        label: "Aguardar 24h",
      },
      {
        id: "a2",
        type: "action",
        subtype: "send_whatsapp",
        position: { x: 650, y: 100 },
        config: {
          message:
            "Oi {{nome}}, tudo bem? Vi que voce entrou em contato com a gente. Posso te ajudar com algo?",
        },
        label: "Follow-up",
      },
    ],
    edges: [
      { id: "e1", sourceNodeId: "t1", targetNodeId: "a1", sourcePort: "default" },
      { id: "e2", sourceNodeId: "a1", targetNodeId: "a2", sourcePort: "default" },
    ],
  },
  {
    id: "reactivation-30d",
    name: "Reativacao 30 dias",
    description: "Reativa leads inativos ha 30 dias com mensagem personalizada",
    emoji: "🔄",
    nodes: [
      {
        id: "t1",
        type: "trigger",
        subtype: "new_lead",
        position: { x: 50, y: 100 },
        config: {},
        label: "Lead Inativo",
      },
      {
        id: "a1",
        type: "action",
        subtype: "send_whatsapp",
        position: { x: 350, y: 100 },
        config: {
          message:
            "Oi {{nome}}! Faz um tempo que nao nos falamos. Temos novidades incriveis na {{clinica}}! Quer saber mais?",
        },
        label: "Reativacao",
      },
      {
        id: "a2",
        type: "action",
        subtype: "delay",
        position: { x: 650, y: 100 },
        config: { minutes: 2880 },
        label: "Aguardar 48h",
      },
      {
        id: "a3",
        type: "action",
        subtype: "add_tag",
        position: { x: 950, y: 100 },
        config: { tag: "inativo" },
        label: "Tag Inativo",
      },
    ],
    edges: [
      { id: "e1", sourceNodeId: "t1", targetNodeId: "a1", sourcePort: "default" },
      { id: "e2", sourceNodeId: "a1", targetNodeId: "a2", sourcePort: "default" },
      { id: "e3", sourceNodeId: "a2", targetNodeId: "a3", sourcePort: "default" },
    ],
  },
  {
    id: "hot-lead-detected",
    name: "Lead quente detectado",
    description: "Quando o score ultrapassa 80, notifica e move para etapa de destaque",
    emoji: "🔥",
    nodes: [
      {
        id: "t1",
        type: "trigger",
        subtype: "new_lead",
        position: { x: 50, y: 100 },
        config: {},
        label: "Score Atualizado",
      },
      {
        id: "c1",
        type: "condition",
        subtype: "score_check",
        position: { x: 350, y: 100 },
        config: { operator: "gt", value: 80 },
        label: "Score > 80?",
      },
      {
        id: "a1",
        type: "action",
        subtype: "add_tag",
        position: { x: 650, y: 50 },
        config: { tag: "vip" },
        label: "Tag VIP",
      },
      {
        id: "a2",
        type: "action",
        subtype: "send_whatsapp",
        position: { x: 950, y: 50 },
        config: { message: "{{nome}}, temos algo especial para voce! Quando podemos conversar?" },
        label: "Msg Especial",
      },
    ],
    edges: [
      { id: "e1", sourceNodeId: "t1", targetNodeId: "c1", sourcePort: "default" },
      { id: "e2", sourceNodeId: "c1", targetNodeId: "a1", sourcePort: "yes" },
      { id: "e3", sourceNodeId: "a1", targetNodeId: "a2", sourcePort: "default" },
    ],
  },
  {
    id: "nps-post-purchase",
    name: "NPS pos-procedimento",
    description: "Envia pesquisa de satisfacao 3 dias apos conversao",
    emoji: "⭐",
    nodes: [
      {
        id: "t1",
        type: "trigger",
        subtype: "stage_change",
        position: { x: 50, y: 100 },
        config: {},
        label: "Etapa Fechado",
      },
      {
        id: "a1",
        type: "action",
        subtype: "delay",
        position: { x: 350, y: 100 },
        config: { minutes: 4320 },
        label: "Aguardar 3 dias",
      },
      {
        id: "a2",
        type: "action",
        subtype: "send_whatsapp",
        position: { x: 650, y: 100 },
        config: {
          message:
            "Oi {{nome}}! Como foi sua experiencia com a {{clinica}}? De 0 a 10, qual nota voce daria?",
        },
        label: "Pesquisa NPS",
      },
    ],
    edges: [
      { id: "e1", sourceNodeId: "t1", targetNodeId: "a1", sourcePort: "default" },
      { id: "e2", sourceNodeId: "a1", targetNodeId: "a2", sourcePort: "default" },
    ],
  },
];
