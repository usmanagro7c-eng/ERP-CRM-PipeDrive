import { useRef, useState } from "react";
import { Download, File, Loader2, Paperclip, Plus, Trash2 } from "lucide-react";
import { queryOptions, useQuery } from "@tanstack/react-query";
import type { CrmAttachment } from "@/lib/api";

import { Button } from "@/components/ui/button";
import {
  attachmentsListOptions,
  useUploadAttachment,
  useDeleteAttachment,
} from "@/hooks/use-attachments";

interface RecordAttachmentsTabProps {
  referenceDoctype: string;
  referenceName: string;
  secondaryReference?: { doctype: string; name: string } | null;
}

export function RecordAttachmentsTab({
  referenceDoctype,
  referenceName,
  secondaryReference,
}: RecordAttachmentsTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: primary = [] } = useQuery(attachmentsListOptions(referenceDoctype, referenceName));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: secondary = [] } = useQuery(
    (secondaryReference
      ? attachmentsListOptions(secondaryReference.doctype, secondaryReference.name)
      : queryOptions({
          queryKey: ["attachments", "none"],
          queryFn: async () => [],
          enabled: false,
        })) as any, // eslint-disable-line @typescript-eslint/no-explicit-any
  );
  const sec = (secondary ?? []) as CrmAttachment[];
  const attachments = [...primary, ...sec.filter((s) => !primary.some((p) => p.name === s.name))];
  const uploadMutation = useUploadAttachment(referenceDoctype, referenceName);
  const deleteMutation = useDeleteAttachment(referenceDoctype, referenceName);

  const [isDragging, setIsDragging] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await uploadMutation.mutateAsync(file);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      // handled by hook
    }
  }

  async function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    try {
      await uploadMutation.mutateAsync(file);
    } catch {
      // handled by hook
    }
  }

  function formatFileSize(bytes?: number) {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="flex flex-col h-full min-h-[460px] max-w-4xl px-1 sm:px-4">
      {/* Attachments Header matching Frappe CRM */}
      <div className="flex shrink-0 items-center justify-between pb-4 pt-2">
        <h2 className="text-2xl font-semibold text-foreground">Attachments</h2>
        <Button
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadMutation.isPending}
          className="h-7 text-xs font-medium px-2.5 rounded-md gap-1 bg-white text-black hover:bg-neutral-200 dark:bg-white dark:text-black cursor-pointer shadow-xs"
        >
          {uploadMutation.isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Plus className="size-3.5" />
          )}
          <span>Upload Attachment</span>
        </Button>
        <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" />
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors mb-5 ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border/70 hover:border-muted-foreground/50 bg-card/40"
        }`}
      >
        <Paperclip className="size-6 text-muted-foreground mx-auto mb-1.5 opacity-60" />
        <p className="text-xs text-foreground font-medium">
          Drag & drop files here, or <span className="text-primary underline">browse</span>
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Attach PDFs, images, spreadsheets, or documents
        </p>
      </div>

      {attachments.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-20 select-none">
          <div className="flex items-center justify-center size-14 rounded-full mb-2">
            <Paperclip className="size-10 stroke-[1.2] text-muted-foreground/45" />
          </div>
          <p className="text-sm font-medium text-foreground">No Attachments Found</p>
          <p className="text-xs text-muted-foreground mt-1">
            No files have been attached yet. Upload files to see them here.
          </p>
        </div>
      ) : (
        <div className="space-y-2 pb-8">
          {attachments.map((att) => (
            <div
              key={att.name}
              className="group flex items-center justify-between rounded-lg border bg-card p-3 text-xs shadow-2xs hover:border-primary/40 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-foreground">
                  <File className="size-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-foreground truncate">{att.file_name}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {formatFileSize(att.file_size)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {att.file_url && (
                  <Button
                    asChild
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-foreground"
                    title="Download file"
                  >
                    <a href={att.file_url} target="_blank" rel="noopener noreferrer" download>
                      <Download className="size-3.5" />
                    </a>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteMutation.mutate(att.name)}
                  disabled={deleteMutation.isPending}
                  className="size-7 text-muted-foreground hover:text-destructive"
                  title="Delete file"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
