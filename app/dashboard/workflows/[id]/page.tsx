import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/app/actions/user";
import { WorkflowEditorClient } from "./WorkflowEditorClient";

export default async function WorkflowEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [workflow, stages] = await Promise.all([
    prisma.workflow.findFirst({
      where: { id, userId: user.id },
    }),
    prisma.stage.findMany({
      where: { userId: user.id },
      orderBy: { order: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!workflow) redirect("/dashboard/workflows");

  const canvas = (workflow.canvas as { nodes: unknown[]; edges: unknown[] }) || {
    nodes: [],
    edges: [],
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900">{workflow.name}</h1>
          <p className="text-xs text-slate-400">{workflow.description || "Sem descricao"}</p>
        </div>
      </div>
      <WorkflowEditorClient
        workflowId={workflow.id}
        initialNodes={canvas.nodes as never[]}
        initialEdges={canvas.edges as never[]}
        stages={stages}
      />
    </div>
  );
}
