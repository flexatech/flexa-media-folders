import { Folder, Inbox } from "lucide-react";
import { useState, type DragEvent as ReactDragEvent } from "react";
import { cn } from "@/lib/cn";
import { __ } from "@/lib/i18n";
import { useUiStore } from "@/lib/store";
import { useSettings } from "../settings/useSettings";
import { CountBadge } from "./CountBadge";
import type { FolderTreeResponse } from "./types";

interface SpecialsProps {
    specials: FolderTreeResponse["specials"];
    onAttachmentDrop?: (folderId: number, attachmentIds: number[]) => void;
}

const ATTACHMENT_MIME = "application/x-flexa-mf-attachment";

interface DragPayload {
    kind: string;
    ids: number[];
}

function readDragPayload(event: ReactDragEvent<HTMLElement>): DragPayload | null {
    if (!event.dataTransfer) {
        return null;
    }
    const types = Array.from(event.dataTransfer.types);
    if (!types.includes(ATTACHMENT_MIME) && !types.includes("text/plain")) {
        return null;
    }
    const raw =
        event.dataTransfer.getData(ATTACHMENT_MIME) || event.dataTransfer.getData("text/plain");
    if (!raw) {
        return null;
    }
    try {
        const parsed = JSON.parse(raw) as DragPayload;
        if (parsed.kind !== "flexa-mf/attachment") {
            return null;
        }
        if (!Array.isArray(parsed.ids) || parsed.ids.length === 0) {
            return null;
        }
        return parsed;
    } catch {
        return null;
    }
}

// Padding/gap values mirror `FolderNode`'s row container so the leading icon
// lands in the same column as folder rows below at depth 0 (no left padding,
// gap-1, then a 5×5 icon slot identical to FolderNode's chevron/spacer).
const buttonBase =
    "fmf:group fmf:relative fmf:flex fmf:w-full fmf:cursor-pointer fmf:items-center fmf:gap-1 fmf:rounded-md fmf:py-1.5 fmf:pr-2 fmf:text-sm fmf:text-left fmf:transition-colors fmf:hover:bg-slate-100 fmf:focus-visible:outline-none fmf:focus-visible:ring-2 fmf:focus-visible:ring-brand-500";

const iconSlot =
    "fmf:flex fmf:h-5 fmf:w-5 fmf:shrink-0 fmf:items-center fmf:justify-center fmf:text-slate-500";

// Selected state mirrors `FolderNode` (same `fmf:bg-brand-50` + brand text)
// so Specials and folder rows share a single visual language for selection.
const selectedTone = "fmf:bg-brand-50 fmf:font-medium fmf:text-brand-700";

export function Specials({ specials, onAttachmentDrop }: SpecialsProps) {
    const selected = useUiStore((s) => s.selectedFolderId);
    const setSelected = useUiStore((s) => s.setSelected);
    const showCounts = useSettings().data?.show_counts ?? true;
    const [uncategorizedDropHover, setUncategorizedDropHover] = useState(false);

    const handleDragEnter = (event: ReactDragEvent<HTMLButtonElement>) => {
        if (!onAttachmentDrop) {
            return;
        }
        if (!event.dataTransfer?.types.includes(ATTACHMENT_MIME)) {
            return;
        }
        event.preventDefault();
        setUncategorizedDropHover(true);
    };
    const handleDragOver = (event: ReactDragEvent<HTMLButtonElement>) => {
        if (!onAttachmentDrop) {
            return;
        }
        if (!event.dataTransfer?.types.includes(ATTACHMENT_MIME)) {
            return;
        }
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
    };
    const handleDragLeave = () => {
        setUncategorizedDropHover(false);
    };
    const handleDrop = (event: ReactDragEvent<HTMLButtonElement>) => {
        if (!onAttachmentDrop) {
            return;
        }
        const payload = readDragPayload(event);
        setUncategorizedDropHover(false);
        if (!payload) {
            return;
        }
        event.preventDefault();
        onAttachmentDrop(0, payload.ids);
    };

    return (
        <div className="fmf:space-y-0.5 fmf:shrink-0" data-flexa-mf-droptree="">
            <button
                type="button"
                onClick={() => setSelected("all")}
                aria-pressed={selected === "all"}
                className={cn(buttonBase, selected === "all" && selectedTone)}
            >
                <div className={iconSlot} aria-hidden>
                    <Folder className="fmf:h-4 fmf:w-4" />
                </div>
                <span className="fmf:min-w-0 fmf:flex-1 fmf:truncate">
                    {__("All Files")}
                </span>
                {showCounts && specials.all !== null && (
                    <CountBadge
                        count={specials.all}
                        selected={selected === "all"}
                        className="fmf:ml-auto"
                    />
                )}
            </button>
            <button
                type="button"
                onClick={() => setSelected("uncategorized")}
                aria-pressed={selected === "uncategorized"}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={cn(
                    buttonBase,
                    selected === "uncategorized" && selectedTone,
                    uncategorizedDropHover &&
                        "fmf:bg-brand-100 fmf:ring-2 fmf:ring-inset fmf:ring-brand-400",
                )}
            >
                <div className={iconSlot} aria-hidden>
                    <Inbox className="fmf:h-4 fmf:w-4" />
                </div>
                <span className="fmf:min-w-0 fmf:flex-1 fmf:truncate">
                    {__("Uncategorized")}
                </span>
                {showCounts && specials.uncategorized !== null && (
                    <CountBadge
                        count={specials.uncategorized}
                        selected={selected === "uncategorized"}
                        className="fmf:ml-auto"
                    />
                )}
            </button>
        </div>
    );
}
