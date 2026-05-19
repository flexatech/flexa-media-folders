import * as LabelPrimitive from "@radix-ui/react-label";
import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/cn";

export const Label = forwardRef<
    HTMLLabelElement,
    ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
    <LabelPrimitive.Root
        ref={ref}
        className={cn(
            "fmf:text-sm fmf:font-medium fmf:leading-none fmf:text-slate-800 fmf:peer-disabled:cursor-not-allowed fmf:peer-disabled:opacity-70",
            className,
        )}
        {...props}
    />
));
Label.displayName = "Label";
