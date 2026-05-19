import { useDraggable, useDroppable } from "@dnd-kit/core";
import {
    ClipboardPaste,
    Download,
    FilePen,
    Folder,
    FolderOpen,
    FolderPlus,
    Palette,
    Scissors,
    Trash2,
} from "lucide-react";
import {
    forwardRef,
    useState,
    type DragEvent as ReactDragEvent,
    type MouseEvent,
} from "react";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuSub,
    ContextMenuSubContent,
    ContextMenuSubTrigger,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/cn";
import { __ } from "@/lib/i18n";
import { useUiStore } from "@/lib/store";
import { useSettings } from "../settings/useSettings";
import { CountBadge } from "./CountBadge";
import { FolderColorPalette } from "./FolderColorPalette";
import type { FlattenedItem } from "./types";

export const INDENT_PX = 20;
// Height reserved for the sibling-insert preview ghost. Matches the visual
// height of a real folder row (py-1.5 + the 20px folder icon ≈ 32px) so the
// ghost slots in seamlessly. Driving the over row's padding from this
// constant keeps the row's hit rect in sync with the ghost's footprint.
const GHOST_ROW_HEIGHT = 32;

const ATTACHMENT_MIME = "application/x-flexa-mf-attachment";

interface FolderNodeProps {
    item: FlattenedItem;
    selected: boolean;
    isDropTarget?: boolean;
    /** When non-null, render a ghost preview row above ("before") or below
     *  ("after") this row to show where the dragged folder will land. */
    insertHint?: "before" | "after" | null;
    /** The folder being dragged. Used to render the ghost preview row when
     *  `insertHint` is set. Required for the ghost to render. */
    ghostItem?: FlattenedItem | null;
    disableDrop?: boolean;
    cutMarked?: boolean;
    canPaste?: boolean;
    onSelect: () => void;
    onToggle: () => void;
    onCreateChild: () => void;
    onRename: () => void;
    onDelete: () => void;
    onCut: () => void;
    onPaste: () => void;
    onChangeColor: (color: string | null) => void;
    onDownload: () => void;
    onAttachmentDrop?: (folderId: number, attachmentIds: number[]) => void;
}

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

