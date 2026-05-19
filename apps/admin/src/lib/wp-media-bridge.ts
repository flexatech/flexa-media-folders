/**
 * Bridges the Flexa folder tree into the WordPress `wp.media` library.
 *
 * Responsibilities:
 *  - Inject the current folder bucket into every attachment query (the AJAX
 *    `query.flexa_mf_folder` param, which the PHP QueryFilter reads).
 *  - Re-fetch the active media collection(s) whenever the selected folder
 *    changes, so the grid updates without a page reload.
 *  - Provide a DOM mount point for the React sidebar - one for upload.php
 *    list/grid screens, one inside each open media modal.
 *  - Augment Attachment views to be HTML5-draggable so users can drag a
 *    thumbnail onto a folder node in the tree.
 *
 * The bridge is install-once: idempotent guards prevent double-patching when
 * the React app re-mounts (StrictMode in development double-invokes effects).
 */

import { queryClient } from "@/app/providers";
import type { SelectedFolderId } from "@/features/folder-tree/types";
import { FOLDER_TREE_QUERY_KEY } from "@/features/folder-tree/useFolderTree";
import { api } from "./api";
import { __, _n, sprintf } from "./i18n";
import { useUiStore } from "./store";

const SPECIAL_ALL = -1;
const SPECIAL_UNCATEGORIZED = 0;
const URL_FOLDER_PARAM = "flexa_mf_folder";

/**
 * Translate the UI's SelectedFolderId into the bucket the PHP QueryFilter
 * understands. "all" returns `null` so we skip sending the param entirely.
 */
function toBucket(folder: SelectedFolderId): number | null {
    if (folder === "all") {
        return null;
    }
    if (folder === "uncategorized") {
        return SPECIAL_UNCATEGORIZED;
    }
    return folder;
}

let installed = false;

interface BridgeBus {
    mountUploadSidebar(target: HTMLElement): void;
    mountModalSidebar(target: HTMLElement, frameCid: string): void;
    unmountModalSidebar(frameCid: string): void;
}

const noopBus: BridgeBus = {
    mountUploadSidebar: () => {},
    mountModalSidebar: () => {},
    unmountModalSidebar: () => {},
};

let activeBus: BridgeBus = noopBus;

export function registerBridgeBus(bus: BridgeBus): void {
    activeBus = bus;
}

/**
 * Installs the wp.media patches. Safe to call multiple times - only the
 * first call has any effect. Returns `true` if installation succeeded
 * (i.e. wp.media was present), `false` otherwise.
 */
export function installMediaBridge(): boolean {
    if (installed) {
        return true;
    }
    const wpMedia = window.wp?.media;
    if (!wpMedia) {
        return false;
    }
    installed = true;

    patchQueryGet(wpMedia);
    patchAttachmentsBrowser(wpMedia);
    patchAttachmentView(wpMedia);
    patchUploadQueue();
    patchListView();
    suppressPluploadForOurDrags();
    // Sync the store FROM the URL before subscribing - otherwise the
    // subscribe's initial `last` snapshot would be the persisted localStorage
    // value, and the URL-induced setSelected() would immediately fire a
    // navigate back to the localStorage choice.
    syncStoreFromListUrl();
    subscribeFolderChanges();
    mountUploadSidebarIfPresent();
    return true;
}

/**
 * `upload.php?mode=list` renders a server-side WP_List_Table - none of WP's
 * Backbone Attachment views run, so `patchAttachmentView` has nothing to
 * hook. Make each `<tr>` natively HTML5-draggable so users can drag a row
 * onto a folder node, then reload the table after the move (it can't be
 * re-queried via Backbone like the grid can).
 */
