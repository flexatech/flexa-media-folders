import { cn } from "@/lib/cn";

interface CountBadgeProps {
    count: number;
    selected: boolean;
    className?: string;
}

export function CountBadge({ count, selected, className }: CountBadgeProps) {
    return (
        <span
            className={cn(
                "fmf:inline-flex fmf:h-5 fmf:min-w-5 fmf:shrink-0 fmf:items-center fmf:justify-center fmf:rounded-full fmf:px-1.5 fmf:text-[11px] fmf:font-medium fmf:leading-none fmf:tabular-nums fmf:transition-colors",
                selected
                    ? "fmf:bg-brand-200 fmf:text-brand-800"
                    : "fmf:bg-slate-100 fmf:text-slate-600 fmf:group-hover:bg-slate-200 fmf:group-hover:text-slate-800",
                className,
            )}
            aria-label={`${count}`}
        >
            {count}
        </span>
    );
}
