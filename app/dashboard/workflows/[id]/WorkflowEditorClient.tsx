"use client";

import { WorkflowCanvas, type CanvasEdge } from "@/components/workflows/WorkflowCanvas";
import type { CanvasNode } from "@/components/workflows/WorkflowNode";
import { saveWorkflowCanvas } from "@/app/actions/workflows";

type Props = {
  workflowId: string;
  initialNodes: CanvasNode[];
  initialEdges: CanvasEdge[];
  stages: { id: string; name: string }[];
};

export function WorkflowEditorClient({ workflowId, initialNodes, initialEdges, stages }: Props) {
  const handleSave = async (nodes: CanvasNode[], edges: CanvasEdge[]) => {
    await saveWorkflowCanvas(workflowId, { nodes, edges });
  };

  return (
    <WorkflowCanvas
      workflowId={workflowId}
      initialNodes={initialNodes}
      initialEdges={initialEdges}
      stages={stages}
      onSave={handleSave}
    />
  );
}
