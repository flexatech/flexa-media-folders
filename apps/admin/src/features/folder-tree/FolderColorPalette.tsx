import { Check, RotateCcw } from "lucide-react";
import { cn } from "@/lib/cn";
import { __ } from "@/lib/i18n";

export const FOLDER_COLORS: readonly string[] = [
    "#ef4444", "#fb7185", "#f97316", "#f59e0b", "#eab308", "#facc15",
    "#2563eb", "#60a5fa", "#bfdbfe", "#16a34a", "#84cc16", "#4ade80",
    "#7c3aed", "#a78bfa", "#c4b5fd", "#ec4899", "#f472b6", "#6b7280",
];

interface FolderColorPaletteProps {
    value: string | null;
    onChange: (color: string | null) => void;
}

export function FolderColorPalette({ value, onChange }: FolderColorPaletteProps) {
    const current = value?.toLowerCase() ?? null;
    return (
        <div className="fmf:space-y-2 fmf:p-1">
            <div className="fmf:grid fmf:grid-cols-6 fmf:gap-1.5">
                {FOLDER_COLORS.map((color) => {
                    const isActive = current === color;
                    return (
                        <button
                            key={color}
                            type="button"
                            onClick={() => onChange(color)}
                            aria-label={color}
                            aria-pressed={isActive}
                            className={cn(
                                "fmf:relative fmf:flex fmf:h-6 fmf:w-6 fmf:cursor-pointer fmf:items-center fmf:justify-center fmf:rounded-md fmf:transition-transform fmf:hover:scale-110",
                                "fmf:focus-visible:outline-none fmf:focus-visible:ring-2 fmf:focus-visible:ring-offset-1 fmf:focus-visible:ring-slate-900",
                            )}
                            style={{ backgroundColor: color }}
                        >
                            {isActive && (
                                <Check
                                    aria-hidden
                                    className="fmf:h-3.5 fmf:w-3.5 fmf:text-white fmf:drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]"
                                />
                            )}
                        </button>
                    );
                })}
            </div>
            <button
                type="button"
                onClick={() => onChange(null)}
                className={cn(
                    "fmf:flex fmf:w-full fmf:cursor-pointer fmf:items-center fmf:gap-2 fmf:rounded-sm fmf:px-2 fmf:py-1.5 fmf:text-xs fmf:text-slate-600 fmf:transition-colors",
                    "fmf:hover:bg-slate-100 fmf:hover:text-slate-900",
                )}
            >
                <RotateCcw aria-hidden className="fmf:h-3.5 fmf:w-3.5" />
                {__("Reset color")}
            </button>
        </div>
    );
}
