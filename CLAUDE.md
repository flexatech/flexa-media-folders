# Flexa Media Folders - Build Status

Working notes for the free plugin (`flexa-media-folders/`). The full roadmap and Pro split live in `/Users/dangchi/.claude/plans/giggly-skipping-whale.md` - this file tracks what's actually built vs. what's still pending.

For day-to-day workflow see `docs/DEVELOPMENT.md`. For releasing and running in production see `docs/PRODUCTION.md`.

## Phase status

| Phase | Scope | Status |
|---|---|---|
| 0 | Scaffold (composer, vite, tailwind, shadcn, bootstrap) | Complete |
| 1 | Folder CRUD + REST + WP-CLI | Complete |
| 2 | React tree (dnd-kit, TanStack Query, optimistic mutations) | Complete |
| 3 | WP Media Library integration (sidebar in `upload.php` + modal, drag-to-folder) | Complete |
| 4 | Settings page, reset, i18n pipeline, dark mode, a11y pass | Complete |
| 4.5 | UX polish pass - full context menu, color picker, animations, drag-to-folder UX, filter fix | Complete |
| 5 | Pro plugin scaffold + license stub | Not started (separate repo) |
| 6 | Pro v1 features (icons, SVG, per-user, ZIP, importers, backup, integrations, block) - basic color picker is now Free | Not started |
| 7 | Pro v2 (CPT folders, smart folders, role/cap access) | Not started |

## Phase 4 - what shipped

- **Settings page** (`apps/admin/src/features/settings/`)
  - `SettingsPage.tsx`: FormField rows for `default_folder` (None/Last-used/specific), `folder_sort` (manual/asc/desc), `show_counts` (Switch). Dirty/pending/success/error states on Save.
  - `useSettings.ts`: `useSettings`, `useSaveSettings`, `useResetAllData` query/mutation hooks.
  - `DangerZone.tsx`: Dialog confirm requires literal `delete all folders` before posting reset.
  - Mounted via `settings.tsx` entry (separate Vite chunk).
- **Reset wiring**
  - `src/Support/Resetter.php`: single source of truth - DELETEs both tables, removes settings option, fires `do_action('flexa_mf/data_reset')` for Pro hooks.
  - `POST /wp-json/flexa-mf/v1/settings/reset` (in `SettingsController`) and `wp flexa-mf reset` (in `FolderCommand`) both call `Resetter::reset_all()`.
- **i18n**
  - PHP: text domain `flexa-media-folders`, `wp-i18n` added as script dep, `wp_set_script_translations()` called in `Enqueue.php`.
  - JS: `apps/admin/src/lib/i18n.ts` wraps `wp.i18n.__/_x/_n/sprintf` with the bound text domain; falls back to identity in dev/tests.
  - `makepot.sh` (executable) regenerates `i18n/languages/flexa-media-folders.pot` via `wp i18n make-pot`.
- **Dark mode**
  - `Enqueue::detect_admin_theme()` maps WP admin color schemes - `midnight`, `ectoplasm`, `ocean`, `coffee` → `"dark"`, everything else → `"light"`.
  - `theme` is published on the localized `flexaMf` global; `AppProviders` wraps mounts in `<div data-theme={theme} className="flexa-mf-themed">`.
  - `styles/index.css` carries `@custom-variant dark` rules scoped to `.flexa-mf-tree-app`, `.flexa-mf-modal-sidebar`, `.flexa-mf-upload-sidebar`.
- **A11y pass**
  - `FolderNode`: `role="treeitem"`, `aria-selected`, `aria-expanded` (only when `hasChildren`), `aria-level={depth+1}`, roving `tabIndex` (`selected ? 0 : -1`). Sortable attrs spread first so explicit aria values win.
  - `Specials`: `aria-pressed` on All/Uncategorized buttons.
  - `SearchBox`: `type="search"`, focus-visible ring on clear button.
  - All decorative icons marked `aria-hidden`.
  - Focus-visible rings on every interactive surface.
- **Build script fix**
  - Vite config lives at `apps/admin/vite.config.ts` (it owns its own `root`, `rollupOptions.input`, outDir). Root-level `vite` invocations couldn't find it.
  - `package.json` `dev`/`build`/`preview` now pass `-c apps/admin/vite.config.ts` explicitly.
  - `type-check` and `build` use `tsc -p apps/admin/tsconfig.json` because there's no root tsconfig.

## Phase 4.5 - UX polish pass (2026-05-12)

