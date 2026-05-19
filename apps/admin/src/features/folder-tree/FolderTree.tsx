import {
    DndContext,
    DragOverlay,
    MeasuringStrategy,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragMoveEvent,
    type DragStartEvent,
} from "@dnd-kit/core";
import type { AutoAnimationPlugin } from "@formkit/auto-animate";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import {
    ClipboardPaste,
    Folder,
    FolderPlus,
    FolderTree as FolderTreeIcon,
    Plus,
} from "lucide-react";
import { Fragment, useMemo, useRef, useState } from "react";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { __ } from "@/lib/i18n";
import { useUiStore } from "@/lib/store";
import { useSettings } from "../settings/useSettings";
import { FolderNode } from "./FolderNode";
import { PendingFolderRow } from "./PendingFolderRow";
import {
    buildTree,
    descendantIds,
    filterFlat,
    flattenTree,
} from "./treeUtils";
import type { FlattenedItem, FolderNodeData, SelectedFolderId } from "./types";
import { useReorderFolders, useUpdateFolder } from "./useFolderMutations";

const TREE_ANIM_MS = 200;

/**
 * auto-animate plugin for the folder list. Keeps the FLIP "slide" that shifts
 * neighbouring rows on expand/collapse, but drops auto-animate's default
 * `opacity 0 -> 1` fade on newly-revealed rows - in the bare config-object
 * mode that fade reads as an unwanted flicker on every expand.
 *
 * Plugin mode also bypasses auto-animate's built-in reduced-motion guard (it
 * only auto-disables for the config-object form), so the preference is
 * honoured here by zeroing the duration.
 *
 * Arg order follows auto-animate's *runtime* call sites, which differ from
 * its (mislabelled) public type: `remain` is invoked with (oldCoords,
 * newCoords); `add`/`remove` get a single coords arg.
 */
const treeAnimation: AutoAnimationPlugin = (el, action, a, b) => {
    const reduced =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const duration = reduced ? 0 : TREE_ANIM_MS;

    let keyframes: Keyframe[];
    if (action === "remain" && a && b) {
        keyframes = [
            { transform: `translate(${a.left - b.left}px, ${a.top - b.top}px)` },
            { transform: "translate(0, 0)" },
        ];
    } else if (action === "remove") {
        keyframes = [
            { opacity: 1, transform: "translateY(0)" },
            { opacity: 0, transform: "translateY(-4px)" },
        ];
    } else {
        // "add" - slide into place, no opacity fade
        keyframes = [
            { transform: "translateY(-4px)" },
            { transform: "translateY(0)" },
        ];
    }

    return new KeyframeEffect(el, keyframes, { duration, easing: "ease-out" });
};

interface FolderTreeProps {
    flat: FolderNodeData[];
    onRequestCreateChild: (parentId: number) => void;
    onRequestRename: (id: number, name: string) => void;
    onRequestDelete: (id: number, name: string, hasChildren: boolean, parentId: number) => void;
    onRequestCut: (id: number) => void;
    onRequestPaste: (targetParentId: number) => void;
    onRequestChangeColor: (id: number, color: string | null) => void;
    onRequestDownload: (id: number, name: string) => void;
    clipboardFolderId: number | null;
    onAttachmentDrop?: (folderId: number, attachmentIds: number[]) => void;
    pendingCreate?: { parent: number } | null;
    onSubmitCreate?: (name: string) => void;
    onCancelCreate?: () => void;
    onRequestCreateRoot?: () => void;
    onRequestBulkCreate?: () => void;
}

