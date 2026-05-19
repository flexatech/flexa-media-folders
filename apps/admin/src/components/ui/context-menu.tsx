import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import { ChevronRight } from "lucide-react";
import {
    forwardRef,
    type ComponentPropsWithoutRef,
    type ElementRef,
} from "react";
import { cn } from "@/lib/cn";

export const ContextMenu = ContextMenuPrimitive.Root;
export const ContextMenuTrigger = ContextMenuPrimitive.Trigger;
export const ContextMenuGroup = ContextMenuPrimitive.Group;
export const ContextMenuPortal = ContextMenuPrimitive.Portal;
export const ContextMenuSub = ContextMenuPrimitive.Sub;

export const ContextMenuSubTrigger = forwardRef<
    ElementRef<typeof ContextMenuPrimitive.SubTrigger>,
    ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubTrigger>
>(({ className, children, ...props }, ref) => (
    <ContextMenuPrimitive.SubTrigger
        ref={ref}
        className={cn(
            "fmf:relative fmf:flex fmf:cursor-pointer fmf:select-none fmf:items-center fmf:gap-3 fmf:rounded-sm fmf:px-3 fmf:py-2 fmf:text-left fmf:text-sm fmf:outline-none fmf:transition-colors",
            "fmf:focus:bg-slate-100 fmf:data-[state=open]:bg-slate-100",
            className,
        )}
        {...props}
    >
        {children}
        <ChevronRight aria-hidden className="fmf:h-4 fmf:w-4 fmf:text-slate-500" />
    </ContextMenuPrimitive.SubTrigger>
));
ContextMenuSubTrigger.displayName = ContextMenuPrimitive.SubTrigger.displayName;

export const ContextMenuSubContent = forwardRef<
    ElementRef<typeof ContextMenuPrimitive.SubContent>,
    ComponentPropsWithoutRef<typeof ContextMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
    <ContextMenuPrimitive.Portal>
        <ContextMenuPrimitive.SubContent
            ref={ref}
            className={cn(
                "fmf:z-[160002] fmf:min-w-[10rem] fmf:overflow-hidden fmf:rounded-md fmf:border fmf:border-slate-200 fmf:bg-white fmf:p-1.5 fmf:text-slate-900 fmf:shadow-md",
                className,
            )}
            {...props}
        />
    </ContextMenuPrimitive.Portal>
));
ContextMenuSubContent.displayName = ContextMenuPrimitive.SubContent.displayName;
export const ContextMenuSeparator = forwardRef<
    ElementRef<typeof ContextMenuPrimitive.Separator>,
    ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
    <ContextMenuPrimitive.Separator
        ref={ref}
        className={cn("fmf:-mx-1 fmf:my-1 fmf:h-px fmf:bg-slate-200", className)}
        {...props}
    />
));
ContextMenuSeparator.displayName = ContextMenuPrimitive.Separator.displayName;

export const ContextMenuContent = forwardRef<
    ElementRef<typeof ContextMenuPrimitive.Content>,
    ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Content>
>(({ className, ...props }, ref) => (
    <ContextMenuPrimitive.Portal>
        <ContextMenuPrimitive.Content
            ref={ref}
            className={cn(
                "fmf:z-[160002] fmf:min-w-[16rem] fmf:overflow-hidden fmf:rounded-md fmf:border fmf:border-slate-200 fmf:bg-white fmf:p-1.5 fmf:text-slate-900 fmf:shadow-md",
                className,
            )}
            {...props}
        />
    </ContextMenuPrimitive.Portal>
));
ContextMenuContent.displayName = ContextMenuPrimitive.Content.displayName;

export const ContextMenuItem = forwardRef<
    ElementRef<typeof ContextMenuPrimitive.Item>,
    ComponentPropsWithoutRef<typeof ContextMenuPrimitive.Item> & { destructive?: boolean }
>(({ className, destructive, ...props }, ref) => (
    <ContextMenuPrimitive.Item
        ref={ref}
        className={cn(
            "fmf:relative fmf:flex fmf:cursor-pointer fmf:select-none fmf:items-center fmf:gap-3 fmf:rounded-sm fmf:px-3 fmf:py-2 fmf:text-left fmf:text-sm fmf:outline-none fmf:transition-colors",
            "fmf:focus:bg-slate-100 fmf:data-[disabled]:pointer-events-none fmf:data-[disabled]:opacity-50",
            destructive && "fmf:text-red-600 fmf:focus:bg-red-50 fmf:focus:text-red-700",
            className,
        )}
        {...props}
    />
));
ContextMenuItem.displayName = ContextMenuPrimitive.Item.displayName;
