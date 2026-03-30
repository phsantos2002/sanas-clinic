"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, X, Image as ImageIcon, Film, Plus } from "lucide-react";

type SingleUploadProps = {
  mode: "single";
  accept: string;
  value: string | null;
  onChange: (url: string | null, file?: File) => void;
  hint?: string;
  maxSizeMB?: number;
};

type MultiUploadProps = {
  mode: "multi";
  accept: string;
  value: string[];
  onChange: (urls: string[]) => void;
  hint?: string;
  maxFiles?: number;
  maxSizeMB?: number;
};

type FileUploadProps = SingleUploadProps | MultiUploadProps;

export function FileUpload(props: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(async (file: File): Promise<string | null> => {
    const maxSize = (props.maxSizeMB || 100) * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`Arquivo muito grande. Maximo ${props.maxSizeMB || 100}MB.`);
      return null;
    }

    const form = new FormData();
    form.append("file", file);

    const res = await fetch("/api/upload", { method: "POST", body: form });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Erro ao enviar arquivo");
      return null;
    }

    const data = await res.json();
    return data.url as string;
  }, [props.maxSizeMB]);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      setUploading(true);

      if (props.mode === "single") {
        const file = files[0];
        if (!file) { setUploading(false); return; }
        const url = await uploadFile(file);
        if (url) props.onChange(url, file);
      } else {
        const maxFiles = props.maxFiles || 10;
        const filesToUpload = Array.from(files).slice(
          0,
          maxFiles - props.value.length
        );
        const urls: string[] = [];
        for (const file of filesToUpload) {
          const url = await uploadFile(file);
          if (url) urls.push(url);
        }
        if (urls.length > 0) {
          props.onChange([...props.value, ...urls]);
        }
      }

      setUploading(false);
    },
    [props, uploadFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const isImage = props.accept.includes("image");
  const isVideo = props.accept.includes("video");

  // Single mode
  if (props.mode === "single") {
    const hasValue = !!props.value;

    if (hasValue) {
      const isVideoUrl = props.value!.match(/\.(mp4|mov|webm)$/i) || isVideo;
      return (
        <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
          {isVideoUrl ? (
            <video
              src={props.value!}
              className="w-full h-40 object-cover"
              controls
              muted
            />
          ) : (
            <img
              src={props.value!}
              alt="Preview"
              className="w-full h-40 object-cover"
            />
          )}
          <button
            onClick={() => props.onChange(null)}
            className="absolute top-2 right-2 h-7 w-7 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-sm hover:bg-white"
          >
            <X className="h-3.5 w-3.5 text-slate-600" />
          </button>
        </div>
      );
    }

    return (
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
          dragOver
            ? "border-indigo-400 bg-indigo-50"
            : "border-slate-200 hover:border-slate-300 bg-slate-50"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={props.accept}
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
          }}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-slate-500">Enviando...</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            {isVideo ? (
              <Film className="h-8 w-8 text-slate-300" />
            ) : (
              <ImageIcon className="h-8 w-8 text-slate-300" />
            )}
            <div>
              <p className="text-sm text-slate-600 font-medium">
                Arraste ou clique para enviar
              </p>
              {props.hint && (
                <p className="text-xs text-slate-400 mt-0.5">{props.hint}</p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Multi mode
  const maxFiles = props.maxFiles || 10;
  const canAddMore = props.value.length < maxFiles;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {props.value.map((url, i) => (
          <div
            key={i}
            className="relative aspect-square rounded-xl overflow-hidden border border-slate-200"
          >
            <img src={url} alt={`Slide ${i + 1}`} className="w-full h-full object-cover" />
            <button
              onClick={() => {
                props.onChange(props.value.filter((_, idx) => idx !== i));
              }}
              className="absolute top-1 right-1 h-6 w-6 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-sm hover:bg-white"
            >
              <X className="h-3 w-3 text-slate-600" />
            </button>
            <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-full">
              {i + 1}
            </span>
          </div>
        ))}

        {canAddMore && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            className={`aspect-square border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all ${
              dragOver
                ? "border-indigo-400 bg-indigo-50"
                : "border-slate-200 hover:border-slate-300 bg-slate-50"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept={props.accept}
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) handleFiles(e.target.files);
              }}
            />
            {uploading ? (
              <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Plus className="h-6 w-6 text-slate-300" />
                <span className="text-[10px] text-slate-400 mt-1">
                  {props.value.length}/{maxFiles}
                </span>
              </>
            )}
          </div>
        )}
      </div>
      {props.hint && (
        <p className="text-xs text-slate-400">{props.hint}</p>
      )}
    </div>
  );
}
