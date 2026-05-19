import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import {
    forwardRef,
    type ComponentPropsWithoutRef,
    type ElementRef,
} from "react";
import { cn } from "@/lib/cn";

export const DropdownMenu = DropdownMenuPrimitive.Root;
export const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
export const DropdownMenuGroup = DropdownMenuPrimitive.Group;
export const DropdownMenuPortal = DropdownMenuPrimitive.Portal;

export const DropdownMenuSeparator = forwardRef<
    ElementRef<typeof DropdownMenuPrimitive.Separator>,
    ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
    <DropdownMenuPrimitive.Separator
        ref={ref}
        className={cn("fmf:-mx-1 fmf:my-1 fmf:h-px fmf:bg-slate-200", className)}
        {...props}
    />
));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

export const DropdownMenuContent = forwardRef<
    ElementRef<typeof DropdownMenuPrimitive.Content>,
    ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 6, ...props }, ref) => (
    <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
            ref={ref}
            sideOffset={sideOffset}
            className={cn(
                "fmf:z-[160002] fmf:min-w-[12rem] fmf:overflow-hidden fmf:rounded-md fmf:border fmf:border-slate-200 fmf:bg-white fmf:p-1 fmf:text-slate-900 fmf:shadow-md",
                className,
            )}
            {...props}
        />
    </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

export const DropdownMenuItem = forwardRef<
    ElementRef<typeof DropdownMenuPrimitive.Item>,
    ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
        destructive?: boolean;
        active?: boolean;
    }
>(({ className, destructive, active, ...props }, ref) => (
    <DropdownMenuPrimitive.Item
        ref={ref}
        className={cn(
            "fmf:relative fmf:flex fmf:cursor-pointer fmf:select-none fmf:items-center fmf:gap-2 fmf:rounded-sm fmf:px-2 fmf:py-1.5 fmf:text-sm fmf:outline-none fmf:transition-colors",
            "fmf:focus:bg-slate-100 fmf:data-[disabled]:pointer-events-none fmf:data-[disabled]:opacity-50",
            active && "fmf:bg-slate-100 fmf:font-medium",
            destructive && "fmf:text-red-600 fmf:focus:bg-red-50 fmf:focus:text-red-700",
            className,
        )}
        {...props}
    />
));
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;