function patchListView(): void {
    const apply = () => {
        const rows = document.querySelectorAll<HTMLTableRowElement>(
            '.wp-list-table.media tbody tr[id^="post-"]',
        );
        rows.forEach((row) => {
            if (row.dataset.flexaMfDragWired === "1") {
                return;
            }
            const id = Number(row.id.replace(/^post-/, ""));
            if (!Number.isFinite(id) || id <= 0) {
                return;
            }
            row.dataset.flexaMfDragWired = "1";
            row.draggable = true;
            row.addEventListener("dragstart", (event: DragEvent) => {
                if (!event.dataTransfer) {
                    return;
                }
                const payload = JSON.stringify({
                    kind: "flexa-mf/attachment",
                    ids: [id],
                });
                event.dataTransfer.setData(FLEXA_MIME, payload);
                event.dataTransfer.setData("text/plain", payload);
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setDragImage(getEmptyDragImage(), 0, 0);
                document.body.dataset.flexaMfDragging = "1";
                window.dispatchEvent(
                    new CustomEvent("flexa-mf:drag-start", {
                        detail: { count: 1 },
                    }),
                );
            });
            row.addEventListener("dragend", () => {
                delete document.body.dataset.flexaMfDragging;
                window.dispatchEvent(new CustomEvent("flexa-mf:drag-end"));
            });
        });
    };
    apply();
    // Re-wire if WP repaints the table (Screen Options column toggles, Quick
    // Edit row insertion, etc.). Cheap because dataset.flexaMfDragWired
    // dedupes already-patched rows.
    const tbody = document.querySelector(".wp-list-table.media tbody");
    if (tbody && typeof MutationObserver !== "undefined") {
        new MutationObserver(() => apply()).observe(tbody, {
            childList: true,
            subtree: true,
        });
    }
}

export function isListMode(): boolean {
    // .wp-list-table.media is rendered only by upload.php?mode=list. No
    // Backbone frame exists there, so refreshing the active library is a
    // no-op - we have to fall back to a full page reload.
    return Boolean(
        document.querySelector(".wp-list-table.media") && !window.wp?.media?.frame,
    );
}

/**
 * On list pages, the URL is the source of truth for the active folder:
 * `?flexa_mf_folder=N` is read by PHP `QueryFilter::copy_url_query_var`. If
 * the URL has a value, mirror it into the Zustand store so the row matching
 * the URL is highlighted. If the URL has no value, reset to "all" - the PHP
 * list table is unfiltered, so the tree must match it (otherwise the
 * persisted localStorage selection would highlight a folder the user isn't
 * actually viewing). The URL wins over the persisted store on initial load.
 */
function syncStoreFromListUrl(): void {
    if (!isListMode()) {
        return;
    }
    const raw = new URL(window.location.href).searchParams.get(URL_FOLDER_PARAM);
    let next: SelectedFolderId;
    if (raw === null) {
        next = "all";
    } else {
        const num = Number(raw);
        if (!Number.isFinite(num)) {
            return;
        }
        if (num === SPECIAL_ALL) {
            next = "all";
        } else if (num === SPECIAL_UNCATEGORIZED) {
            next = "uncategorized";
        } else if (num > 0) {
            next = num;
        } else {
            return;
        }
    }
    if (useUiStore.getState().selectedFolderId === next) {
        return;
    }
    useUiStore.getState().setSelected(next);
}

/**
 * Navigate to the same list page with the folder bucket encoded in the URL.
 * "all" clears the param (cleaner URL); "uncategorized" → 0; folder id → id.
 * `paged` is dropped because the new filter invalidates the page cursor.
 */
function navigateListView(folder: SelectedFolderId): void {
    const url = new URL(window.location.href);
    let next: string | null;
    if (folder === "all") {
        next = null;
    } else if (folder === "uncategorized") {
        next = String(SPECIAL_UNCATEGORIZED);
    } else {
        next = String(folder);
    }
    const current = url.searchParams.get(URL_FOLDER_PARAM);
    if (next === current) {
        return;
    }
    if (next === null) {
        url.searchParams.delete(URL_FOLDER_PARAM);
    } else {
        url.searchParams.set(URL_FOLDER_PARAM, next);
    }
    url.searchParams.delete("paged");
    window.location.href = url.toString();
}

/**
 * Inject the persisted folder bucket into every Query built without one. WP
 * constructs the initial library Query from `props.toJSON()` at frame init -
 * that happens before our store subscription gets a chance to call
 * `refreshActiveQueries`, so without this patch the very first AJAX fetch
 * goes out with no `flexa_mf_folder` and the grid flashes "all items" before
 * (or instead of) the persisted folder.
 *
 * We only fill in the bucket when the caller didn't already set one. After a
 * user clicks a folder, `library.props.flexa_mf_folder` is defined (possibly
 * `null` for "all"), so `_requery` → `Query.get` passes the user's choice
 * through unchanged.
 */
