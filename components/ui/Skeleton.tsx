import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  variant?: "text" | "circle" | "card" | "chart";
};

export function Skeleton({ className, variant = "text" }: Props) {
  const baseClass = "animate-pulse bg-slate-200 rounded";

  if (variant === "circle") {
    return <div className={cn(baseClass, "rounded-full", className)} />;
  }

  if (variant === "card") {
    return (
      <div className={cn("border border-slate-100 rounded-xl p-4 space-y-3", className)}>
        <div className={cn(baseClass, "h-4 w-3/4")} />
        <div className={cn(baseClass, "h-3 w-1/2")} />
        <div className={cn(baseClass, "h-8 w-full")} />
      </div>
    );
  }

  if (variant === "chart") {
    return (
      <div className={cn("border border-slate-100 rounded-xl p-4", className)}>
        <div className={cn(baseClass, "h-4 w-32 mb-4")} />
        <div className="flex items-end gap-2 h-32">
          {[40, 65, 30, 80, 55, 70, 45].map((h, i) => (
            <div
              key={i}
              className={cn(baseClass, "flex-1 rounded-t")}
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
    );
  }

  return <div className={cn(baseClass, className)} />;
}

export function SkeletonList({ count = 3, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-lg">
          <Skeleton variant="circle" className="h-8 w-8" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-2.5 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
