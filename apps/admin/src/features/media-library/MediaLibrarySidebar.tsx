import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useLayoutEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { AppProviders } from "@/app/providers";
import { __ } from "@/lib/i18n";
import { useUiStore } from "@/lib/store";
import { FolderTreeApp } from "../folder-tree/FolderTreeApp";
import { SidebarMenu } from "./SidebarMenu";

interface MediaLibrarySidebarProps {
    variant?: "upload" | "modal";
}

const SIDEBAR_MIN_WIDTH = 260;
const SIDEBAR_MAX_WIDTH = 670;
const SIDEBAR_MIN_HEIGHT = 600;
const SIDEBAR_MAX_HEIGHT = 3000;

/**
 * Wrapper used wherever the sidebar mounts (upload.php rail + each open media
 * modal). Sets a host class so its layout container CSS picks it up, and
 * enables HTML5 attachment drops on folder nodes.
 *
 * The `variant` toggle controls a single sidebar-host responsibility: only
 * upload.php gets the collapse rail. Modal sidebars stay always-expanded
 * because they live inside a fixed-size modal column already.
 */
export function MediaLibrarySidebar({ variant = "modal" }: MediaLibrarySidebarProps) {
    return (
        <AppProviders>
            <SidebarShell variant={variant} />
        </AppProviders>
    );
}

function SidebarShell({ variant }: { variant: "upload" | "modal" }) {
    const collapsed = useUiStore((s) => s.sidebarCollapsed);
    const toggle = useUiStore((s) => s.toggleSidebar);
    const width = useUiStore((s) => s.uploadSidebarWidth);
    const setWidth = useUiStore((s) => s.setUploadSidebarWidth);
    const height = useUiStore((s) => s.uploadSidebarHeight);
    const setHeight = useUiStore((s) => s.setUploadSidebarHeight);
    const hostRef = useRef<HTMLDivElement>(null);
    const isUpload = variant === "upload";

    // Mirror the persisted width onto the bridge-owned outer
    // .flexa-mf-upload-sidebar as a CSS variable. Layout CSS reads
    // `var(--flexa-mf-sidebar-width)` so React never has to write inline
    // width on a DOM node it didn't render. useLayoutEffect runs before
    // paint so there's no flash from the 260px default.
    useLayoutEffect(() => {
        if (!isUpload) {
            return;
        }
        const parent = hostRef.current?.closest<HTMLElement>(
            ".flexa-mf-upload-sidebar",
        );
        if (!parent) {
            return;
        }
        parent.style.setProperty("--flexa-mf-sidebar-width", `${width}px`);
        if (height === null) {
            parent.style.removeProperty("--flexa-mf-sidebar-height");
        } else {
            parent.style.setProperty(
                "--flexa-mf-sidebar-height",
                `${height}px`,
            );
        }
    }, [isUpload, width, height, collapsed]);

    const handleResizeStart = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (event.button !== 0) {
            return;
        }
        event.preventDefault();
        const startX = event.clientX;
        const startWidth = width;
        document.body.dataset.flexaMfResizing = "1";
        const onMove = (ev: PointerEvent) => {
            const next = Math.max(
                SIDEBAR_MIN_WIDTH,
                Math.min(
                    SIDEBAR_MAX_WIDTH,
                    startWidth + (ev.clientX - startX),
                ),
            );
            setWidth(next);
        };
        const onUp = () => {
            delete document.body.dataset.flexaMfResizing;
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
        };
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
    };

    const handleVResizeStart = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (event.button !== 0) {
            return;
        }
        event.preventDefault();
        const startY = event.clientY;
        // First drag: height is null (CSS default `calc(100vh - 32px)`). Read
        // the parent's current rendered height so the drag starts from where
        // the user sees the box, not from a constant.
        const parent = hostRef.current?.closest<HTMLElement>(
            ".flexa-mf-upload-sidebar",
        );
        const startHeight =
            height ??
            parent?.getBoundingClientRect().height ??
            SIDEBAR_MIN_HEIGHT;
        document.body.dataset.flexaMfVresizing = "1";
        const onMove = (ev: PointerEvent) => {
            const next = Math.max(
                SIDEBAR_MIN_HEIGHT,
                Math.min(
                    SIDEBAR_MAX_HEIGHT,
                    startHeight + (ev.clientY - startY),
                ),
            );
            setHeight(next);
        };
        const onUp = () => {
            delete document.body.dataset.flexaMfVresizing;
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
        };
        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
    };

    const toggleButton = isUpload ? (
        <button
            type="button"
            onClick={toggle}
            aria-label={collapsed ? __("Show folders") : __("Hide folders")}
            title={collapsed ? __("Show folders") : __("Hide folders")}
            className={
                collapsed
                    ? "fmf:absolute fmf:right-0.5 fmf:top-4 fmf:z-20 fmf:flex fmf:h-8 fmf:w-8 fmf:cursor-pointer fmf:items-center fmf:justify-center fmf:rounded-md fmf:border fmf:border-slate-200 fmf:bg-white fmf:text-slate-600 fmf:shadow-sm fmf:transition-colors fmf:hover:bg-slate-50 fmf:hover:text-slate-900 fmf:focus-visible:outline-none fmf:focus-visible:ring-2 fmf:focus-visible:ring-brand-500"
                    : "fmf:absolute fmf:right-2 fmf:top-4 fmf:z-20 fmf:flex fmf:h-8 fmf:w-8 fmf:cursor-pointer fmf:items-center fmf:justify-center fmf:rounded-md fmf:text-slate-500 fmf:transition-colors fmf:hover:bg-slate-100 fmf:hover:text-slate-900 fmf:focus-visible:outline-none fmf:focus-visible:ring-2 fmf:focus-visible:ring-brand-500"
            }
            style={collapsed ? undefined : { marginRight: "-0" }}
        >
            {collapsed ? (
                <PanelLeftOpen aria-hidden className="fmf:h-4 fmf:w-4" />
            ) : (
                <PanelLeftClose aria-hidden className="fmf:h-4 fmf:w-4" />
            )}
        </button>
    ) : null;

    if (isUpload && collapsed) {
        return (
            <div
                className="flexa-mf-sidebar-host fmf:relative fmf:h-full"
                data-flexa-mf-collapsed="1"
            >
                {toggleButton}
            </div>
        );
    }

    return (
        <div
            ref={hostRef}
            className="flexa-mf-sidebar-host fmf:relative fmf:h-full"
        >
            <FolderTreeApp enableAttachmentDrops />
            <SidebarMenu />
            {toggleButton}
            {isUpload && (
                <div
                    className="flexa-mf-resize-handle"
                    role="separator"
                    aria-orientation="vertical"
                    aria-label={__("Resize sidebar")}
                    aria-valuemin={SIDEBAR_MIN_WIDTH}
                    aria-valuemax={SIDEBAR_MAX_WIDTH}
                    aria-valuenow={width}
                    onPointerDown={handleResizeStart}
                />
            )}
            {isUpload && (
                <div
                    className="flexa-mf-vresize-handle"
                    role="separator"
                    aria-orientation="horizontal"
                    aria-label={__("Resize sidebar height")}
                    aria-valuemin={SIDEBAR_MIN_HEIGHT}
                    aria-valuemax={SIDEBAR_MAX_HEIGHT}
                    aria-valuenow={height ?? undefined}
                    onPointerDown={handleVResizeStart}
                />
            )}
        </div>
    );
}
