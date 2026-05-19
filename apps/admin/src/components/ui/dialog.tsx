import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import {
    forwardRef,
    type ComponentPropsWithoutRef,
    type ElementRef,
    type HTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

const DialogOverlay = forwardRef<
    ElementRef<typeof DialogPrimitive.Overlay>,
    ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
    <DialogPrimitive.Overlay
        ref={ref}
        className={cn(
            "fmf:fixed fmf:inset-0 fmf:z-[160001] fmf:bg-black/40 fmf:backdrop-blur-sm fmf:data-[state=open]:animate-in fmf:data-[state=closed]:animate-out fmf:data-[state=closed]:fade-out-0 fmf:data-[state=open]:fade-in-0",
            className,
        )}
        {...props}
    />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

interface DialogContentProps
    extends ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
    overlayClassName?: string;
}

export const DialogContent = forwardRef<
    ElementRef<typeof DialogPrimitive.Content>,
    DialogContentProps
>(({ className, overlayClassName, children, ...props }, ref) => (
    <DialogPrimitive.Portal>
        <DialogOverlay className={overlayClassName} />
        <DialogPrimitive.Content
            ref={ref}
            className={cn(
                "fmf:fixed fmf:left-1/2 fmf:top-1/2 fmf:z-[160002] fmf:grid fmf:w-full fmf:max-w-md fmf:-translate-x-1/2 fmf:-translate-y-1/2 fmf:gap-4 fmf:rounded-lg fmf:border fmf:border-slate-200 fmf:bg-white fmf:p-6 fmf:shadow-xl",
                "fmf:data-[state=open]:animate-in fmf:data-[state=closed]:animate-out",
                className,
            )}
            {...props}
        >
            {children}
            <DialogPrimitive.Close className="fmf:absolute fmf:right-4 fmf:top-4 fmf:rounded-sm fmf:opacity-70 fmf:transition-opacity fmf:hover:opacity-100 fmf:focus:outline-none fmf:focus:ring-2 fmf:focus:ring-brand-500">
                <X className="fmf:h-4 fmf:w-4" />
                <span className="fmf:sr-only">Close</span>
            </DialogPrimitive.Close>
        </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

export const DialogHeader = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
    <div className={cn("fmf:flex fmf:flex-col fmf:space-y-1.5 fmf:text-left", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

export const DialogFooter = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => (
    <div className={cn("fmf:flex fmf:justify-end fmf:gap-2", className)} {...props} />
);
DialogFooter.displayName = "DialogFooter";

export const DialogTitle = forwardRef<
    ElementRef<typeof DialogPrimitive.Title>,
    ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
    <DialogPrimitive.Title
        ref={ref}
        className={cn("fmf:text-lg fmf:font-semibold fmf:leading-none fmf:tracking-tight", className)}
        {...props}
    />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

export const DialogDescription = forwardRef<
    ElementRef<typeof DialogPrimitive.Description>,
    ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
    <DialogPrimitive.Description
        ref={ref}
        className={cn("fmf:text-sm fmf:text-slate-500", className)}
        {...props}
    />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;
