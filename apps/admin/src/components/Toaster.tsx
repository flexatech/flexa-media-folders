import { Check, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";
import { useUiStore } from "@/lib/store";

const AUTO_DISMISS_MS = 2500;

let activeClaim: symbol | null = null;

/**
 * The admin app mounts multiple React roots (upload sidebar + every open
 * media modal). A module-level claim ensures only the first-mounted Toaster
 * renders, so we don't get duplicate portal'd toasts on top of one another.
 */
export function Toaster() {
    const toast = useUiStore((s) => s.toast);
    const dismiss = useUiStore((s) => s.dismissToast);
    const [owns, setOwns] = useState(false);

    useEffect(() => {
        if (activeClaim !== null) {
            return;
        }
        const claim = Symbol("toaster");
        activeClaim = claim;
        setOwns(true);
        return () => {
            if (activeClaim === claim) {
                activeClaim = null;
            }
            setOwns(false);
        };
    }, []);

    useEffect(() => {
        if (!owns || !toast) {
            return;
        }
        const timer = window.setTimeout(dismiss, AUTO_DISMISS_MS);
        return () => window.clearTimeout(timer);
    }, [owns, toast, dismiss]);

    if (!owns || !toast) {
        return null;
    }

    return createPortal(
        <div
            key={toast.id}
            role="status"
            aria-live="polite"
            className="flexa-mf-toast fmf:pointer-events-none fmf:fixed fmf:left-1/2 fmf:top-6 fmf:z-[160003] fmf:-translate-x-1/2"
        >
            <div
                className={cn(
                    "fmf:pointer-events-auto fmf:flex fmf:items-center fmf:gap-2 fmf:rounded-full fmf:px-4 fmf:py-2 fmf:text-sm fmf:shadow-lg fmf:ring-1",
                    toast.tone === "error"
                        ? "fmf:bg-red-50 fmf:text-red-700 fmf:ring-red-200"
                        : "fmf:bg-emerald-50 fmf:text-emerald-800 fmf:ring-emerald-200",
                )}
            >
                {toast.tone === "error" ? (
                    <X aria-hidden className="fmf:h-4 fmf:w-4" />
                ) : (
                    <Check aria-hidden className="fmf:h-4 fmf:w-4" />
                )}
                <span>{toast.message}</span>
            </div>
        </div>,
        document.body,
    );
}
