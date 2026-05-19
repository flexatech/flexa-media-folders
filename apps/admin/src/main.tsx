import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { AppProviders } from "./app/providers";
import { FolderTreeApp } from "./features/folder-tree/FolderTreeApp";
import { MediaLibrarySidebar } from "./features/media-library/MediaLibrarySidebar";
import { installMediaBridge, registerBridgeBus } from "./lib/wp-media-bridge";
import { getFlexaMF } from "./lib/wp";
import "./styles/index.css";

/**
 * Three possible mount surfaces:
 *  - Standalone preview root (`#flexa-mf-admin-root` - when an integrator
 *    drops the tree somewhere themselves).
 *  - The upload.php list/grid screen - bridge injects a left rail.
 *  - Each open media modal - bridge injects a sidebar into AttachmentsBrowser.
 *
 * The bridge owns lifecycle for the modal sidebars (they come and go as
 * the user opens/closes modals); we keep a Map of created roots so we can
 * unmount cleanly.
 */
const flexaMF = window.flexaMF ? getFlexaMF() : null;
const isMediaLibrary = flexaMF?.context === "media-library";

const explicitRoot = document.getElementById("flexa-mf-admin-root");
if (explicitRoot) {
    createRoot(explicitRoot).render(
        <StrictMode>
            <AppProviders>
                <FolderTreeApp />
            </AppProviders>
        </StrictMode>,
    );
}

if (isMediaLibrary) {
    const modalRoots = new Map<string, Root>();
    let uploadRoot: Root | null = null;

    registerBridgeBus({
        mountUploadSidebar: (target) => {
            if (uploadRoot) {
                uploadRoot.unmount();
            }
            uploadRoot = createRoot(target);
            uploadRoot.render(
                <StrictMode>
                    <MediaLibrarySidebar variant="upload" />
                </StrictMode>,
            );
        },
        mountModalSidebar: (target, frameCid) => {
            const existing = modalRoots.get(frameCid);
            if (existing) {
                existing.unmount();
            }
            const root = createRoot(target);
            modalRoots.set(frameCid, root);
            root.render(
                <StrictMode>
                    <MediaLibrarySidebar variant="modal" />
                </StrictMode>,
            );
        },
        unmountModalSidebar: (frameCid) => {
            const root = modalRoots.get(frameCid);
            if (root) {
                root.unmount();
                modalRoots.delete(frameCid);
            }
        },
    });

    // Install on next tick so wp.media has time to load - and retry briefly
    // if it isn't ready yet (some pages load wp-media-utils async).
    let attempts = 0;
    const tryInstall = () => {
        if (installMediaBridge()) {
            return;
        }
        attempts += 1;
        if (attempts < 20) {
            window.setTimeout(tryInstall, 50);
        }
    };
    tryInstall();
}