function patchQueryGet(wpMedia: WpMedia): void {
    const Query = wpMedia.model?.Query as
        | (WpMediaModelQuery & { get: (props: Record<string, unknown>, options?: unknown) => unknown })
        | undefined;
    if (!Query || typeof Query.get !== "function") {
        return;
    }
    const originalGet = Query.get.bind(Query);
    Query.get = function patchedGet(
        props: Record<string, unknown>,
        options?: unknown,
    ) {
        const incoming = (props ?? {}) as Record<string, unknown>;
        if (incoming.flexa_mf_folder === undefined) {
            const bucket = toBucket(useUiStore.getState().selectedFolderId);
            if (bucket !== null) {
                incoming.flexa_mf_folder = bucket;
            }
        }
        return originalGet(incoming, options);
    } as typeof Query.get;
}

const FLEXA_MIME = "application/x-flexa-mf-attachment";
const TREE_SELECTOR = "[data-flexa-mf-droptree]";

/**
 * The browser's default HTML5 drag image is a snapshot of the source element
 * - for media thumbnails that's a ~250 px square that covers the entire
 * folder tree during drag, making drop targets impossible to aim at. The
 * `DragTooltip` pill near the cursor already says "Move N item", so we hide
 * the native preview by handing the browser a 1×1 transparent pixel.
 *
 * Lazily created once and reused. Lives in <body> off-screen because some
 * browsers won't honor a detached element as the drag image.
 */
let emptyDragImage: HTMLImageElement | null = null;
function getEmptyDragImage(): HTMLImageElement {
    if (emptyDragImage) {
        return emptyDragImage;
    }
    const img = new Image(1, 1);
    img.src =
        "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
    img.style.position = "absolute";
    img.style.top = "-9999px";
    img.style.left = "-9999px";
    img.style.opacity = "0";
    img.style.pointerEvents = "none";
    document.body.appendChild(img);
    emptyDragImage = img;
    return img;
}

/**
 * Stops WP's wp.Uploader from claiming our attachment drag.
 *
 * Two things to neutralize:
 *  1. The "Drop files to upload" overlay - plupload toggles `.drag-drop` on
 *     <body> from a document-level listener. We yank that class while our
 *     drag is live, and CSS keeps the overlay hidden as a belt-and-braces.
 *  2. The drop handler - plupload listens for `drop` on the uploader region
 *     and triggers an upload. If the drop lands outside a folder row we stop
 *     it so a stray miss doesn't silently start an upload.
 *
 * Capture phase, but scoped: when the event target is inside our tree we let
 * it bubble through to FolderNode's own handlers; only outside-tree events
 * get stopImmediatePropagation.
 */
function suppressPluploadForOurDrags(): void {
    const hasFlexaPayload = (event: DragEvent): boolean => {
        const types = event.dataTransfer?.types;
        if (!types) {
            return false;
        }
        const list = Array.from(types as ArrayLike<string>);
        return list.includes(FLEXA_MIME);
    };

    const clearWpClass = () => {
        document.body.classList.remove("drag-drop");
    };

    const isInsideTree = (event: DragEvent): boolean => {
        const target = event.target as Element | null;
        return Boolean(target?.closest?.(TREE_SELECTOR));
    };

    const guard = (event: DragEvent) => {
        if (!hasFlexaPayload(event)) {
            return;
        }
        clearWpClass();
        if (isInsideTree(event)) {
            return;
        }
        // Outside our tree: stop plupload from showing the overlay or
        // capturing the drop.
        event.stopImmediatePropagation();
    };

    document.addEventListener("dragenter", guard, true);
    document.addEventListener("dragover", guard, true);
    document.addEventListener("drop", guard, true);
    document.addEventListener("dragend", clearWpClass, true);
}

