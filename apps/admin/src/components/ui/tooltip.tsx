import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import {
    forwardRef,
    type ComponentPropsWithoutRef,
    type ElementRef,
} from "react";
import { cn } from "@/lib/cn";

export const TooltipProvider = TooltipPrimitive.Provider;
export const Tooltip = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipContent = forwardRef<
    ElementRef<typeof TooltipPrimitive.Content>,
    ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
    <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
            ref={ref}
            sideOffset={sideOffset}
            className={cn(
                "fmf:z-[160003] fmf:overflow-hidden fmf:rounded-md fmf:bg-slate-900 fmf:px-2.5 fmf:py-1.5 fmf:text-xs fmf:font-medium fmf:text-slate-50 fmf:shadow-md fmf:animate-in fmf:fade-in-0 fmf:zoom-in-95 fmf:data-[state=closed]:animate-out fmf:data-[state=closed]:fade-out-0 fmf:data-[state=closed]:zoom-out-95 fmf:data-[side=bottom]:slide-in-from-top-1 fmf:data-[side=left]:slide-in-from-right-1 fmf:data-[side=right]:slide-in-from-left-1 fmf:data-[side=top]:slide-in-from-bottom-1",
                className,
            )}
            {...props}
        />
    </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;
