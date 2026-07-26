import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const PageHeader = ({ title, right }: { title: string; right?: React.ReactNode }) => {
  const nav = useNavigate();
  return (
    <header className="sticky top-0 z-30 px-4 h-14 flex items-center gap-3 liquid-nav border-b border-border/50 rounded-none">
      <button onClick={() => nav(-1)} aria-label="Back" className="p-1.5 -ml-1.5 rounded-full hover:bg-muted/40 transition-colors">
        <ArrowLeft className="h-5 w-5" />
      </button>
      <h1 className="flex-1 text-base font-semibold truncate">{title}</h1>
      {right}
    </header>
  );
};
