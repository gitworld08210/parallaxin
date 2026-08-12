import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Plus, 
  Search, 
  Grid, 
  List, 
  MoreVertical, 
  Play, 
  Trash2, 
  Upload,
  Image as ImageIcon,
  Video,
  FileText
} from "lucide-react";
import { useCreatives } from "@/hooks/ads/useAdsEntities";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export default function Creatives() {
  const { accountId } = useParams();
  const { creatives, urls, loading, reload } = useCreatives(accountId);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !accountId) return;

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${accountId}/${crypto.randomUUID()}.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from("ads-creatives")
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from("ads_creatives").insert({
        account_id: accountId,
        name: file.name,
        media_type: file.type.startsWith("video") ? "video" : "image",
        storage_path: path,
        aspect_ratio: "1:1", // We would ideally detect this
      });

      if (dbError) throw dbError;

      toast.success("Creative uploaded successfully");
      reload();
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload creative");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl animate-in fade-in duration-500">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white mb-1">Creatives</h1>
          <p className="text-sm text-muted-foreground">Manage your visual assets and ad media</p>
        </div>
        
        <label className={cn(
          "flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white shadow-glow transition hover:brightness-110 cursor-pointer",
          uploading && "opacity-50 pointer-events-none"
        )}>
          <Upload className="h-4.5 w-4.5" />
          {uploading ? "Uploading..." : "Upload Asset"}
          <input type="file" className="hidden" accept="image/*,video/*" onChange={handleUpload} />
        </label>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/5 px-3 py-1.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Search assets..." 
            className="bg-transparent border-none text-sm focus:ring-0 text-white w-60"
          />
        </div>

        <div className="flex items-center gap-1 rounded-xl bg-white/5 p-1 border border-white/5">
          <button 
            onClick={() => setView("grid")}
            className={cn("p-1.5 rounded-lg transition", view === "grid" ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white")}
          >
            <Grid className="h-4 w-4" />
          </button>
          <button 
            onClick={() => setView("list")}
            className={cn("p-1.5 rounded-lg transition", view === "list" ? "bg-white/10 text-white" : "text-muted-foreground hover:text-white")}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1,2,3,4,5,6,7,8].map(i => (
            <div key={i} className="aspect-square rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : creatives.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-3xl border border-dashed border-white/10">
          <div className="h-20 w-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
            <ImageIcon className="h-10 w-10 text-muted-foreground opacity-20" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No assets yet</h3>
          <p className="text-muted-foreground max-w-xs mx-auto mb-8">
            Upload images or videos to start building your campaign creatives.
          </p>
          <Button variant="outline" className="rounded-xl border-white/10 text-white">
            Learn about creative specs
          </Button>
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {creatives.map(c => (
            <div key={c.id} className="group relative aspect-square overflow-hidden rounded-2xl border border-white/5 bg-[#0f0f0f] transition hover:border-primary/50">
              {c.media_type === "image" ? (
                <img src={urls[c.id]} alt={c.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
              ) : (
                <div className="relative h-full w-full">
                  <video src={urls[c.id]} className="h-full w-full object-cover" />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <Play className="h-10 w-10 text-white fill-current" />
                  </div>
                </div>
              )}
              
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <p className="text-sm font-bold text-white truncate mb-0.5">{c.name}</p>
                  <p className="text-[10px] text-white/60 font-medium uppercase tracking-widest">{c.media_type} • {c.aspect_ratio}</p>
                </div>
                <button className="absolute top-3 right-3 h-8 w-8 flex items-center justify-center rounded-lg bg-black/50 text-white/80 hover:text-white hover:bg-rose-500 transition">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-white/5 bg-[#0f0f0f] overflow-hidden">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-white/[0.02] border-b border-white/5">
              <tr>
                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Preview</th>
                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Name</th>
                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Type</th>
                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Ratio</th>
                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Date Added</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {creatives.map(c => (
                <tr key={c.id} className="group hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-3">
                    <div className="h-12 w-12 rounded-lg overflow-hidden border border-white/5">
                      {c.media_type === "image" ? (
                        <img src={urls[c.id]} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full bg-primary/20 flex items-center justify-center">
                          <Video className="h-6 w-6 text-primary" />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-3 font-bold text-white">{c.name}</td>
                  <td className="px-6 py-3">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground border border-white/5">
                      {c.media_type === "image" ? <ImageIcon className="h-3 w-3" /> : <Video className="h-3 w-3" />}
                      {c.media_type}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-muted-foreground font-medium">{c.aspect_ratio}</td>
                  <td className="px-6 py-3 text-muted-foreground font-medium">{new Date(c.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-3 text-right">
                    <button className="p-2 text-muted-foreground hover:text-rose-500 transition">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}