/**
 * Patches `AttachmentsBrowser` so each instance gets a left sidebar mount
 * node inserted before its toolbar. The actual React tree is rendered by
 * MediaLibrarySidebar; we just provide the DOM hook and tell the bus where
 * to mount.
 */
function patchAttachmentsBrowser(wpMedia: WpMedia): void {
    const Browser = wpMedia.view.AttachmentsBrowser;
    const originalRender = Browser.prototype.render as (this: WpMediaView) => WpMediaView;

    Browser.prototype.render = function patchedRender(this: WpMediaView): WpMediaView {
        const result = originalRender.call(this);
        const root = this.el;
        const cid = this.cid;
        const view = this;
        if (!(root instanceof HTMLElement)) {
            return result;
        }
        knownBrowsers.add(view);
        view.on("destroy", () => {
            knownBrowsers.delete(view);
        });
        // render() can run before the view is attached to the DOM, so defer
        // the modal-vs-page detection until the next frame.
        requestAnimationFrame(() => {
            if (!root.isConnected) {
                return;
            }
            // Only inject the sidebar in a .media-modal context. On upload.php
            // the attachments grid is itself an AttachmentsBrowser, but the
            // page already mounts its own sidebar via
            // mountUploadSidebarIfPresent - injecting here would duplicate the
            // tree and break the layout.
            if (!root.closest(".media-modal")) {
                return;
            }
            // Avoid double-injection if render runs twice for the same view.
            if (root.querySelector(":scope > .flexa-mf-modal-sidebar")) {
                return;
            }
            const sidebar = document.createElement("div");
            sidebar.className = "flexa-mf-modal-sidebar";
            sidebar.dataset.frameCid = cid;
            root.classList.add("flexa-mf-has-sidebar");
            root.prepend(sidebar);
            activeBus.mountModalSidebar(sidebar, cid);
            // Backbone's `remove` fires `destroy`; clean up our mount.
            view.on("destroy", () => {
                activeBus.unmountModalSidebar(cid);
            });
        });
        return result;
    };
}

/**
 * Adds native HTML5 drag on each attachment thumb so it can be dropped on a
 * folder node. The drag payload is JSON `{kind:"flexa-mf/attachment", ids}`
 * carried on a custom MIME type plus a `text/plain` fallback.
 */
function patchAttachmentView(wpMedia: WpMedia): void {
    const Attachment = wpMedia.view.Attachment?.Library;
    if (!Attachment) {
        return;
    }
    const originalRender = Attachment.prototype.render as (this: WpMediaView) => WpMediaView;

    Attachment.prototype.render = function patchedRender(this: WpMediaView): WpMediaView {
        const result = originalRender.call(this);
        const el = this.el;
        const model = this.model;
        if (!(el instanceof HTMLElement) || !model) {
            return result;
        }
        const id = Number(model.get("id"));
        if (!Number.isFinite(id) || id <= 0) {
            return result;
        }
        el.setAttribute("draggable", "true");
        // WP's Attachment view re-renders on every model `change`, reusing the
        // same element. Bind the drag listeners once so they don't stack.
        if (el.dataset.flexaMfBound === "1") {
            return result;
        }
        el.dataset.flexaMfBound = "1";
        el.addEventListener("dragstart", (event: DragEvent) => {
            if (!event.dataTransfer) {
                return;
            }
            const payload = JSON.stringify({
                kind: "flexa-mf/attachment",
                ids: [id],
            });
            event.dataTransfer.setData("application/x-flexa-mf-attachment", payload);
            event.dataTransfer.setData("text/plain", payload);
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setDragImage(getEmptyDragImage(), 0, 0);
            document.body.dataset.flexaMfDragging = "1";
            window.dispatchEvent(
                new CustomEvent("flexa-mf:drag-start", { detail: { count: 1 } }),
            );
        });
        el.addEventListener("dragend", () => {
            delete document.body.dataset.flexaMfDragging;
            window.dispatchEvent(new CustomEvent("flexa-mf:drag-end"));
        });
        return result;
    };
}