export function FolderTree({
    flat,
    onRequestCreateChild,
    onRequestRename,
    onRequestDelete,
    onRequestCut,
    onRequestPaste,
    onRequestChangeColor,
    onRequestDownload,
    clipboardFolderId,
    onAttachmentDrop,
    pendingCreate,
    onSubmitCreate,
    onCancelCreate,
    onRequestCreateRoot,
    onRequestBulkCreate,
}: FolderTreeProps) {
    const expandedIds = useUiStore((s) => s.expandedIds);
    const toggleExpanded = useUiStore((s) => s.toggleExpanded);
    const expand = useUiStore((s) => s.expand);
    const selected: SelectedFolderId = useUiStore((s) => s.selectedFolderId);
    const setSelected = useUiStore((s) => s.setSelected);
    const search = useUiStore((s) => s.search);
    const folderSort = useSettings().data?.folder_sort ?? "manual";

    // Slides rows in/out and shifts their neighbours when a folder is
    // expanded/collapsed. Only fires on DOM child add/remove/move, so it
    // stays quiet during a drag (the row list is unchanged until drop).
    const [treeParent] = useAutoAnimate<HTMLDivElement>(treeAnimation);

    const reorder = useReorderFolders();
    const updateFolder = useUpdateFolder();

    const [activeId, setActiveId] = useState<number | null>(null);
    const [overId, setOverId] = useState<number | null>(null);
    // Insertion mode for the current `overId`. "before"/"after" reorder as a
    // sibling at the over row's parent; "inside" reparents (legacy behavior).
    // Computed from pointer Y vs the over row's bounding rect on each move.
    const [dropMode, setDropMode] = useState<
        "before" | "after" | "inside" | null
    >(null);
    // Pointer Y is reconstructed from dnd-kit's activatorEvent + delta so it's
    // available synchronously inside onDragMove/onDragEnd. A window
    // pointermove listener installed via useEffect would race against the
    // first move on quick drags and leave the ref null at drop time.
    const startYRef = useRef<number>(0);
    const pointerYRef = useRef<number | null>(null);
    const overRectRef = useRef<{ top: number; bottom: number } | null>(null);

    const items = useMemo(() => {
        const tree = buildTree(flat, folderSort);
        const expandedSet = new Set(expandedIds);
        const all = flattenTree(tree, expandedSet);
        return filterFlat(all, search);
    }, [flat, expandedIds, search, folderSort]);

    const activeItem = useMemo(
        () => (activeId !== null ? items.find((i) => i.id === activeId) ?? null : null),
        [activeId, items],
    );

    const disabledDropIds = useMemo(() => {
        if (activeId === null) {
            return new Set<number>();
        }
        return new Set<number>([activeId, ...descendantIds(items, activeId)]);
    }, [activeId, items]);

    const nonPasteableIds = useMemo(() => {
        if (clipboardFolderId === null) {
            return new Set<number>();
        }
        return new Set<number>([clipboardFolderId, ...descendantIds(items, clipboardFolderId)]);
    }, [clipboardFolderId, items]);

    const pendingInsert = useMemo(() => {
        if (!pendingCreate) {
            return null;
        }
        if (pendingCreate.parent === 0) {
            return { index: items.length, depth: 0 };
        }
        const parentIndex = items.findIndex((i) => i.id === pendingCreate.parent);
        if (parentIndex === -1) {
            return { index: items.length, depth: 0 };
        }
        const parentDepth = items[parentIndex].depth;
        return { index: parentIndex + 1, depth: parentDepth + 1 };
    }, [pendingCreate, items]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    );

    // Cycle guard for drag-sort. Walks UP from `candidateParent` in the full
    // flat tree (not just visible items) - if we ever encounter `active`,
    // dropping there would put `active` inside its own subtree.
    //
    // Using `flat` instead of the visible `items` matters: a folder's
    // descendants only appear in `items` when their ancestor is expanded, so
    // a check that walks `items` could silently miss a collapsed branch.
    const wouldCycle = (active: number, candidateParent: number): boolean => {
        if (candidateParent === 0) {
            return false;
        }
        if (candidateParent === active) {
            return true;
        }
        const byId = new Map(flat.map((f) => [f.id, f]));
        const seen = new Set<number>();
        let cur = candidateParent;
        while (cur !== 0 && !seen.has(cur)) {
            if (cur === active) {
                return true;
            }
            seen.add(cur);
            const node = byId.get(cur);
            if (!node) {
                return false;
            }
            cur = node.parent;
        }
        return false;
    };

    const computeDropMode = (): "before" | "after" | "inside" | null => {
        const py = pointerYRef.current;
        const rect = overRectRef.current;
        if (py === null || !rect) {
            return null;
        }
        const h = rect.bottom - rect.top;
        if (py < rect.top + h * 0.25) {
            return "before";
        }
        if (py > rect.top + h * 0.75) {
            return "after";
        }
        return "inside";
    };

    const updateFromEvent = (event: DragMoveEvent) => {
        pointerYRef.current = startYRef.current + event.delta.y;
        setOverId(event.over ? Number(event.over.id) : null);
        if (event.over) {
            overRectRef.current = {
                top: event.over.rect.top,
                bottom: event.over.rect.bottom,
            };
        } else {
            overRectRef.current = null;
        }
        setDropMode(computeDropMode());
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(Number(event.active.id));
        setOverId(null);
        setDropMode(null);
        overRectRef.current = null;
        const ev = event.activatorEvent as PointerEvent | MouseEvent | undefined;
        const y =
            ev && typeof (ev as PointerEvent).clientY === "number"
                ? (ev as PointerEvent).clientY
                : 0;
        startYRef.current = y;
        pointerYRef.current = y;
    };

    const handleDragMove = (event: DragMoveEvent) => {
        updateFromEvent(event);
    };

    const handleDragOver = (event: DragMoveEvent) => {
        updateFromEvent(event);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const finalActive = activeId;
        // Read fresh from refs - `dropMode` state may be stale relative to the
        // very last pointer position (state updates batch across renders).
        const finalMode = computeDropMode();
        setActiveId(null);
        setOverId(null);
        setDropMode(null);

        if (finalActive === null || !event.over) {
            return;
        }
        const overIdNum = Number(event.over.id);
        if (overIdNum === finalActive) {
            return;
        }
        const activeItem = items.find((i) => i.id === finalActive);
        const overItem = items.find((i) => i.id === overIdNum);
        if (!activeItem || !overItem) {
            return;
        }

        // Source siblings from the full `flat` (not the visible `items`) so a
        // collapsed branch or active search filter can't omit real siblings
        // from the reorder payload - the server only updates ords for ids it
        // receives, so leaving any out creates ambiguous ord positions.
        const siblingsAt = (parent: number): number[] =>
            flat
                .filter((f) => f.parent === parent)
                .sort((a, b) => a.ord - b.ord)
                .map((f) => f.id);

        // Sibling-reorder path (drop near top/bottom edges of a row): insert
        // active as a sibling at over.parent. Supports cross-parent moves -
        // the active becomes a child of overItem.parent regardless of where
        // it was previously. The only forbidden case is putting active into
        // its own subtree, which `wouldCycle` catches via a flat-tree
        // ancestor walk.
        if (finalMode === "before" || finalMode === "after") {
            const newParent = overItem.parent;
            if (wouldCycle(finalActive, newParent)) {
                return;
            }
            const siblings = siblingsAt(newParent).filter(
                (id) => id !== finalActive,
            );
            const overIdx = siblings.indexOf(overIdNum);
            if (overIdx === -1) {
                return;
            }
            const insertAt = finalMode === "before" ? overIdx : overIdx + 1;
            const newOrder = [
                ...siblings.slice(0, insertAt),
                finalActive,
                ...siblings.slice(insertAt),
            ];
            const currentSiblings = siblingsAt(newParent);
            const sameOrder =
                currentSiblings.length === newOrder.length &&
                currentSiblings.every((id, i) => id === newOrder[i]);
            if (sameOrder) {
                return;
            }
            if (activeItem.parent !== newParent) {
                updateFolder.mutate({ id: finalActive, parent: newParent });
            }
            reorder.mutate({ parent: newParent, ids: newOrder });
            if (newParent !== 0) {
                expand(newParent);
            }
            return;
        }

        // Reparent path (drop in the middle of a row): make active a child of
        // the over row, appended to the end of its children. Same cycle
        // guard applies - can't drop active inside its own subtree.
        const newParent = overIdNum;
        if (wouldCycle(finalActive, newParent)) {
            return;
        }
        if (activeItem.parent === newParent) {
            return;
        }

        updateFolder.mutate({ id: finalActive, parent: newParent });

        const newSiblings = siblingsAt(newParent).filter(
            (id) => id !== finalActive,
        );
        reorder.mutate({
            parent: newParent,
            ids: [...newSiblings, finalActive],
        });

        if (newParent !== 0) {
            expand(newParent);
        }
    };

    const cutFolder =
        clipboardFolderId !== null
            ? flat.find((f) => f.id === clipboardFolderId)
            : undefined;
    const canPasteAtRoot =
        clipboardFolderId !== null && cutFolder !== undefined && cutFolder.parent !== 0;

    const rootMenu = (
        <ContextMenuContent>
            <ContextMenuItem onSelect={() => onRequestCreateChild(0)}>
                <span className="fmf:flex-1">{__("New Folder")}</span>
                <FolderPlus aria-hidden className="fmf:h-4 fmf:w-4 fmf:text-slate-500" />
            </ContextMenuItem>
            <ContextMenuItem
                onSelect={() => onRequestPaste(0)}
                disabled={!canPasteAtRoot}
            >
                <span className="fmf:flex-1">{__("Paste")}</span>
                <ClipboardPaste aria-hidden className="fmf:h-4 fmf:w-4 fmf:text-slate-500" />
            </ContextMenuItem>
        </ContextMenuContent>
    );

    if (items.length === 0) {
        if (pendingInsert && onSubmitCreate && onCancelCreate) {
            return (
                <ContextMenu>
                    <ContextMenuTrigger asChild>
                        <div
                            className="fmf:min-h-full fmf:space-y-0.5"
                            role="tree"
                            data-flexa-mf-droptree="true"
                        >
                            <PendingFolderRow
                                depth={pendingInsert.depth}
                                onSubmit={onSubmitCreate}
                                onCancel={onCancelCreate}
                            />
                        </div>
                    </ContextMenuTrigger>
                    {rootMenu}
                </ContextMenu>
            );
        }
        const isSearching = search.trim() !== "";
        return (
            <ContextMenu>
                <ContextMenuTrigger asChild>
                    <div className="fmf:flex fmf:min-h-[160px] fmf:flex-col fmf:items-center fmf:justify-center fmf:gap-3 fmf:rounded-md fmf:border fmf:border-dashed fmf:border-slate-200 fmf:p-6 fmf:text-center fmf:text-sm fmf:text-slate-500">
                        <Folder className="fmf:h-5 fmf:w-5 fmf:text-slate-400" />
                        <span>
                            {isSearching
                                ? __("No folders match your search.")
                                : __("No folders yet. Create one to get started.")}
                        </span>
                        {!isSearching &&
                            (onRequestCreateRoot || onRequestBulkCreate) && (
                                <div className="fmf:mt-1 fmf:flex fmf:flex-wrap fmf:items-center fmf:justify-center fmf:gap-2">
                                    {onRequestCreateRoot && (
                                        <button
                                            type="button"
                                            onClick={onRequestCreateRoot}
                                            className="fmf:flex fmf:cursor-pointer fmf:items-center fmf:gap-1.5 fmf:rounded-full fmf:border fmf:border-slate-200 fmf:bg-white fmf:px-3 fmf:py-1.5 fmf:text-sm fmf:font-medium fmf:text-slate-700 fmf:transition-colors fmf:hover:bg-slate-50 fmf:hover:text-slate-900 fmf:focus-visible:outline-none fmf:focus-visible:ring-2 fmf:focus-visible:ring-brand-500"
                                        >
                                            <Plus
                                                aria-hidden
                                                className="fmf:h-4 fmf:w-4"
                                            />
                                            {__("New Folder")}
                                        </button>
                                    )}
                                    {onRequestBulkCreate && (
                                        <button
                                            type="button"
                                            onClick={onRequestBulkCreate}
                                            className="fmf:flex fmf:cursor-pointer fmf:items-center fmf:gap-1.5 fmf:rounded-full fmf:border fmf:border-slate-200 fmf:bg-white fmf:px-3 fmf:py-1.5 fmf:text-sm fmf:font-medium fmf:text-slate-700 fmf:transition-colors fmf:hover:bg-slate-50 fmf:hover:text-slate-900 fmf:focus-visible:outline-none fmf:focus-visible:ring-2 fmf:focus-visible:ring-brand-500"
                                        >
                                            <FolderTreeIcon
                                                aria-hidden
                                                className="fmf:h-4 fmf:w-4"
                                            />
                                            {__("Create in bulk")}
                                        </button>
                                    )}
                                </div>
                            )}
                    </div>
                </ContextMenuTrigger>
                {rootMenu}
            </ContextMenu>
        );
    }

    return (
        <DndContext
            sensors={sensors}
            measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={() => {
                setActiveId(null);
                setOverId(null);
            }}
        >
            <ContextMenu>
                <ContextMenuTrigger asChild>
                    <div
                        ref={treeParent}
                        className="fmf:min-h-full fmf:space-y-0.5 fmf:pb-6"
                        role="tree"
                        data-flexa-mf-droptree="true"
                    >
                        {items.map((item, idx) => {
                    const isActive = activeId === item.id;
                    const isOver =
                        activeId !== null &&
                        !isActive &&
                        overId === item.id;
                    const insertHint =
                        isOver && (dropMode === "before" || dropMode === "after")
                            ? dropMode
                            : null;
                    const isDropTarget = isOver && dropMode === "inside";
                    const renderPendingBefore =
                        pendingInsert?.index === idx &&
                        onSubmitCreate &&
                        onCancelCreate;
                    return (
                        <Fragment key={item.id}>
                            {renderPendingBefore && (
                                <PendingFolderRow
                                    depth={pendingInsert.depth}
                                    onSubmit={onSubmitCreate}
                                    onCancel={onCancelCreate}
                                />
                            )}
                            <FolderNode
                                item={item}
                                selected={selected === item.id}
                                isDropTarget={isDropTarget}
                                insertHint={insertHint}
                                ghostItem={
                                    insertHint && activeItem ? activeItem : null
                                }
                                disableDrop={disabledDropIds.has(item.id)}
                                cutMarked={clipboardFolderId === item.id}
                                canPaste={
                                    clipboardFolderId !== null &&
                                    !nonPasteableIds.has(item.id) &&
                                    item.parent !== item.id
                                }
                                onSelect={() => setSelected(item.id)}
                                onToggle={() => toggleExpanded(item.id)}
                                onCreateChild={() =>
                                    onRequestCreateChild(item.id)
                                }
                                onRename={() => onRequestRename(item.id, item.name)}
                                onDelete={() =>
                                    onRequestDelete(
                                        item.id,
                                        item.name,
                                        item.hasChildren,
                                        item.parentId,
                                    )
                                }
                                onCut={() => onRequestCut(item.id)}
                                onPaste={() => onRequestPaste(item.id)}
                                onChangeColor={(color) =>
                                    onRequestChangeColor(item.id, color)
                                }
                                onDownload={() =>
                                    onRequestDownload(item.id, item.name)
                                }
                                onAttachmentDrop={onAttachmentDrop}
                            />
                        </Fragment>
                    );
                })}
                {pendingInsert?.index === items.length &&
                    onSubmitCreate &&
                    onCancelCreate && (
                        <PendingFolderRow
                            depth={pendingInsert.depth}
                            onSubmit={onSubmitCreate}
                            onCancel={onCancelCreate}
                        />
                    )}
                    </div>
                </ContextMenuTrigger>
                {rootMenu}
            </ContextMenu>
            <DragOverlay>
                {activeId !== null && (
                    <DragOverlayPreview item={items.find((i) => i.id === activeId) ?? null} />
                )}
            </DragOverlay>
        </DndContext>
    );
}

function DragOverlayPreview({ item }: { item: FlattenedItem | null }) {
    if (!item) {
        return null;
    }
    return (
        <div className="fmf:flex fmf:items-center fmf:gap-2 fmf:rounded-md fmf:bg-white fmf:px-2 fmf:py-1 fmf:text-sm fmf:shadow-md fmf:ring-1 fmf:ring-slate-300">
            <Folder
                className="fmf:h-[18px] fmf:w-[18px]"
                style={item.color ? { color: item.color } : undefined}
            />
            <span className="fmf:truncate">{item.name}</span>
        </div>
    );
}
