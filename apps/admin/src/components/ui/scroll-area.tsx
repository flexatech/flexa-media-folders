import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import {
    forwardRef,
    type ComponentPropsWithoutRef,
    type ElementRef,
} from "react";
import { cn } from "@/lib/cn";

export const ScrollArea = forwardRef<
    ElementRef<typeof ScrollAreaPrimitive.Root>,
    ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root>
>(({ className, children, ...props }, ref) => (
    <ScrollAreaPrimitive.Root
        ref={ref}
        className={cn("fmf:relative fmf:overflow-hidden", className)}
        {...props}
    >
        <ScrollAreaPrimitive.Viewport
            data-flexa-mf-scroll-viewport=""
            className="fmf:h-full fmf:w-full fmf:rounded-[inherit] fmf:overscroll-contain"
        >
            {children}
        </ScrollAreaPrimitive.Viewport>
        <ScrollBar />
        <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
));
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName;

export const ScrollBar = forwardRef<
    ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
    ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
        ref={ref}
        orientation={orientation}
        className={cn(
            "fmf:flex fmf:touch-none fmf:select-none fmf:transition-colors",
            orientation === "vertical" &&
                "fmf:h-full fmf:w-2 fmf:border-l fmf:border-l-transparent fmf:p-px",
            orientation === "horizontal" &&
                "fmf:h-2 fmf:flex-col fmf:border-t fmf:border-t-transparent fmf:p-px",
            className,
        )}
        {...props}
    >
        <ScrollAreaPrimitive.ScrollAreaThumb
            className={cn(
                "fmf:relative fmf:flex-1 fmf:rounded-full fmf:bg-slate-300/70 fmf:transition-colors fmf:hover:bg-slate-400/80",
                "fmf:dark:bg-white/15 fmf:dark:hover:bg-white/25",
            )}
        />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
));
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName;
