import { cn } from "@/lib/utils";

export type FilterKey = "none" | "vivid" | "warm" | "cool" | "mono" | "noir" | "film" | "fade" | "clarendon" | "moon";

export const FILTERS: { key: FilterKey; label: string; css: string }[] = [
  { key: "none", label: "Original", css: "" },
  { key: "vivid", label: "Vivid", css: "saturate(1.4) contrast(1.1)" },
  { key: "warm", label: "Warm", css: "sepia(0.25) saturate(1.2) hue-rotate(-10deg)" },
  { key: "cool", label: "Cool", css: "saturate(1.1) hue-rotate(15deg) brightness(1.02)" },
  { key: "mono", label: "Mono", css: "grayscale(1) contrast(1.1)" },
  { key: "noir", label: "Noir", css: "grayscale(1) contrast(1.35) brightness(0.9)" },
  { key: "film", label: "Film", css: "sepia(0.35) contrast(1.05) brightness(1.02)" },
  { key: "fade", label: "Fade", css: "contrast(0.9) brightness(1.08) saturate(0.85)" },
  { key: "clarendon", label: "Clarendon", css: "saturate(1.35) contrast(1.2) brightness(1.05)" },
  { key: "moon", label: "Moon", css: "grayscale(1) brightness(1.1) contrast(1.1)" },
];

export const filterCss = (key: FilterKey) => FILTERS.find((f) => f.key === key)?.css || "";

export const FilterStrip = ({
  value, onChange, previewUrl,
}: { value: FilterKey; onChange: (k: FilterKey) => void; previewUrl?: string | null }) => (
  <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
    {FILTERS.map((f) => (
      <button
        key={f.key}
        onClick={() => onChange(f.key)}
        className={cn(
          "shrink-0 flex flex-col items-center gap-1 text-[10px] font-semibold",
          value === f.key ? "text-primary" : "text-muted-foreground"
        )}
      >
        <div
          className={cn(
            "h-14 w-14 rounded-xl overflow-hidden bg-muted border-2 transition-colors",
            value === f.key ? "border-primary" : "border-transparent"
          )}
        >
          {previewUrl ? (
            <img src={previewUrl} alt={f.label} className="h-full w-full object-cover"
              style={{ filter: f.css }} />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-fuchsia-500 to-indigo-600" style={{ filter: f.css }} />
          )}
        </div>
        <span>{f.label}</span>
      </button>
    ))}
  </div>
);
