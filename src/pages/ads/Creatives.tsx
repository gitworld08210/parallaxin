import { useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Image as ImageIcon, Loader2, Upload, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthProvider";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useCreatives } from "@/hooks/ads/useAdsEntities";

const MAX_IMAGE = 10 * 1024 * 1024;
const MAX_VIDEO = 100 * 1024 * 1024;

export default function Creatives() {
  const { accountId } = useParams();
  const { user } = useAuth();
  const { creatives, urls, loading, reload } = useCreatives(accountId);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onPick = async (files: FileList | null) => {
    if (!files?.length || !accountId || !user) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const isVideo = file.type.startsWith("video/");
        const isImage = file.type.startsWith("image/");
        if (!isVideo && !isImage) {
          toast.error(`${file.name}: only images and videos`);
          continue;
        }
        if (file.size > (isVideo ? MAX_VIDEO : MAX_IMAGE)) {
          toast.error(`${file.name}: too large (max ${isVideo ? "100MB" : "10MB"})`);
          continue;
        }
        const ext = file.name.split(".").pop() ?? (isVideo ? "mp4" : "jpg");
        const path = `${accountId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("ads-creatives")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) throw upErr;

        const { error } = await supabase.from("ads_creatives").insert({
          account_id: accountId,
          name: file.name.slice(0, 80),
          media_type: isVideo ? "video" : "image",
          storage_path: path,
          uploaded_by: user.id,
        });
        if (error) throw error;
      }
      toast.success("Creative uploaded");
      await reload();
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Creatives</h1>
          <p className="text-xs text-muted-foreground">
            Reels &amp; Stories: 9:16 video. Feed: 1:1 or 4:5. Explore: 1:1.
          </p>
        </div>
        <Button className="gap-1.5" disabled={uploading} onClick={() => inputRef.current?.click()}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          hidden
          onChange={(e) => onPick(e.target.files)}
        />
      </div>

      {loading ? (
        <div className="grid place-items-center py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : creatives.length === 0 ? (
        <Card className="grid place-items-center gap-2 p-10 text-center">
          <ImageIcon className="h-6 w-6 text-muted-foreground" />
          <p className="text-sm font-medium">No creatives yet</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Apni ad ke liye image ya video upload kariye — wizard me yahi assets choose honge.
          </p>
          <Button size="sm" className="mt-2" onClick={() => inputRef.current?.click()}>
            Upload media
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {creatives.map((c) => (
            <Card key={c.id} className="overflow-hidden">
              <div className="aspect-square bg-muted">
                {c.media_type === "video" ? (
                  <video src={urls[c.id]} className="h-full w-full object-cover" muted playsInline />
                ) : (
                  <img src={urls[c.id]} alt={c.name} loading="lazy" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="space-y-1 p-2">
                <p className="truncate text-xs font-medium">{c.name}</p>
                <Badge variant="outline" className="gap-1 text-[10px]">
                  {c.media_type === "video" ? <Video className="h-3 w-3" /> : <ImageIcon className="h-3 w-3" />}
                  {c.media_type}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
