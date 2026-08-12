import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  Play, 
  Pause, 
  Trash2, 
  ExternalLink,
  ChevronRight,
  TrendingUp,
  BarChart2
} from "lucide-react";
import { useAdsEntities } from "@/hooks/ads/useAdsEntities";
import { fmtCoins, fmtCompact, statusTone, OBJECTIVES } from "@/features/ads/lib";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function Manager() {
  const { accountId } = useParams();
  const { campaigns, adsets, ads, loading, setStatus } = useAdsEntities(accountId);
  const [activeTab, setActiveTab] = useState("campaigns");
  const [searchQuery, setSearchQuery] = useState("");

  const handleToggleStatus = async (level: any, id: string, current: string) => {
    const next = current === "active" ? "paused" : "active";
    try {
      await setStatus(level, id, next);
      toast.success(`${level.charAt(0).toUpperCase() + level.slice(1)} ${next}`);
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const filteredData = () => {
    const list = activeTab === "campaigns" ? campaigns : activeTab === "adsets" ? adsets : ads;
    if (!searchQuery) return list;
    return list.filter((item: any) => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  return (
    <div className="mx-auto max-w-7xl animate-in fade-in duration-500">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white mb-1">Manage Ads</h1>
          <p className="text-sm text-muted-foreground">Monitor and optimize your campaign delivery</p>
        </div>
        
        <Link 
          to={`/ads/${accountId}/create`}
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white shadow-glow transition hover:brightness-110"
        >
          <Plus className="h-4.5 w-4.5" />
          New Campaign
        </Link>
      </div>

      <div className="mb-6 overflow-hidden rounded-2xl border border-white/5 bg-[#0f0f0f]">
        <div className="flex flex-wrap items-center justify-between border-b border-white/5 px-4 py-3 gap-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-auto">
            <TabsList className="bg-white/5 h-9 p-1">
              <TabsTrigger value="campaigns" className="data-[state=active]:bg-primary data-[state=active]:text-white text-xs px-4 rounded-lg">
                Campaigns ({campaigns.length})
              </TabsTrigger>
              <TabsTrigger value="adsets" className="data-[state=active]:bg-primary data-[state=active]:text-white text-xs px-4 rounded-lg">
                Ad Sets ({adsets.length})
              </TabsTrigger>
              <TabsTrigger value="ads" className="data-[state=active]:bg-primary data-[state=active]:text-white text-xs px-4 rounded-lg">
                Ads ({ads.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/5 px-3 py-1.5 focus-within:border-primary/50 transition">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none text-sm focus:ring-0 text-white w-40 md:w-60"
              />
            </div>
            <Button variant="outline" size="sm" className="bg-white/5 border-white/5 text-white hover:bg-white/10 rounded-xl">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02]">
                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Name</th>
                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Status</th>
                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Objective / Goal</th>
                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Budget</th>
                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Performance</th>
                <th className="px-6 py-4 font-bold text-muted-foreground uppercase tracking-widest text-[10px]"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                [1,2,3].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-6 py-8"><div className="h-4 bg-white/5 rounded w-1/2" /></td>
                  </tr>
                ))
              ) : filteredData().length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    No {activeTab} found
                  </td>
                </tr>
              ) : (
                filteredData().map((item: any) => (
                  <tr key={item.id} className="group hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => handleToggleStatus(
                            activeTab.slice(0, -1),
                            item.id,
                            item.status
                          )}
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-lg transition",
                            item.status === "active" ? "bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30" : "bg-white/5 text-muted-foreground hover:bg-white/10"
                          )}
                        >
                          {item.status === "active" ? <Play className="h-3.5 w-3.5 fill-current" /> : <Pause className="h-3.5 w-3.5" />}
                        </button>
                        <div>
                          <p className="font-bold text-white group-hover:text-primary transition-colors cursor-pointer">{item.name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono mt-0.5 uppercase tracking-tighter">ID: {item.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border",
                        statusTone(item.status)
                      )}>
                        {item.status}
                      </span>
                      {activeTab === "ads" && item.review_state !== "approved" && (
                         <div className="mt-1">
                           <span className="text-[9px] text-amber-500/80 font-bold uppercase tracking-widest">Review: {item.review_state}</span>
                         </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-white font-medium">
                          {activeTab === "campaigns" 
                            ? OBJECTIVES.find(o => o.id === item.objective)?.label 
                            : activeTab === "adsets" 
                              ? item.optimization_goal 
                              : "Review: " + item.review_state
                          }
                        </span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">{activeTab}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-white font-bold tabular-nums">
                          {fmtCoins(activeTab === "campaigns" ? item.budget_coins : item.daily_budget_coins || 0)}
                        </span>
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                          {activeTab === "campaigns" ? item.budget_type : "Daily"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex items-center gap-4">
                         <div className="flex flex-col">
                           <span className="text-[10px] text-muted-foreground uppercase tracking-widest mb-0.5">Impressions</span>
                           <span className="text-xs font-bold text-white tabular-nums">--</span>
                         </div>
                         <div className="flex flex-col">
                           <span className="text-[10px] text-muted-foreground uppercase tracking-widest mb-0.5">CTR</span>
                           <span className="text-xs font-bold text-white tabular-nums">--</span>
                         </div>
                         <TrendingUp className="h-4 w-4 text-emerald-500 opacity-20" />
                       </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-white hover:bg-white/5 rounded-lg h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#141414] border-white/10 text-white w-48">
                          <DropdownMenuItem className="focus:bg-primary focus:text-white gap-2 cursor-pointer">
                            <BarChart2 className="h-4 w-4" /> View Insights
                          </DropdownMenuItem>
                          <DropdownMenuItem className="focus:bg-primary focus:text-white gap-2 cursor-pointer">
                            <ExternalLink className="h-4 w-4" /> Edit Campaign
                          </DropdownMenuItem>
                          <div className="h-px bg-white/5 my-1" />
                          <DropdownMenuItem className="focus:bg-destructive/20 focus:text-destructive text-destructive gap-2 cursor-pointer">
                            <Trash2 className="h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}