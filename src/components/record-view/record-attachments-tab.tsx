import { useRef, useState } from "react";
import { Download, File, Loader2, Paperclip, Plus, Trash2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  attachmentsListOptions,
  useUploadAttachment,
  useDeleteAttachment,
} from "@/hooks/use-attachments";

interface RecordAttachmentsTabProps {
  referenceDoctype: string;
  referenceName: string;
}

export function RecordAttachmentsTab({
  referenceDoctype,
  referenceName,
}: RecordAttachmentsTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: attachments = [], isLoading } = useQuery(
    attachmentsListOptions(referenceDoctype, referenceName),
  );
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
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Attachments ({attachments.length})</h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadMutation.isPending}
          className="h-7 text-xs gap-1"
        >
          {uploadMutation.isPending ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Plus className="size-3" />
          )}
          <span>Upload File</span>
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          className="hidden"
        />
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
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border hover:border-muted-foreground/50 bg-card/50"
        }`}
      >
        <Paperclip className="size-8 mx-auto text-muted-foreground/50 mb-2" />
        <p className="text-xs font-medium text-foreground">
          Drag & drop files here, or click to browse
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          PDF, Images, Excel, Word documents supported
        </p>
      </div>

      {/* Attachments List */}
      {attachments.length === 0 ? (
        <div className="py-8 text-center text-xs text-muted-foreground">
          No files attached to this record yet.
        </div>
      ) : (
        <div className="divide-y divide-border rounded-lg border bg-card overflow-hidden">
          {attachments.map((file) => (
            <div
              key={file.name}
              className="flex items-center justify-between p-3 text-xs hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <File className="size-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{file.file_name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatFileSize(file.file_size)} • {file.creation?.split(" ")[0]}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  asChild
                  variant="ghost"
                  size="icon"
                  className="size-7 text-muted-foreground hover:text-foreground"
                >
                  <a href={file.file_url} target="_blank" rel="noreferrer" download title="Download">
                    <Download className="size-3.5" />
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteMutation.mutate(file.name)}
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
