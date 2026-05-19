import { FolderTree as FolderTreeIcon, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DragTooltip } from "@/components/DragTooltip";
import { Toaster } from "@/components/Toaster";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { __ } from "@/lib/i18n";
import { useUiStore } from "@/lib/store";
import { isListMode } from "@/lib/wp-media-bridge";
import { useAssignAttachments } from "../media-library/useAssignAttachments";
import { useSettings } from "../settings/useSettings";
import { BulkCreateSheet } from "./BulkCreateSheet";
import { DeleteDialog } from "./DeleteDialog";
import { FolderTree } from "./FolderTree";
import { RenameSheet } from "./RenameSheet";
import { SearchBox } from "./SearchBox";
import { Specials } from "./Specials";
import { Toolbar } from "./Toolbar";
import { useCreateFolder, useUpdateFolder } from "./useFolderMutations";
import { useFolderTree } from "./useFolderTree";

interface FolderTreeAppProps {
    enableAttachmentDrops?: boolean;
}

// Apply `default_folder` exactly once per page load. Multiple FolderTreeApp
// instances (upload sidebar + modal sidebars) share this flag through the
// module, so whichever effect fires first wins and the others no-op.
let defaultFolderApplied = false;

export function FolderTreeApp({
    enableAttachmentDrops = false,
}: FolderTreeAppProps = {}) {
    const { data, isLoading, isError, error, refetch } = useFolderTree();
    const assign = useAssignAttachments();
    const createFolder = useCreateFolder();
    const updateFolder = useUpdateFolder();
    const expand = useUiStore((s) => s.expand);
    const setSelected = useUiStore((s) => s.setSelected);
    const selectedFolderId = useUiStore((s) => s.selectedFolderId);
    const clipboardFolderId = useUiStore((s) => s.clipboardFolderId);
    const setClipboardFolder = useUiStore((s) => s.setClipboardFolder);
    const settings = useSettings();

    useEffect(() => {
        if (defaultFolderApplied) {
            return;
        }
        const def = settings.data?.default_folder;
        const flat = data?.flat;
        if (!def || !flat) {
            return;
        }
        // List view honors only the URL `flexa_mf_folder` param. Applying
        // default_folder here would trigger navigateListView and reload the
        // page on every visit, hijacking the URL. The user explicitly asked
        // that list mode show all attachments unless a param is present.
        if (isListMode()) {
            defaultFolderApplied = true;
            return;
        }
        defaultFolderApplied = true;
        if (def === "last") {
            return;
        }
        if (def === "none") {
            setSelected("all");
            return;
        }
        const id = Number(def);
        if (!Number.isFinite(id) || id <= 0) {
            return;
        }
        const exists = flat.some((f) => f.id === id);
        if (!exists) {
            return;
        }
        setSelected(id);
        // Walk parents up to root so the target row is actually visible.
        const byId = new Map(flat.map((f) => [f.id, f]));
        let cursor = byId.get(id)?.parent ?? 0;
        while (cursor > 0) {
            expand(cursor);
            cursor = byId.get(cursor)?.parent ?? 0;
        }
    }, [settings.data, data?.flat, setSelected, expand]);

    const [pendingCreate, setPendingCreate] = useState<{ parent: number } | null>(
        null,
    );
    const [bulkOpen, setBulkOpen] = useState(false);

    const startCreate = (parent: number) => {
        if (parent !== 0) {
            expand(parent);
        }
        setPendingCreate({ parent });
    };

    const submitCreate = (name: string) => {
        const trimmed = name.trim();
        const parent = pendingCreate?.parent ?? 0;
        setPendingCreate(null);
        if (trimmed === "") {
            return;
        }
        createFolder.mutate({ name: trimmed, parent });
    };

    const cancelCreate = () => setPendingCreate(null);

    const handleCut = (id: number) => {
        setClipboardFolder(id);
    };

    const handlePaste = (targetParentId: number) => {
        if (clipboardFolderId === null) {
            return;
        }
        if (clipboardFolderId === targetParentId) {
            return;
        }
        const moved = data?.flat.find((f) => f.id === clipboardFolderId);
        if (!moved || moved.parent === targetParentId) {
            setClipboardFolder(null);
            return;
        }
        updateFolder.mutate({ id: clipboardFolderId, parent: targetParentId });
        if (targetParentId !== 0) {
            expand(targetParentId);
        }
        setClipboardFolder(null);
    };

    const handleChangeColor = (id: number, color: string | null) => {
        updateFolder.mutate({ id, color });
    };

    const handleDownload = (_id: number, name: string) => {
        window.alert(
            __("Download folder “%s” will be available in Pro.").replace("%s", name),
        );
    };

    const [renameState, setRenameState] = useState<{
        open: boolean;
        id: number;
        name: string;
    }>({ open: false, id: 0, name: "" });

    const [deleteState, setDeleteState] = useState<{
        open: boolean;
        id: number;
        name: string;
        hasChildren: boolean;
        parentId: number;
    }>({ open: false, id: 0, name: "", hasChildren: false, parentId: 0 });

    // Trap wheel events inside the sidebar so they never chain to the WP admin
    // body. `overscroll-behavior: contain` only acts at scroll boundaries, but
    // when the folder list fits in the Viewport there's *no* scroll happening
    // at all and the browser delivers the wheel directly to <body>, scrolling
    // the page underneath while the sticky sidebar stays pinned.
    //
    // We route every wheel that lands inside the tree-app to the nearest Radix
    // Viewport (`data-flexa-mf-scroll-viewport`) and preventDefault so the page
    // can't scroll. When the Viewport has nothing to scroll, the deltaY is a
    // no-op and the user just sees the sidebar absorb the gesture - which is
    // exactly the desired behavior.
    const rootRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const root = rootRef.current;
        if (!root) {
            return;
        }
        const onWheel = (event: WheelEvent) => {
            const target = event.target as Element | null;
            // Don't hijack wheels inside Radix popovers (context menu, color
            // submenu, dialogs) - those live in portals outside `root`, so
            // they wouldn't reach this listener anyway, but we still guard in
            // case Radix ever inlines a Popper into the trigger's subtree.
            if (target?.closest("[data-radix-popper-content-wrapper]")) {
                return;
            }
            const viewport = root.querySelector<HTMLElement>(
                "[data-flexa-mf-scroll-viewport]",
            );
            if (viewport) {
                viewport.scrollTop += event.deltaY;
            }
            event.preventDefault();
        };
        // passive: false is required so preventDefault() actually stops the
        // page scroll; modern browsers default wheel listeners to passive.
        root.addEventListener("wheel", onWheel, { passive: false });
        return () => {
            root.removeEventListener("wheel", onWheel);
        };
    }, []);

    return (
        <div
            ref={rootRef}
            className="flexa-mf-tree-app fmf:flex fmf:h-full fmf:flex-col fmf:gap-3 fmf:overflow-hidden fmf:p-4"
        >
            <Toolbar />
            <SearchBox />

            {isLoading && (
                <div className="fmf:py-6 fmf:text-sm fmf:text-slate-500">Loading folders…</div>
            )}

            {isError && (
                <div className="fmf:rounded-md fmf:bg-red-50 fmf:p-3 fmf:text-sm fmf:text-red-700">
                    Failed to load folders: {(error as Error).message}{" "}
                    <button
                        type="button"
                        onClick={() => refetch()}
                        className="fmf:cursor-pointer fmf:font-medium fmf:underline"
                    >
                        Retry
                    </button>
                </div>
            )}

            {data && (
                <>
                    {/* Specials (All Files / Uncategorized) and the "Folders"
                     * heading live OUTSIDE the ScrollArea so they stay pinned
                     * while only the dynamic folder list scrolls underneath. */}
                    <Specials
                        specials={data.specials}
                        onAttachmentDrop={
                            enableAttachmentDrops
                                ? (folderId, attachmentIds) =>
                                      assign.mutate({ folderId, attachmentIds })
                                : undefined
                        }
                    />
                    <div
                        className="fmf:mx-1 fmf:my-2 fmf:border-t fmf:border-slate-200 fmf:shrink-0"
                        role="presentation"
                    />
                    {/* `flex-1 min-h-0` makes the ScrollArea root size via
                     * flex: it grows to fill remaining space in this column
                     * flex and can shrink below content. Radix sets
                     * `position: relative` inline on the root, so we cannot
                     * use the `absolute inset-0` fill trick - flex sizing is
                     * what gives the Viewport's `h-full` a definite parent
                     * height. */}
                    <ScrollArea className="fmf:-mr-1 fmf:flex-1 fmf:min-h-0 fmf:pr-1">
                        <FolderTree
                            flat={data.flat}
                            onRequestCreateChild={(parent) => startCreate(parent)}
                            onRequestRename={(id, name) =>
                                setRenameState({ open: true, id, name })
                            }
                            onRequestDelete={(id, name, hasChildren, parentId) =>
                                setDeleteState({
                                    open: true,
                                    id,
                                    name,
                                    hasChildren,
                                    parentId,
                                })
                            }
                            onRequestCut={handleCut}
                            onRequestPaste={handlePaste}
                            onRequestChangeColor={handleChangeColor}
                            onRequestDownload={handleDownload}
                            clipboardFolderId={clipboardFolderId}
                            onAttachmentDrop={
                                enableAttachmentDrops
                                    ? (folderId, attachmentIds) =>
                                          assign.mutate({ folderId, attachmentIds })
                                    : undefined
                            }
                            pendingCreate={pendingCreate}
                            onSubmitCreate={submitCreate}
                            onCancelCreate={cancelCreate}
                            onRequestCreateRoot={() => startCreate(0)}
                            onRequestBulkCreate={() => setBulkOpen(true)}
                        />
                    </ScrollArea>
                </>
            )}

            {data && data.flat.length > 0 && (
                <div className="fmf:flex fmf:shrink-0 fmf:items-center fmf:gap-2">
                <button
                    type="button"
                    onClick={() =>
                        startCreate(
                            typeof selectedFolderId === "number"
                                ? selectedFolderId
                                : 0,
                        )
                    }
                    className="fmf:flex fmf:min-w-0 fmf:flex-1 fmf:cursor-pointer fmf:items-center fmf:justify-center fmf:gap-2 fmf:rounded-full fmf:border fmf:border-slate-200 fmf:bg-white fmf:px-3 fmf:py-2 fmf:text-sm fmf:font-medium fmf:text-slate-700 fmf:transition-colors fmf:hover:bg-slate-50 fmf:hover:text-slate-900 fmf:focus-visible:outline-none fmf:focus-visible:ring-2 fmf:focus-visible:ring-brand-500"
                >
                    <Plus aria-hidden className="fmf:h-4 fmf:w-4" />
                    {__("New Folder")}
                </button>
                <TooltipProvider delayDuration={200}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                type="button"
                                onClick={() => setBulkOpen(true)}
                                aria-label={__("Create folders in bulk")}
                                className="fmf:flex fmf:h-9 fmf:w-9 fmf:shrink-0 fmf:cursor-pointer fmf:items-center fmf:justify-center fmf:rounded-full fmf:border fmf:border-slate-200 fmf:bg-white fmf:text-slate-600 fmf:transition-colors fmf:hover:bg-slate-50 fmf:hover:text-slate-900 fmf:focus-visible:outline-none fmf:focus-visible:ring-2 fmf:focus-visible:ring-brand-500"
                            >
                                <FolderTreeIcon
                                    aria-hidden
                                    className="fmf:h-4 fmf:w-4"
                                />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                            {__("Create folders in bulk")}
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                </div>
            )}

            <BulkCreateSheet open={bulkOpen} onOpenChange={setBulkOpen} />
            <RenameSheet
                open={renameState.open}
                onOpenChange={(open) =>
                    setRenameState((s) => ({ ...s, open }))
                }
                id={renameState.id}
                currentName={renameState.name}
            />
            <DeleteDialog
                open={deleteState.open}
                onOpenChange={(open) =>
                    setDeleteState((s) => ({ ...s, open }))
                }
                id={deleteState.id}
                name={deleteState.name}
                hasChildren={deleteState.hasChildren}
                parentId={deleteState.parentId}
            />
            <Toaster />
            <DragTooltip />
        </div>
    );
}
