import { Folder } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { _n, sprintf } from "@/lib/i18n";

interface DragState {
    count: number;
}

let activeClaim: symbol | null = null;

/**
 * Singleton tooltip that follows the cursor during attachment drag. Multiple
 * React roots may mount this component; only the first-claim instance renders
 * and listens for events, to avoid duplicate tooltips and event listeners.
 */
export function DragTooltip() {
    const [owns, setOwns] = useState(false);
    const [drag, setDrag] = useState<DragState | null>(null);
    const [pos, setPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        if (activeClaim !== null) {
            return;
        }
        const claim = Symbol("drag-tooltip");
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
        if (!owns) {
            return;
        }
        const onStart = (event: Event) => {
            const detail = (event as CustomEvent<{ count?: number }>).detail;
            const count = detail?.count ?? 1;
            setDrag({ count });
        };
        const onEnd = () => setDrag(null);

        const onDragOver = (event: DragEvent) => {
            if (rafRef.current !== null) {
                return;
            }
            const x = event.clientX;
            const y = event.clientY;
            rafRef.current = window.requestAnimationFrame(() => {
                rafRef.current = null;
                setPos({ x, y });
            });
        };

        window.addEventListener("flexa-mf:drag-start", onStart as EventListener);
        window.addEventListener("flexa-mf:drag-end", onEnd as EventListener);
        window.addEventListener("dragover", onDragOver);
        return () => {
            window.removeEventListener("flexa-mf:drag-start", onStart as EventListener);
            window.removeEventListener("flexa-mf:drag-end", onEnd as EventListener);
            window.removeEventListener("dragover", onDragOver);
            if (rafRef.current !== null) {
                window.cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
        };
    }, [owns]);

    if (!owns || !drag) {
        return null;
    }

    const label = sprintf(
        _n("Move %s item", "Move %s items", drag.count),
        drag.count,
    );

    return createPortal(
        <div
            aria-hidden
            className="flexa-mf-drag-tooltip fmf:pointer-events-none fmf:fixed fmf:z-[160003] fmf:flex fmf:items-center fmf:gap-2 fmf:rounded-full fmf:bg-slate-900 fmf:px-3 fmf:py-1.5 fmf:text-xs fmf:font-medium fmf:text-white fmf:shadow-lg"
            style={{ left: pos.x + 14, top: pos.y + 14 }}
        >
            <Folder className="fmf:h-3.5 fmf:w-3.5" />
            <span>{label}</span>
        </div>,
        document.body,
    );
}
