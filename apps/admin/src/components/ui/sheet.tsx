import * as SheetPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";
import {
    forwardRef,
    type ComponentPropsWithoutRef,
    type ElementRef,
    type HTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";

export const Sheet = SheetPrimitive.Root;
export const SheetTrigger = SheetPrimitive.Trigger;
export const SheetClose = SheetPrimitive.Close;
export const SheetPortal = SheetPrimitive.Portal;

const SheetOverlay = forwardRef<
    ElementRef<typeof SheetPrimitive.Overlay>,
    ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
    <SheetPrimitive.Overlay
        ref={ref}
        className={cn(
            "fmf:data-[state=open]:animate-in fmf:data-[state=closed]:animate-out fmf:data-[state=closed]:fade-out-0 fmf:data-[state=open]:fade-in-0 fmf:fixed fmf:inset-0 fmf:z-[160001] fmf:bg-slate-900/50",
            className,
        )}
        {...props}
    />
));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

type SheetSide = "top" | "right" | "bottom" | "left";

interface SheetContentProps
    extends ComponentPropsWithoutRef<typeof SheetPrimitive.Content> {
    side?: SheetSide;
    overlayClassName?: string;
    showCloseButton?: boolean;
}

export const SheetContent = forwardRef<
    ElementRef<typeof SheetPrimitive.Content>,
    SheetContentProps
>(
    (
        {
            className,
            overlayClassName,
            children,
            side = "right",
            showCloseButton = true,
            ...props
        },
        ref,
    ) => (
        <SheetPortal>
            <SheetOverlay className={overlayClassName} />
            <SheetPrimitive.Content
                ref={ref}
                className={cn(
                    "fmf:bg-white fmf:data-[state=open]:animate-in fmf:data-[state=closed]:animate-out fmf:fixed fmf:z-[160002] fmf:flex fmf:flex-col fmf:gap-4 fmf:overflow-hidden fmf:shadow-lg fmf:transition fmf:ease-in-out fmf:data-[state=closed]:duration-300 fmf:data-[state=open]:duration-500",
                    side === "right" &&
                        "fmf:data-[state=closed]:slide-out-to-right fmf:data-[state=open]:slide-in-from-right fmf:inset-y-0 fmf:right-0 fmf:h-full fmf:w-3/4 fmf:border-l fmf:border-slate-200 fmf:sm:max-w-md",
                    side === "left" &&
                        "fmf:data-[state=closed]:slide-out-to-left fmf:data-[state=open]:slide-in-from-left fmf:inset-y-0 fmf:left-0 fmf:h-full fmf:w-3/4 fmf:border-r fmf:border-slate-200 fmf:sm:max-w-md",
                    side === "top" &&
                        "fmf:data-[state=closed]:slide-out-to-top fmf:data-[state=open]:slide-in-from-top fmf:inset-x-0 fmf:top-0 fmf:h-auto fmf:border-b fmf:border-slate-200",
                    side === "bottom" &&
                        "fmf:data-[state=closed]:slide-out-to-bottom fmf:data-[state=open]:slide-in-from-bottom fmf:inset-x-0 fmf:bottom-0 fmf:h-auto fmf:border-t fmf:border-slate-200",
                    className,
                )}
                {...props}
            >
                {children}
                {showCloseButton && (
                    <SheetPrimitive.Close
                        className="fmf:absolute fmf:right-4 fmf:top-4 fmf:flex fmf:h-8 fmf:w-8 fmf:cursor-pointer fmf:items-center fmf:justify-center fmf:rounded-md fmf:text-slate-500 fmf:opacity-70 fmf:transition-opacity fmf:hover:bg-slate-100 fmf:hover:text-slate-900 fmf:hover:opacity-100 fmf:focus:outline-none fmf:focus-visible:ring-2 fmf:focus-visible:ring-brand-500"
                        aria-label="Close"
                    >
                        <XIcon className="fmf:h-4 fmf:w-4" aria-hidden />
                    </SheetPrimitive.Close>
                )}
            </SheetPrimitive.Content>
        </SheetPortal>
    ),
);
SheetContent.displayName = SheetPrimitive.Content.displayName;

export const SheetHeader = ({
    className,
    ...props
}: HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn("fmf:flex fmf:flex-col fmf:gap-1.5 fmf:p-4", className)}
        {...props}
    />
);
SheetHeader.displayName = "SheetHeader";

export const SheetFooter = ({
    className,
    ...props
}: HTMLAttributes<HTMLDivElement>) => (
    <div
        className={cn(
            "fmf:mt-auto fmf:flex fmf:flex-col fmf:gap-2 fmf:p-4",
            className,
        )}
        {...props}
    />
);
SheetFooter.displayName = "SheetFooter";

export const SheetTitle = forwardRef<
    ElementRef<typeof SheetPrimitive.Title>,
    ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
    <SheetPrimitive.Title
        ref={ref}
        className={cn(
            "fmf:text-lg fmf:font-semibold fmf:leading-none fmf:tracking-tight fmf:text-slate-900",
            className,
        )}
        {...props}
    />
));
SheetTitle.displayName = SheetPrimitive.Title.displayName;

export const SheetDescription = forwardRef<
    ElementRef<typeof SheetPrimitive.Description>,
    ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
    <SheetPrimitive.Description
        ref={ref}
        className={cn("fmf:text-sm fmf:text-slate-500", className)}
        {...props}
    />
));
SheetDescription.displayName = SheetPrimitive.Description.displayName;