/**
 * Auto-files freshly uploaded attachments into the folder the user is
 * currently viewing.
 *
 * WP's plupload integration pushes every in-flight upload into the global
 * `wp.Uploader.queue` collection, then flips each model's `uploading` flag to
 * `false` once the server responds - at which point `response.data.id` is
 * already on the model (see wp-includes/js/plupload/wp-plupload.js
 * `fileUploaded`). We listen for that flip and POST the new attachment id to
 * the active folder.
 *
 * Only real folders catch uploads: "all" and "uncategorized" both mean "no
 * folder" - already the default for a fresh attachment - so an upload made
 * while viewing either is left untouched.
 */
function patchUploadQueue(): void {
    const queue = window.wp?.Uploader?.queue;
    if (!queue || typeof queue.on !== "function") {
        return;
    }
    queue.on("change:uploading", (model) => {
        if (model.get("uploading") !== false) {
            return;
        }
        const id = Number(model.get("id"));
        if (!Number.isFinite(id) || id <= 0) {
            return;
        }
        const folder = useUiStore.getState().selectedFolderId;
        if (typeof folder !== "number" || folder <= 0) {
            return;
        }
        enqueueUploadAssignment(folder, id);
    });
}

// A multi-file upload fires `change:uploading` once per file. Collect the ids
// - grouped by destination folder, in case the user switches folders while an
// upload is still running - and flush them after a short quiet period so a
// burst of small files becomes one REST call and one toast.
let pendingUploadAssignments = new Map<number, Set<number>>();
let uploadAssignmentTimer: number | null = null;

function enqueueUploadAssignment(folderId: number, attachmentId: number): void {
    let ids = pendingUploadAssignments.get(folderId);
    if (!ids) {
        ids = new Set<number>();
        pendingUploadAssignments.set(folderId, ids);
    }
    ids.add(attachmentId);
    if (uploadAssignmentTimer !== null) {
        window.clearTimeout(uploadAssignmentTimer);
    }
    uploadAssignmentTimer = window.setTimeout(flushUploadAssignments, 400);
}

async function flushUploadAssignments(): Promise<void> {
    uploadAssignmentTimer = null;
    const batch = pendingUploadAssignments;
    pendingUploadAssignments = new Map();
    if (batch.size === 0) {
        return;
    }
    let moved = 0;
    let failed = false;
    for (const [folderId, idSet] of batch) {
        const attachmentIds = Array.from(idSet);
        try {
            await api.post(`folders/${folderId}/attachments`, {
                attachment_ids: attachmentIds,
            });
            moved += attachmentIds.length;
        } catch {
            failed = true;
        }
    }
    if (moved > 0) {
        useUiStore
            .getState()
            .showToast(
                sprintf(
                    _n(
                        "Added %s upload to this folder",
                        "Added %s uploads to this folder",
                        moved,
                    ),
                    moved,
                ),
                "success",
            );
        // Refresh the tree's per-folder counts, and re-query the grid so the
        // upload - which WP only showed transiently via the upload queue -
        // reappears now that it belongs to the open folder server-side.
        void queryClient.invalidateQueries({ queryKey: FOLDER_TREE_QUERY_KEY });
        refreshMediaLibrary();
    }
    if (failed) {
        useUiStore
            .getState()
            .showToast(
                __("Some uploads could not be added to the folder."),
                "error",
            );
    }
}

/**
 * Whenever the folder bucket changes, refresh any active media collections so
 * the grid re-queries with the new `flexa_mf_folder` argument.
 */
function subscribeFolderChanges(): void {
    let last = useUiStore.getState().selectedFolderId;
    useUiStore.subscribe((state) => {
        if (state.selectedFolderId === last) {
            return;
        }
        last = state.selectedFolderId;
        if (isListMode()) {
            // No Backbone library to re-query; navigate so PHP re-renders the
            // WP_List_Table with the folder filter applied via $_GET.
            navigateListView(state.selectedFolderId);
            return;
        }
        refreshActiveQueries();
    });
    // Apply the current selection once libraries are ready. `Query.get` is
    // already patched to inject the persisted bucket into the *initial* fetch,
    // so this catch-up only matters when (a) Query.get fired before our
    // install (rare), or (b) a modal frame instantiates its library after we
    // run. Retry briefly so we don't miss either case.
    let attempts = 0;
    const tick = () => {
        if (findActiveLibrary()) {
            refreshActiveQueries();
            return;
        }
        if (attempts++ >= 40) {
            return;
        }
        window.setTimeout(tick, 50);
    };
    window.setTimeout(tick, 0);
}