export const FolderNode = forwardRef<HTMLDivElement, FolderNodeProps>(
    function FolderNode(
        {
            item,
            selected,
            isDropTarget = false,
            insertHint = null,
            ghostItem = null,
            disableDrop = false,
            cutMarked = false,
            canPaste = false,
            onSelect,
            onToggle,
            onCreateChild,
            onRename,
            onDelete,
            onCut,
            onPaste,
            onChangeColor,
            onDownload,
            onAttachmentDrop,
        },
        ref,
    ) {
        const draggable = useDraggable({ id: item.id });
        const droppable = useDroppable({ id: item.id, disabled: disableDrop });
        const depth = item.depth;
        const displayFolderId = useUiStore((s) => s.displayFolderId);
        const showCounts = useSettings().data?.show_counts ?? true;
        const [dropHover, setDropHover] = useState(false);

        const handleChevron = (e: MouseEvent) => {
            e.stopPropagation();
            onToggle();
            onSelect();
        };

        const handleDragEnter = (event: ReactDragEvent<HTMLDivElement>) => {
            if (!onAttachmentDrop) {
                return;
            }
            if (!event.dataTransfer?.types.includes(ATTACHMENT_MIME)) {
                return;
            }
            event.preventDefault();
            setDropHover(true);
        };
        const handleDragOver = (event: ReactDragEvent<HTMLDivElement>) => {
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
            setDropHover(false);
        };
        const handleDrop = (event: ReactDragEvent<HTMLDivElement>) => {
            if (!onAttachmentDrop) {
                return;
            }
            const payload = readDragPayload(event);
            setDropHover(false);
            if (!payload) {
                return;
            }
            event.preventDefault();
            onAttachmentDrop(item.id, payload.ids);
        };

        return (
            <ContextMenu>
                <ContextMenuTrigger asChild>
                    <div
                        ref={(el) => {
                            draggable.setNodeRef(el);
                            droppable.setNodeRef(el);
                            if (typeof ref === "function") {
                                ref(el);
                            } else if (ref) {
                                ref.current = el;
                            }
                        }}
                        className={cn(
                            "fmf:group fmf:relative fmf:flex fmf:cursor-pointer fmf:items-center fmf:gap-1 fmf:rounded-md fmf:py-1.5 fmf:pr-2 fmf:text-sm fmf:transition-colors",
                            "fmf:hover:bg-slate-100",
                            "fmf:focus-visible:outline-none fmf:focus-visible:ring-2 fmf:focus-visible:ring-brand-500",
                            selected && "fmf:bg-brand-50 fmf:font-medium fmf:text-brand-700",
                            draggable.isDragging && "fmf:opacity-40",
                            cutMarked && "fmf:opacity-50 fmf:italic",
                            dropHover &&
                                "fmf:bg-brand-100 fmf:ring-2 fmf:ring-inset fmf:ring-brand-400",
                            isDropTarget &&
                                "fmf:bg-slate-100 fmf:ring-2 fmf:ring-inset fmf:ring-brand-500",
                        )}
                        style={{
                            paddingLeft: depth * INDENT_PX,
                            // Grow the row by the ghost's height when a
                            // sibling-insert preview is showing. Padding (not
                            // margin) keeps the row's bounding rect anchored
                            // under the cursor - if we shifted the row by
                            // inserting a real DOM sibling, dnd-kit's
                            // re-measure would push the over row out from
                            // under the pointer and oscillate the drop mode.
                            paddingTop:
                                insertHint === "before"
                                    ? GHOST_ROW_HEIGHT
                                    : undefined,
                            paddingBottom:
                                insertHint === "after"
                                    ? GHOST_ROW_HEIGHT
                                    : undefined,
                        }}
                        {...draggable.attributes}
                        {...draggable.listeners}
                        role="treeitem"
                        aria-selected={selected}
                        aria-expanded={item.hasChildren ? !item.collapsed : undefined}
                        aria-level={item.depth + 1}
                        tabIndex={selected ? 0 : -1}
                        onClick={onSelect}
                        onContextMenu={(e) => e.stopPropagation()}
                        data-id={item.id}
                        onDragEnter={handleDragEnter}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
                        {Array.from({ length: depth }, (_, k) => {
                            const isParentCol = k === depth - 1;
                            let height: "full" | "half" | null;
                            if (isParentCol) {
                                height = item.lastChildPath[depth]
                                    ? "half"
                                    : "full";
                            } else {
                                height = !item.lastChildPath[k + 1]
                                    ? "full"
                                    : null;
                            }
                            if (height === null) {
                                return null;
                            }
                            return (
                                <span
                                    key={k}
                                    aria-hidden
                                    className="fmf:pointer-events-none fmf:absolute fmf:w-px fmf:bg-slate-200"
                                    style={{
                                        left: k * INDENT_PX + INDENT_PX / 2,
                                        top: 0,
                                        bottom: height === "half" ? "50%" : 0,
                                    }}
                                />
                            );
                        })}
                        {depth > 0 && (
                            <span
                                aria-hidden
                                className="fmf:pointer-events-none fmf:absolute fmf:h-px fmf:bg-slate-200"
                                style={{
                                    left: (depth - 1) * INDENT_PX + INDENT_PX / 2,
                                    top: "50%",
                                    width: INDENT_PX / 2,
                                }}
                            />
                        )}
                        {insertHint && ghostItem && (
                            <div
                                aria-hidden
                                className={cn(
                                    "fmf:pointer-events-none fmf:absolute fmf:left-0 fmf:right-0 fmf:flex fmf:items-center fmf:gap-1 fmf:rounded-md fmf:border fmf:border-dashed fmf:border-slate-400 fmf:bg-white/70 fmf:pr-2 fmf:text-sm fmf:text-slate-600 fmf:opacity-70",
                                    insertHint === "before"
                                        ? "fmf:top-0"
                                        : "fmf:bottom-0",
                                )}
                                style={{
                                    height: GHOST_ROW_HEIGHT,
                                    paddingLeft: depth * INDENT_PX,
                                }}
                            >
                                <div className="fmf:flex fmf:h-5 fmf:w-5 fmf:shrink-0 fmf:items-center fmf:justify-center fmf:text-slate-500">
                                    <Folder
                                        className="fmf:h-[18px] fmf:w-[18px]"
                                        style={
                                            ghostItem.color
                                                ? { color: ghostItem.color }
                                                : undefined
                                        }
                                    />
                                </div>
                                <span className="fmf:min-w-0 fmf:flex-1 fmf:truncate">
                                    {ghostItem.name}
                                </span>
                            </div>
                        )}
                        {item.hasChildren ? (
                            <button
                                type="button"
                                onClick={handleChevron}
                                className="fmf:flex fmf:h-5 fmf:w-5 fmf:shrink-0 fmf:cursor-pointer fmf:items-center fmf:justify-center fmf:rounded fmf:text-slate-500 fmf:hover:text-slate-900"
                                aria-label={item.collapsed ? __("Expand") : __("Collapse")}
                            >
                                {item.collapsed ? (
                                    <Folder
                                        className="fmf:h-[18px] fmf:w-[18px]"
                                        style={item.color ? { color: item.color } : undefined}
                                    />
                                ) : (
                                    <FolderOpen
                                        className="fmf:h-[18px] fmf:w-[18px]"
                                        style={item.color ? { color: item.color } : undefined}
                                    />
                                )}
                            </button>
                        ) : (
                            <div
                                className="fmf:flex fmf:h-5 fmf:w-5 fmf:shrink-0 fmf:items-center fmf:justify-center fmf:text-slate-500"
                                aria-hidden
                            >
                                <Folder
                                    className="fmf:h-[18px] fmf:w-[18px]"
                                    style={item.color ? { color: item.color } : undefined}
                                />
                            </div>
                        )}
                        <span className="fmf:min-w-0 fmf:flex-1 fmf:truncate">
                            {displayFolderId && (
                                <span className="fmf:tabular-nums">
                                    #{item.id}{" "}
                                </span>
                            )}
                            {item.name}
                        </span>
                        {showCounts && item.count > 0 && (
                            <CountBadge
                                count={item.count}
                                selected={selected}
                                className="fmf:ml-auto"
                            />
                        )}
                    </div>
                </ContextMenuTrigger>
                <ContextMenuContent>
                    <ContextMenuItem onSelect={onCreateChild}>
                        <span className="fmf:flex-1">{__("New Folder")}</span>
                        <FolderPlus aria-hidden className="fmf:h-4 fmf:w-4 fmf:text-slate-500" />
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem onSelect={onRename}>
                        <span className="fmf:flex-1">{__("Rename")}</span>
                        <FilePen aria-hidden className="fmf:h-4 fmf:w-4 fmf:text-slate-500" />
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={onCut}>
                        <span className="fmf:flex-1">{__("Cut")}</span>
                        <Scissors aria-hidden className="fmf:h-4 fmf:w-4 fmf:text-slate-500" />
                    </ContextMenuItem>
                    <ContextMenuItem onSelect={onPaste} disabled={!canPaste}>
                        <span className="fmf:flex-1">{__("Paste")}</span>
                        <ClipboardPaste aria-hidden className="fmf:h-4 fmf:w-4 fmf:text-slate-500" />
                    </ContextMenuItem>
                    <ContextMenuItem destructive onSelect={onDelete}>
                        <span className="fmf:flex-1">{__("Delete")}</span>
                        <Trash2 aria-hidden className="fmf:h-4 fmf:w-4" />
                    </ContextMenuItem>
                    <ContextMenuSub>
                        <ContextMenuSubTrigger>
                            <span className="fmf:flex-1">{__("Change Color")}</span>
                            <Palette aria-hidden className="fmf:h-4 fmf:w-4 fmf:text-slate-500" />
                        </ContextMenuSubTrigger>
                        <ContextMenuSubContent sideOffset={4}>
                            <FolderColorPalette
                                value={item.color}
                                onChange={onChangeColor}
                            />
                        </ContextMenuSubContent>
                    </ContextMenuSub>
                    <ContextMenuItem onSelect={onDownload}>
                        <span className="fmf:flex-1">{__("Download")}</span>
                        <Download aria-hidden className="fmf:h-4 fmf:w-4 fmf:text-slate-500" />
                    </ContextMenuItem>
                </ContextMenuContent>
            </ContextMenu>
        );
    },
);
