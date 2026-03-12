"use client";

import { useState } from "react";
import { Plus, Trash2, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { createTag, deleteTag } from "@/app/actions/tags";
import { toast } from "sonner";
import type { Tag as TagType } from "@/types";

type Props = {
  tags: TagType[];
};

export function ManageTagsModal({ tags: initialTags }: Props) {
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState(initialTags);
  const [newTag, setNewTag] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTag.trim()) return;

    setLoading(true);
    const result = await createTag(newTag.trim());
    setLoading(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    if (result.data) {
      setTags((prev) => [...prev, result.data!]);
    }
    setNewTag("");
    toast.success("Tag criada");
  }

  async function handleDelete(tagId: string) {
    const result = await deleteTag(tagId);
    if (result.success) {
      setTags((prev) => prev.filter((t) => t.id !== tagId));
      toast.success("Tag removida");
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Tag className="h-4 w-4" />
          Tags
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gerenciar Tags</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreate} className="flex gap-2">
          <Input
            placeholder="Nome da tag"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
          />
          <Button type="submit" size="sm" disabled={loading}>
            <Plus className="h-4 w-4" />
          </Button>
        </form>

        <div className="flex flex-wrap gap-2 mt-2">
          {tags.length === 0 && (
            <p className="text-sm text-slate-500">Nenhuma tag criada.</p>
          )}
          {tags.map((tag) => (
            <div key={tag.id} className="flex items-center gap-1">
              <Badge variant="secondary">{tag.name}</Badge>
              <button
                onClick={() => handleDelete(tag.id)}
                className="text-slate-400 hover:text-red-600 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
