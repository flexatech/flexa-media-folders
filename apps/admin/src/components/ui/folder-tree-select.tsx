import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Check, ChevronDown, Folder, Search } from "lucide-react";
import {
    useEffect,
    useMemo,
    useRef,
    useState,
    type KeyboardEvent,
} from "react";
import { cn } from "@/lib/cn";
import { __ } from "@/lib/i18n";

export interface FolderTreeSelectOption {
    value: string;
    label: string;
    depth?: number;
}

interface FolderTreeSelectProps {
    id?: string;
    value: string;
    options: FolderTreeSelectOption[];
    onChange: (value: string) => void;
    placeholder?: string;
    /** Render a thin divider after the option whose value is in this set. */
    separatorsAfter?: Set<string>;
}

export function FolderTreeSelect({
    id,
    value,
    options,
    onChange,
    placeholder,
    separatorsAfter,
}: FolderTreeSelectProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    const current = options.find((o) => o.value === value);
    const trimmed = query.trim().toLowerCase();
    const filtered = useMemo(() => {
        if (trimmed === "") {
            return options;
        }
        return options
            .filter((o) => o.label.toLowerCase().includes(trimmed))
            .map((o) => ({ ...o, depth: 0 }));
    }, [options, trimmed]);

    useEffect(() => {
        if (open) {
            setQuery("");
            setActiveIndex(
                Math.max(
                    0,
                    options.findIndex((o) => o.value === value),
                ),
            );
            // Defer focus so Popover has time to mount its content node.
            requestAnimationFrame(() => inputRef.current?.focus());
        }
    }, [open, options, value]);

    useEffect(() => {
        if (!open) {
            return;
        }
        const el = listRef.current?.querySelector<HTMLElement>(
            `[data-index="${activeIndex}"]`,
        );
        el?.scrollIntoView({ block: "nearest" });
    }, [activeIndex, open]);

    const commit = (opt: FolderTreeSelectOption) => {
        onChange(opt.value);
        setOpen(false);
    };

    const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((i) => Math.min(filtered.length - 1, i + 1));
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => Math.max(0, i - 1));
        } else if (e.key === "Enter") {
            e.preventDefault();
            const opt = filtered[activeIndex];
            if (opt) {
                commit(opt);
            }
        } else if (e.key === "Escape") {
            e.preventDefault();
            setOpen(false);
        }
    };

    return (
        <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
            <PopoverPrimitive.Trigger asChild>
                <button
                    id={id}
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={open}
                    className={cn(
                        "fmf:flex fmf:h-9 fmf:w-64 fmf:items-center fmf:gap-2 fmf:rounded-md fmf:border fmf:border-slate-300 fmf:bg-white fmf:px-2 fmf:text-sm fmf:text-slate-900 fmf:shadow-sm fmf:transition-colors fmf:cursor-pointer",
                        "fmf:hover:border-slate-400",
                        "fmf:focus-visible:outline-none fmf:focus-visible:ring-2 fmf:focus-visible:ring-brand-500 fmf:focus-visible:ring-offset-1",
                    )}
                >
                    <Folder
                        className="fmf:h-4 fmf:w-4 fmf:shrink-0 fmf:text-slate-500"
                        aria-hidden
                    />
                    <span
                        className={cn(
                            "fmf:min-w-0 fmf:flex-1 fmf:truncate fmf:text-left",
                            !current && "fmf:text-slate-400",
                        )}
                    >
                        {current?.label ??
                            placeholder ??
                            __("Select a folder…")}
                    </span>
                    <ChevronDown
                        className="fmf:h-4 fmf:w-4 fmf:shrink-0 fmf:text-slate-400"
                        aria-hidden
                    />
                </button>
            </PopoverPrimitive.Trigger>
            <PopoverPrimitive.Portal>
                <PopoverPrimitive.Content
                    sideOffset={4}
                    align="start"
                    collisionPadding={8}
                    className="fmf:z-[160002] fmf:flex fmf:max-h-[var(--radix-popover-content-available-height)] fmf:w-[var(--radix-popover-trigger-width)] fmf:min-w-64 fmf:flex-col fmf:overflow-hidden fmf:rounded-md fmf:border fmf:border-slate-200 fmf:bg-white fmf:shadow-lg"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                >
                    <div className="fmf:flex fmf:shrink-0 fmf:items-center fmf:gap-2 fmf:border-b fmf:border-slate-100 fmf:px-2.5 fmf:py-2">
                        <Search
                            className="fmf:h-4 fmf:w-4 fmf:shrink-0 fmf:text-slate-400"
                            aria-hidden
                        />
                        <input
                            ref={inputRef}
                            type="text"
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                setActiveIndex(0);
                            }}
                            onKeyDown={onKeyDown}
                            placeholder={__("Search folders…")}
                            className="fmf:flex-1 fmf:border-0 fmf:bg-transparent fmf:p-0 fmf:text-sm fmf:text-slate-900 fmf:outline-none fmf:placeholder:text-slate-400"
                            aria-autocomplete="list"
                        />
                    </div>
                    {filtered.length === 0 ? (
                        <div className="fmf:px-3 fmf:py-6 fmf:text-center fmf:text-sm fmf:text-slate-500">
                            {__("No folders match.")}
                        </div>
                    ) : (
                        <ul
                            ref={listRef}
                            role="listbox"
                            className="fmf:min-h-0 fmf:flex-1 fmf:overflow-y-auto fmf:py-1"
                        >
                            {filtered.map((opt, i) => {
                                const isSelected = opt.value === value;
                                const isActive = i === activeIndex;
                                const showSeparator =
                                    trimmed === "" &&
                                    separatorsAfter?.has(opt.value);
                                return (
                                    <li key={opt.value}>
                                        <button
                                            type="button"
                                            role="option"
                                            aria-selected={isSelected}
                                            data-index={i}
                                            onMouseEnter={() => setActiveIndex(i)}
                                            onClick={() => commit(opt)}
                                            className={cn(
                                                "fmf:flex fmf:w-full fmf:items-center fmf:gap-2 fmf:px-2.5 fmf:py-1.5 fmf:text-left fmf:text-sm fmf:transition-colors fmf:cursor-pointer",
                                                isActive &&
                                                    "fmf:bg-brand-50 fmf:text-brand-700",
                                                !isActive &&
                                                    "fmf:text-slate-800 fmf:hover:bg-slate-50",
                                                isSelected && "fmf:font-medium",
                                            )}
                                            style={{
                                                paddingLeft:
                                                    10 + (opt.depth ?? 0) * 16,
                                            }}
                                        >
                                            <Folder
                                                className={cn(
                                                    "fmf:h-4 fmf:w-4 fmf:shrink-0",
                                                    isSelected
                                                        ? "fmf:text-brand-500"
                                                        : "fmf:text-slate-400",
                                                )}
                                                aria-hidden
                                            />
                                            <span className="fmf:min-w-0 fmf:flex-1 fmf:truncate">
                                                {opt.label}
                                            </span>
                                            {isSelected && (
                                                <Check
                                                    className="fmf:h-4 fmf:w-4 fmf:shrink-0 fmf:text-brand-500"
                                                    aria-hidden
                                                />
                                            )}
                                        </button>
                                        {showSeparator && (
                                            <div className="fmf:my-1 fmf:border-t fmf:border-slate-100" />
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </PopoverPrimitive.Content>
            </PopoverPrimitive.Portal>
        </PopoverPrimitive.Root>
    );
}
