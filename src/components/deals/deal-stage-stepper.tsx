import { useRef, useEffect } from "react";
import { Check, ChevronRight, Trophy, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StageStep {
  name: string;
  label?: string;
  deal_status?: string;
  probability?: number;
  position?: number;
  type?: string;
}

interface DealStageStepperProps {
  stages: StageStep[];
  currentStage: string;
  onSelectStage: (stageName: string) => void;
  disabled?: boolean;
}

export function DealStageStepper({
  stages,
  currentStage,
  onSelectStage,
  disabled = false,
}: DealStageStepperProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeBtnRef = useRef<HTMLButtonElement>(null);

  // Filter out terminal "Won" and "Lost" for the progressive pipeline if desired,
  // or keep normal stages in sequence and display Won / Lost at the end.
  const pipelineStages = stages.filter(
    (s) => s.name !== "Lost" && s.type !== "Lost",
  );
  const currentIndex = pipelineStages.findIndex((s) => s.name === currentStage);
  const isWon = currentStage.toLowerCase() === "won";
  const isLost = currentStage.toLowerCase() === "lost";

  // Auto-scroll active stage into view on mobile
  useEffect(() => {
    if (activeBtnRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const element = activeBtnRef.current;
      const elementLeft = element.offsetLeft;
      const elementWidth = element.offsetWidth;
      const containerWidth = container.offsetWidth;
      container.scrollTo({
        left: elementLeft - containerWidth / 2 + elementWidth / 2,
        behavior: "smooth",
      });
    }
  }, [currentStage]);

  return (
    <div className="w-full bg-card/60 backdrop-blur-xs border-b border-border/80 px-3 py-2 sm:px-6 sm:py-2.5">
      <div
        ref={scrollRef}
        className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5"
      >
        {pipelineStages.map((stage, idx) => {
          const isActive = stage.name === currentStage;
          const isPassed = !isLost && currentIndex > -1 && idx < currentIndex;
          const label = stage.label || stage.deal_status || stage.name;
          const prob = stage.probability;

          return (
            <button
              key={stage.name}
              ref={isActive ? activeBtnRef : undefined}
              type="button"
              disabled={disabled}
              onClick={() => onSelectStage(stage.name)}
              className={cn(
                "group relative flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all duration-150 shrink-0 cursor-pointer select-none",
                isActive
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs ring-2 ring-primary/25"
                  : isPassed
                    ? "bg-primary/10 text-primary hover:bg-primary/15 font-medium"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted/70 hover:text-foreground border border-border/50",
                disabled && "opacity-50 cursor-not-allowed",
              )}
            >
              {/* Status indicator icon */}
              {isPassed ? (
                <Check className="size-3.5 stroke-[2.5] text-primary shrink-0" />
              ) : isActive ? (
                <span className="flex size-2 rounded-full bg-primary-foreground shrink-0 animate-pulse" />
              ) : (
                <span className="size-1.5 rounded-full bg-muted-foreground/50 shrink-0" />
              )}

              <span className="truncate max-w-[120px] sm:max-w-none">{label}</span>

              {/* Probability pill */}
              {prob !== undefined && prob !== null && (
                <span
                  className={cn(
                    "text-[10px] px-1 py-0.2 rounded font-mono",
                    isActive
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "text-muted-foreground/70",
                  )}
                >
                  {Number(prob)}%
                </span>
              )}

              {/* Chevron separator indicator for sequential flow */}
              {idx < pipelineStages.length - 1 && (
                <ChevronRight
                  className={cn(
                    "size-3 -mr-0.5 opacity-40 shrink-0 hidden sm:inline-block",
                    isActive && "text-primary-foreground opacity-70",
                  )}
                />
              )}
            </button>
          );
        })}

        {/* Won quick action badge */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSelectStage("Won")}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all duration-150 shrink-0 cursor-pointer border ml-auto sm:ml-2",
            isWon
              ? "bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-500/30"
              : "border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20",
            disabled && "opacity-50 cursor-not-allowed",
          )}
        >
          <Trophy className="size-3.5" />
          <span>Won</span>
        </button>

        {/* Lost quick action badge */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSelectStage("Lost")}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all duration-150 shrink-0 cursor-pointer border",
            isLost
              ? "bg-rose-600 text-white border-rose-600 shadow-xs ring-2 ring-rose-500/30"
              : "border-rose-500/30 text-rose-700 dark:text-rose-400 bg-rose-500/10 hover:bg-rose-500/20",
            disabled && "opacity-50 cursor-not-allowed",
          )}
        >
          <XCircle className="size-3.5" />
          <span>Lost</span>
        </button>
      </div>
    </div>
  );
}
