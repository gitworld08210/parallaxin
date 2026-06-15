import { Check, Moon, Sparkles } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useTheme, type Theme } from "@/contexts/ThemeProvider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
};

export const AppearanceSheet = ({ open, onOpenChange }: Props) => {
  const { theme, setTheme } = useTheme();

  const pick = (t: Theme) => {
    setTheme(t);
    toast.success(t === "dark" ? "Switched to Dark" : "Switched to Liquid Glass");
    setTimeout(() => onOpenChange(false), 150);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl bg-background border-t border-border px-5 pt-5 pb-8">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
        <h2 className="text-xl font-bold tracking-tight mb-1">Appearance</h2>
        <p className="text-xs text-muted-foreground mb-5">Choose your look. Switch anytime.</p>

        <div className="grid grid-cols-2 gap-3">
          <ThemeCard
            selected={theme === "dark"}
            onClick={() => pick("dark")}
            label="Dark"
            sub="OLED black · red accents"
            icon={Moon}
            preview={
              <div className="h-full w-full rounded-xl"
                style={{
                  background: "radial-gradient(circle at 30% 20%, #4b0810 0%, #0a0a0a 60%)",
                  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
                }} />
            }
          />
          <ThemeCard
            selected={theme === "light"}
            onClick={() => pick("light")}
            label="Liquid Glass"
            sub="iOS frosted · light"
            icon={Sparkles}
            preview={
              <div className="h-full w-full rounded-xl relative overflow-hidden"
                style={{
                  background:
                    "radial-gradient(circle at 30% 20%, #ffd7df 0%, #d8e6ff 50%, #ece6ff 100%)",
                }}>
                <div className="absolute inset-2 rounded-lg"
                  style={{
                    background: "rgba(255,255,255,0.55)",
                    backdropFilter: "blur(10px)",
                    WebkitBackdropFilter: "blur(10px)",
                    border: "1px solid rgba(255,255,255,0.7)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8), 0 4px 10px -4px rgba(40,40,80,0.2)",
                  }} />
              </div>
            }
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};

const ThemeCard = ({
  selected, onClick, label, sub, icon: Icon, preview,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  sub: string;
  icon: any;
  preview: React.ReactNode;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "relative rounded-2xl p-3 text-left transition-all active:scale-[0.98] border-2",
      selected ? "border-primary shadow-glow" : "border-border hover:border-primary/40",
    )}
  >
    <div className="aspect-[4/3] mb-3">{preview}</div>
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-foreground" />
      <span className="text-sm font-bold">{label}</span>
      {selected && (
        <span className="ml-auto h-5 w-5 rounded-full bg-primary grid place-items-center">
          <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />
        </span>
      )}
    </div>
    <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
  </button>
);