export function refreshMediaLibrary(): void {
    if (isListMode()) {
        // Give the success toast a beat to render before the reload wipes it.
        window.setTimeout(() => window.location.reload(), 600);
        return;
    }
    refreshActiveQueries();
}

function refreshActiveQueries(): void {
    const library = findActiveLibrary();
    if (!library) {
        return;
    }
    const props = library.props;
    if (!props || typeof props.set !== "function") {
        return;
    }
    const bucket = toBucket(useUiStore.getState().selectedFolderId);
    // Writing the folder bucket onto props.* makes WP's own `_requery` rebuild
    // the underlying Query with `args.flexa_mf_folder = bucket`, which then
    // travels in the AJAX payload as `query[flexa_mf_folder]=…`. Bumping
    // `flexaMfStamp` guarantees a `change` event fires even when the bucket
    // hasn't changed (e.g. after assigning attachments to the current folder).
    // Backbone supports both `set(key, val)` and `set(map)`; our typed shape
    // only exposes the first, so go through a cast for the bulk form.
    (props.set as unknown as (attrs: Record<string, unknown>) => void)({
        flexa_mf_folder: bucket === null ? null : bucket,
        flexaMfStamp: Date.now(),
    });
}

/**
 * Locate the active attachments collection. WP exposes the frame at
 * `wp.media.frame`, but the path to its current state's library differs by
 * frame type:
 *  - `MediaFrame.Manage` (upload.php grid): `frame.state().get("library")`
 *  - child views (`AttachmentsBrowser`, etc.): `view.controller.state().get(...)`
 *
 * We try every shape we know about. As a last resort we walk all media views
 * we've seen during `patchAttachmentsBrowser` - useful when the modal hasn't
 * registered its frame globally (e.g. nested ACF / Elementor frames).
 */
function findActiveLibrary(): WpMediaCollection | undefined {
    const frame = window.wp?.media?.frame as
        | (WpMediaView & { state?: () => WpMediaModel })
        | null
        | undefined;
    const tryFrame = (f: typeof frame): WpMediaCollection | undefined => {
        if (!f) {
            return undefined;
        }
        const stateFromFrame = typeof f.state === "function" ? f.state() : undefined;
        const stateFromController =
            !stateFromFrame && typeof f.controller?.state === "function"
                ? f.controller.state()
                : undefined;
        const state = stateFromFrame ?? stateFromController;
        const lib = state?.get?.("library") as unknown;
        if (lib && typeof lib === "object" && "props" in (lib as object)) {
            return lib as WpMediaCollection;
        }
        return undefined;
    };

    const fromGlobal = tryFrame(frame);
    if (fromGlobal) {
        return fromGlobal;
    }
    for (const view of knownBrowsers) {
        const lib = tryFrame(view as unknown as typeof frame);
        if (lib) {
            return lib;
        }
    }
    return undefined;
}

const knownBrowsers = new Set<WpMediaView>();

function mountUploadSidebarIfPresent(): void {
    if (document.body.classList.contains("upload-php") === false) {
        return;
    }
    if (document.getElementById("flexa-mf-upload-sidebar")) {
        return;
    }
    // Mount as a sibling of #wpbody-content inside #wpbody so the sidebar
    // lives at the page-frame level (easier to style; WP's own #wpbody-content
    // padding/float stays untouched). Flex layout on #wpbody puts the sidebar
    // on the left and #wpbody-content on the right.
    const wpbody = document.getElementById("wpbody");
    const content = document.getElementById("wpbody-content");
    if (!wpbody || !content) {
        return;
    }
    const sidebar = document.createElement("div");
    sidebar.id = "flexa-mf-upload-sidebar";
    sidebar.className = "flexa-mf-upload-sidebar";
    wpbody.classList.add("flexa-mf-has-upload-sidebar");
    wpbody.insertBefore(sidebar, content);
    activeBus.mountUploadSidebar(sidebar);
}
