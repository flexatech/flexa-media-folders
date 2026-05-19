import { Folder } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { __ } from "@/lib/i18n";
import { INDENT_PX } from "./FolderNode";

interface PendingFolderRowProps {
    depth: number;
    defaultName?: string;
    onSubmit: (name: string) => void;
    onCancel: () => void;
}

export function PendingFolderRow({
    depth,
    defaultName,
    onSubmit,
    onCancel,
}: PendingFolderRowProps) {
    const initial = defaultName ?? __("New Folder");
    const [value, setValue] = useState(initial);
    const inputRef = useRef<HTMLInputElement>(null);
    const settledRef = useRef(false);

    useEffect(() => {
        const el = inputRef.current;
        if (!el) {
            return;
        }
        el.focus();
        el.select();
    }, []);

    const settle = (action: "submit" | "cancel") => {
        if (settledRef.current) {
            return;
        }
        settledRef.current = true;
        if (action === "submit") {
            onSubmit(value);
        } else {
            onCancel();
        }
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter") {
            event.preventDefault();
            settle("submit");
        } else if (event.key === "Escape") {
            event.preventDefault();
            settle("cancel");
        }
    };

    return (
        <div
            className="fmf:group fmf:flex fmf:items-center fmf:gap-1 fmf:rounded-md fmf:py-1 fmf:pr-2 fmf:text-sm"
            style={{ paddingLeft: depth * INDENT_PX }}
            role="treeitem"
            aria-level={depth + 1}
        >
            <div className="fmf:flex fmf:shrink-0 fmf:items-center">
                <span
                    aria-hidden
                    className="fmf:flex fmf:h-5 fmf:w-5 fmf:items-center fmf:justify-center"
                />
                <Folder className="fmf:h-4 fmf:w-4 fmf:text-slate-400" aria-hidden />
            </div>
            <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => settle("submit")}
                aria-label={__("Folder name")}
                className="fmf:ml-1 fmf:flex-1 fmf:rounded fmf:border fmf:border-brand-400 fmf:bg-white fmf:px-2 fmf:py-0.5 fmf:text-sm fmf:shadow-sm fmf:outline-none fmf:ring-2 fmf:ring-brand-200 fmf:focus:ring-brand-300"
            />
        </div>
    );
}
