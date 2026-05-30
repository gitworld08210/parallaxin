import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Shield, ShieldOff, Search } from "lucide-react";

type Profile = { user_id: string; username: string; display_name: string; avatar_url: string | null };
type Role = "admin" | "moderator" | "user";

const UsersRolesAdmin = () => {
  const [q, setQ] = useState("");
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [rolesMap, setRolesMap] = useState<Record<string, Role[]>>({});

  const search = async () => {
    const query = supabase.from("profiles").select("user_id, username, display_name, avatar_url").limit(25);
    const { data } = q.trim()
      ? await query.ilike("username", `%${q.trim()}%`)
      : await query.order("created_at", { ascending: false });
    const list = (data as Profile[]) || [];
    setProfiles(list);
    if (list.length) {
      const { data: rd } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", list.map((p) => p.user_id));
      const map: Record<string, Role[]> = {};
      ((rd as any[]) || []).forEach((r) => {
        map[r.user_id] = [...(map[r.user_id] || []), r.role];
      });
      setRolesMap(map);
    } else {
      setRolesMap({});
    }
  };

  useEffect(() => { search(); }, []);

  const toggleRole = async (user_id: string, role: Role) => {
    const has = (rolesMap[user_id] || []).includes(role);
    if (has) {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", user_id).eq("role", role);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("user_roles").insert({ user_id, role });
      if (error) return toast.error(error.message);
    }
    toast.success("Updated");
    search();
  };

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Users & Roles</h1>
        <p className="text-sm text-muted-foreground">Grant or revoke admin and moderator roles.</p>
      </header>
      <div className="flex gap-2 mb-5">
        <div className="flex-1 flex items-center gap-2 bg-secondary/60 border border-border rounded-xl px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="Search username…"
            className="flex-1 bg-transparent py-2.5 text-sm outline-none"
          />
        </div>
        <button onClick={search} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">Search</button>
      </div>

      <div className="space-y-2">
        {profiles.map((p) => {
          const roles = rolesMap[p.user_id] || [];
          const isAdmin = roles.includes("admin");
          const isMod = roles.includes("moderator");
          return (
            <article key={p.user_id} className="rounded-2xl border border-border bg-card/60 p-3 flex items-center gap-3">
              {p.avatar_url ? (
                <img src={p.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <div className="h-10 w-10 rounded-full bg-muted grid place-items-center text-xs font-bold">
                  {p.username?.[0]?.toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">@{p.username}</p>
                <p className="text-xs text-muted-foreground truncate">{p.display_name}</p>
              </div>
              <button
                onClick={() => toggleRole(p.user_id, "moderator")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${isMod ? "bg-amber-500/20 text-amber-400" : "bg-muted/40 text-muted-foreground"}`}
              >
                {isMod ? "Moderator" : "+ Mod"}
              </button>
              <button
                onClick={() => toggleRole(p.user_id, "admin")}
                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold ${isAdmin ? "bg-primary/20 text-primary" : "bg-muted/40 text-muted-foreground"}`}
              >
                {isAdmin ? <><Shield className="h-3 w-3" /> Admin</> : <><ShieldOff className="h-3 w-3" /> Make admin</>}
              </button>
            </article>
          );
        })}
        {profiles.length === 0 && <p className="text-sm text-muted-foreground">No users found.</p>}
      </div>
    </div>
  );
};

export default UsersRolesAdmin;