A polish pass shipped on top of Phase 4 covering folder context menus, motion, and a FileBird-style drag-to-folder UX. **It also uncovered a load-bearing bug** in the existing Phase 3 filtering: the AJAX request fired but server returned all attachments (see decision #15 below).

- **Indent + chevron**
  - `INDENT_PX` reduced 30 → 20 in `FolderNode.tsx`; switched from spacer span to `style={{ paddingLeft: depth * INDENT_PX }}` on the row container so flex layout can't collapse it.
  - Chevron replaced by single rotating `ChevronDown` driven by `[data-collapsed]` + CSS transform - keeps icon position stable when toggling.
- **Slide-in row animation**
  - `.flexa-mf-row-enter` class on each row + `@keyframes flexa-mf-row-in` (180 ms ease-out, opacity + 4 px translateY).
  - Chevron rotation transitions over 180 ms.
  - All motion guarded by `prefers-reduced-motion`.
- **Folder context menu** (`FolderNode.tsx`)
  - Full menu: New Folder · Rename · Cut · Paste · Delete · Change Color (submenu palette) · Download.
  - Cut/Paste use Zustand `clipboardFolderId` slice; paste disabled when target is the cut folder itself, a descendant, or already the parent. `FolderTree` exposes `nonPasteableIds` Set per render.
  - Color picker is its own component: `FolderColorPalette.tsx` - 18-swatch grid + "Reset color" row. The `color` column already shipped in Free for forward-compat (decision #8), so all that was needed was UI; `useUpdateFolder` already accepts `color` and optimistically updates.
  - Download is a stub `window.alert(__("Download folder "%s" will be available in Pro."))` - handler wired so Pro can override.
  - Added `ContextMenuSub` / `ContextMenuSubTrigger` / `ContextMenuSubContent` primitives in `components/ui/context-menu.tsx`.
- **Root-area context menu** (`FolderTree.tsx`)
  - Outer `<ContextMenu>` wraps the tree container so right-clicking empty space gets "New Folder" + "Paste". The empty-state placeholder (`items.length === 0`) gets the same wrapper.
  - Row `<div>` has `onContextMenu={e.stopPropagation()}` so right-clicking a row doesn't bubble to the root menu (Radix's `composeEventHandlers` runs user handler first; `stopPropagation()` fires, then Radix's own open handler fires on the row's inner trigger - so the inner menu still opens).
- **Drag-to-folder UX** (FileBird-style)
  - **Toast** (`components/Toaster.tsx`) - portal'd, top-center, slide-down animation, auto-dismiss 2.5 s. Reads from `useUiStore().toast`; module-level `activeClaim` symbol ensures only the first-mounted Toaster renders (multiple roots: upload sidebar + every modal sidebar - see decision #1).
  - **Drag tooltip** (`components/DragTooltip.tsx`) - fixed pill following cursor while dragging. Listens for `flexa-mf:drag-start` / `flexa-mf:drag-end` window CustomEvents; rAF-throttled `dragover` for position. Same singleton-claim pattern.
  - **Custom events** dispatched from `wp-media-bridge.ts` alongside the existing `body[data-flexa-mf-dragging="1"]` toggle: `flexa-mf:drag-start` carries `detail.count` (selection size).
  - **Toast wiring** - `useAssignAttachments.ts` calls `useUiStore.getState().showToast(_n("Moved %s item","Moved %s items",n))` on success, error variant on failure.
  - **Plupload overlay suppression** - see decision #14.
- **Folder filter actually works now** - see decision #15.

### Files added / changed in 4.5
- Added: `apps/admin/src/components/Toaster.tsx`, `components/DragTooltip.tsx`, `features/folder-tree/FolderColorPalette.tsx`.
- Extended: `components/ui/context-menu.tsx` (Sub primitives), `lib/store.ts` (toast slice, clipboardFolderId), `lib/wp-media-bridge.ts` (plupload suppression, library lookup rewrite, prop-based filter), `features/folder-tree/FolderNode.tsx` (animations, full menu), `features/folder-tree/FolderTree.tsx` (root menu, nonPasteableIds, drop-tree marker), `features/folder-tree/FolderTreeApp.tsx` (mount Toaster + DragTooltip), `features/media-library/useAssignAttachments.ts` (toast + correct refresh), `styles/index.css` (keyframes, drag-state CSS, plupload overlay hide).

## Verification snapshot (run on 2026-05-12)

- `pnpm type-check` - clean
- `pnpm build` - clean; bundle sizes:
  - `assets/dist/assets/main-*.js` ≈ 131 KB raw / 43 KB gzip (+7 KB raw / +2 KB gzip from 4.5 additions)
  - `assets/dist/assets/settings-*.js` ≈ 8 KB raw / 3 KB gzip
  - `assets/dist/assets/index-*.js` (shared vendor) ≈ 248 KB raw / 79 KB gzip
  - Combined gzipped JS ≈ 125 KB - well under the 350 KB Free admin budget.
- `php -l` clean on Phase 3/4 PHP files.
- **Browser smoke test (Phase 4.5):** user confirmed folder click filters Media Library correctly after the prop-based fix (decision #15). Toast + drag tooltip + context menu verified visually.
- Full end-to-end smoke (multi-folder reorder, modal in post-edit, list-view, dark mode, settings reset, import-100-fixtures) still **not** performed - recommended before starting Phase 5.

## Notable decisions and reasoning

1. **Module-singleton `queryClient`** (`apps/admin/src/app/providers.tsx`)
   - The admin app mounts multiple React roots (upload sidebar, every reopened media modal sidebar, settings page).
   - Per-instance `useState(() => new QueryClient(...))` would fragment cache, causing duplicate `/folders` fetches and stale optimistic state across roots.
   - Decision: export a single `queryClient` from the module; every `AppProviders` reads it. Trade-off: a hot-reload edit to query defaults requires a full page refresh, acceptable for an admin tool.

2. **Bridge bus pattern** (`apps/admin/src/lib/wp-media-bridge.ts` ↔ `main.tsx`)
   - WP-media bridge needs to mount/unmount React roots inside Backbone-managed DOM, but we don't want the bridge to import React.
   - Decision: bridge calls a `bus` object with `mountUploadSidebar`/`mountModalSidebar`/`unmountModalSidebar` callbacks registered by `main.tsx`. Keeps the bridge React-agnostic and gives `main.tsx` ownership of root lifecycle via `Map<string, Root>`.

3. **`installMediaBridge()` retries up to 20× at 50 ms**
   - `wp.media` is loaded asynchronously; on `upload.php` it can be available immediately, but inside post editor it loads after page interactive.
   - Decision: retry with bounded attempts rather than waiting on a single event we can't trust across WP versions. `installed` flag guards against double-install in React 18 StrictMode.

4. **HTML5 native drag-and-drop for attachment → folder, not dnd-kit cross-context**
   - dnd-kit doesn't see WP's Backbone-managed attachment thumbnails; the bridge sets HTML5 `draggable=true` and a custom MIME `application/x-flexa-mf-attachment` carrying selection-aware ids.
   - `FolderNode` reads that MIME in `onDrop` and forwards to the assign mutation. Simpler than wrapping WP attachments in a dnd-kit DraggableContext.

5. **`SelectedFolderId = number | "all" | "uncategorized"`, translated by `toBucket()`**
   - The UI uses string sentinels because numeric `0` is overloaded ("uncategorized" in `flexa_mf_folder` query var).
   - `toBucket()` translates: `"all"` → null (omit the query var, no filter), `"uncategorized"` → 0 (matched by `QueryFilter::SPECIAL_UNCATEGORIZED`), `number` → that folder id.
   - This keeps PHP and JS sentinel surfaces independent - the PHP side only ever sees `int|null`.

6. **`Support\Resetter` shared by REST and CLI**
   - Two destructive entry points (REST danger zone, `wp flexa-mf reset`) must stay byte-for-byte equivalent - otherwise Pro's `flexa_mf/data_reset` listener can drift.
   - Decision: extract to `Resetter::reset_all()`. Both controllers delegate.

7. **`interface WpGlobal` for ambient `wp.*` types**
   - Two `.d.ts` files (i18n, wp-media) both extend `Window['wp']`. TS doesn't merge inline object types across declarations; the second declaration silently wins, losing `media` or `i18n`.
   - Decision: declare `interface WpGlobal { ... }` in each file. Interface merging combines them; `Window { wp?: WpGlobal }` then sees the union of fields.

8. **`color`, `created_by` columns shipped in Free**
   - Per the plan's open-question recommendation: nullable columns shipped in Free avoid a Pro-side schema migration that would require running `dbDelta` from the Pro plugin.
   - **Updated 2026-05-12 (Phase 4.5):** `color` is now a **Free feature** - the context-menu palette + `FolderColorPalette.tsx` write to it. `created_by` remains Free-untouched, reserved for Pro per-user mode.
   - Consequence for Pro: Pro's color/icon feature must read the existing `color` value (don't assume null) and may want to layer "folder icon" on top via a separate column or meta.

9. **Two-table schema, not WP taxonomy**
   - Keeps `wp_term*` clean (taxonomy bloat is FileBird's most-reported grievance) and lets us index `(type, parent, ord)` for ordered tree reads in one query.

10. **Singleton-claim pattern for `<Toaster>` / `<DragTooltip>`** (Phase 4.5)
    - Both components live inside `FolderTreeApp`, which mounts in multiple React roots (upload sidebar + every modal sidebar). Naively that would render two toasts on top of each other and double-register window event listeners.
    - Decision: module-level `let activeClaim: symbol | null = null` plus a `useEffect` that claims it on mount and releases on unmount. Only the first-mounted instance renders content. Avoids restructuring main.tsx to host a separate "global UI" root.

11. **Singleton drop-MIME `application/x-flexa-mf-attachment`** (Phase 4.5 hardening)
    - Read by `FolderNode.tsx` (the legitimate drop target) and inspected by the plupload guard in `wp-media-bridge.ts` to decide whether to suppress WP's uploader. Two consumers, one constant defined twice (intentional - they live in different layers and we want each layer to be auditable on its own). If a third consumer is added, hoist to a shared module.

12. **Per-folder highlight only; no sidebar-wide outline during drag** (Phase 4.5)
    - Earlier 4.5 iteration had a brand-colored dashed outline around the whole sidebar plus a dim on all non-hovered rows.
    - User feedback (2026-05-12): "trạng thái thả chỉ ở folder được kéo tới" - drop state only on the target. Removed both effects; only the hovered `FolderNode` lights up (`bg-brand-100 ring-2 ring-inset ring-brand-400` via `dropHover`).

13. **`data-flexa-mf-droptree` marker on the tree container** (Phase 4.5)
    - `suppressPluploadForOurDrags` listens at document level in capture phase to neutralize WP's uploader. Capture-phase `stopImmediatePropagation()` on the whole tree would also kill FolderNode's own drop handler.
    - Decision: scope the guard via `event.target.closest("[data-flexa-mf-droptree]")` - outside the tree gets stopped, inside is let through. The marker is a plain data attribute (no React behavior depends on it) so it's safe to add to both populated and empty-state containers.

14. **Two-pronged plupload "Drop files to upload" suppression** (Phase 4.5)
    - WP `wp.Uploader` listens on `document` for dragenter/dragover and adds `.drag-drop` to `<body>`, which CSS turns into the dimming "Drop files to upload" overlay. It also handles `drop` and starts an upload - which would intercept folder drops that miss a row.
    - Decision: belt-and-braces - (a) capture-phase listeners in `wp-media-bridge.ts#suppressPluploadForOurDrags` remove the `.drag-drop` class and `stopImmediatePropagation()` on out-of-tree drops, plus (b) CSS rules under `body[data-flexa-mf-dragging="1"]` hide `.uploader-window` / `#drag-drop-area` outright so even if the listener races, the overlay can't appear.

15. **Folder filtering via `library.props.flexa_mf_folder`, not `Query.prototype._requestArgs`** (Phase 4.5, **bug fix**)
    - **The bug:** Phase 3's `patchQueryArgs` overrode `Query.prototype._requestArgs` to inject `flexa_mf_folder`. That method **does not exist** in WP's `media-models.js` - `wp.media.model.Query.sync()` reads `this.args` directly, which was assembled at construction time from `library.props.toJSON()`. Our override was a never-called orphan; every AJAX request went out with no folder filter and the server returned the full library. (Verified against `wp-includes/js/media-models.js` lines 136-167 and 247-307.)
    - **The fix:** drop the `_requestArgs` patch entirely and write the bucket onto the library's `props` Backbone model: `props.set({ flexa_mf_folder: bucket, flexaMfStamp: Date.now() })`. WP wires `props.on('change', this._requery)` for query-backed collections, so `_requery` rebuilds the `Query` via `Query.get(props.toJSON())`, the `propmap` passes our key through unchanged, `sync()` packs it into `options.data.query.flexa_mf_folder`, and PHP `QueryFilter::copy_ajax_query_var` reads `$_REQUEST['query']['flexa_mf_folder']`.
    - `null` is silently dropped by `Query.get` (line 280 `if (_.isNull(value)) return`), so we can express "all files" by setting `flexa_mf_folder: null`. `flexaMfStamp` ensures `change` fires even when the bucket is unchanged (e.g. after assigning attachments to the currently-selected folder).
    - `findActiveLibrary()` replaces the old `frame.controller?.state?.()` path, which only worked for child views - `wp.media.frame` is itself the state machine and exposes `state()` directly. Falls back to a `knownBrowsers` Set populated by `patchAttachmentsBrowser` for cases where no global frame is exposed (nested ACF/Elementor frames).
    - **Lesson:** check the actual WP source before assuming a method exists. The phrase "Phase 3 - Complete" in the prior CLAUDE.md hid this bug because the rest of the integration (drag-to-folder, sidebar mount, query-var copy on PHP side) worked. It took user verification of the AJAX response payload to surface it.

## Next steps - Phase 5 (Pro plugin scaffold)

Phase 5 starts a **separate plugin repo** at `flexa-media-folders-pro/` (sibling directory). Free must continue to work standalone after Pro is added.

1. **Remaining manual verification before Phase 5** - Phase 4.5 confirmed the folder-click filter works. Still to verify in a single end-to-end pass:
   - `upload.php?mode=list` (server-rendered table) - folder click in list view currently has no effect because `wp.media.frame` may not exist there. Decide whether to (a) navigate to `?flexa_mf_folder=ID` for a full reload, or (b) accept list-view as filter-less. Recommended: (a), minimal change to `subscribeFolderChanges`.
   - Post-edit media modal (Gutenberg + Classic Editor) - confirm sidebar mounts, filter applies, drag-to-folder works inside the modal.
   - Settings page reset wipes both tables; toggle each setting and confirm persistence across reload.
   - Switch admin color scheme to Midnight; confirm tree dark mode and that toast colors remain readable on dark surfaces.
   - 100-fixture import: create a nested tree 4 levels deep, drag 20 attachments across folders, confirm count badges update and tree-load stays under ~300 ms.

2. **Pro plugin scaffold** (when ready)
   - `flexa-media-folders-pro/flexa-media-folders-pro.php` - bootstrap, requires-Free check, admin notice on missing dependency.
   - `composer.json` PSR-4 `Flexa\MediaFoldersPro\` → `src/`.
   - Separate Vite config (`apps/admin-pro/vite.config.ts`) externalizing the Free slot API via a `window.flexaMF` global Free publishes.
   - `Plugin.php`: registers into Free's hook contract (`flexa_mf/folder/capabilities`, `flexa_mf/folder/upload_mime_types`, `flexa_mf/rest/register_routes`, `flexa_mf/data_reset`).
   - License stub: `License/LicenseManager.php`, `License/Updater.php` - graceful expiry, no hard-blocking on missing key.

3. **Pro-to-Free contract surfaces that need publishing from Free before Phase 5**
   - PHP filter `flexa_mf/folder/capabilities` (already partly threaded through `Support\Capabilities`) - verify it's actually applied at every gate.
   - PHP action `flexa_mf/rest/register_routes` - currently not fired; needs to be added to `RegisterFacade` so Pro can register its own routes under the same namespace.
   - JS slot registry (`apps/admin/src/lib/slots.tsx`) - scaffolded but no consumer; verify it exports a stable Slot/Fill API before Pro depends on it.
   - JS event `flexa-mf:tree:contextmenu` - not yet emitted; would need a custom event dispatch from `FolderNode`'s context menu open.
   - Outcome: small audit pass before Phase 5 to wire the contract surfaces the plan calls out.

4. **Deferred open questions to revisit at Phase 5/6 boundaries**
   - License system: custom minimal vs. EDD Software Licensing (Phase 5).
   - PhotoSwipe v5 vs. Fancybox for Gallery block lightbox (Phase 6 block work).
   - ZIP download streaming vs. generate-and-redirect (Phase 6 ZIP feature).

## Known gaps / debt

- No PHPUnit suite yet - plan calls for repo tests in Phase 1, deferred. Should land before Phase 5 to lock in the contract Pro consumes.
- No automated browser smoke test; manual verification only.
- `Pro-to-Free contract` action `flexa_mf/rest/register_routes` not yet fired (see above).
- `apps/admin/src/lib/slots.tsx` is scaffolded but unused - needs at least one Free-side consumer (e.g., `<ToolbarSlot>`) to prove the API before Pro depends on it.
- **List-view (`upload.php?mode=list`) folder filter not wired** - `wp.media.frame` may be absent there; needs URL-param navigation fallback (see Phase 5 step 1).
- **Folder "Download" menu item is a stub** - `window.alert` placeholder; real implementation is a Pro feature (ZIP stream).
- **No drag-to-multi-select in tree** - clicking a folder selects exactly one. Multi-select for bulk move/delete is a Pro nicety, not in Free scope.
- **`color` column written by Free now** - Phase 4.5 ships the color picker UI; decision #8 originally said "Free leaves it NULL, Pro writes it". This is no longer true - color is a Free feature. Pro will need to be aware that the column may be non-null on install.
