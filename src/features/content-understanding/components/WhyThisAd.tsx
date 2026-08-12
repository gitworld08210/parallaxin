import React from "react";
import { Info, HelpCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface WhyThisAdProps {
  explanation: string;
}

export const WhyThisAd = ({ explanation }: WhyThisAdProps) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="flex items-center gap-1 text-[10px] text-white/60 hover:text-white transition-colors bg-black/20 hover:bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm">
            <HelpCircle className="h-3 w-3" />
            <span>Ad</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px] text-xs p-3 bg-zinc-900 text-white border-zinc-800">
          <div className="space-y-1">
            <p className="font-semibold flex items-center gap-1">
              <Info className="h-3 w-3" />
              Why this ad?
            </p>
            <p className="opacity-80">{explanation}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
