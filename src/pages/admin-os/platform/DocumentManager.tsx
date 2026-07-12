import { useRef, useState } from "react";
import { Upload, FileText } from "lucide-react";
import { toast } from "sonner";
import {
  useDocuments,
  useUploadDocument,
} from "@/hooks/platform/usePlatform";
import { documents as documentsService } from "@/services/platform/platform";

const DocumentManager = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const { data: list = [] } = useDocuments();
  const upload = useUploadDocument();

  const handleFile = (file: File) => {
    upload.mutate(
      { name: name || file.name, file },
      {
        onSuccess: () => {
          toast.success("Uploaded");
          setName("");
          if (inputRef.current) inputRef.current.value = "";
        },
        onError: (e: unknown) =>
          toast.error(e instanceof Error ? e.message : "Upload failed"),
      },
    );
  };

  const openDoc = async (path?: string | null) => {
    if (!path) return;
    try {
      const url = await documentsService.signedUrl(path);
      window.open(url, "_blank");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to open");
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-bold tracking-[0.2em] text-primary">AURELIX · PLATFORM</p>
        <h1 className="mt-1 text-2xl font-bold text-foreground">Document Manager</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Single document platform with version history and per-doc access.
        </p>
      </header>

      <div className="rounded-xl border border-border/60 bg-card p-4">
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Optional display name"
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm"
          />
          <input
            ref={inputRef}
            type="file"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            className="hidden"
          />
          <button
            onClick={() => inputRef.current?.click()}
            disabled={upload.isPending}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            <Upload className="h-4 w-4" />
            {upload.isPending ? "Uploading…" : "Upload"}
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {list.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No documents yet.
          </div>
        )}
        {list.map((d) => (
          <button
            key={d.id}
            onClick={() => openDoc(d.storage_path)}
            className="flex w-full items-center gap-3 rounded-lg border border-border/60 bg-card p-3 text-left hover:border-primary/40"
          >
            <FileText className="h-5 w-5 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{d.name}</p>
              <p className="text-xs text-muted-foreground">
                v{d.current_version} · {d.category ?? "—"} ·{" "}
                {new Date(d.updated_at).toLocaleDateString()}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
export default DocumentManager;
