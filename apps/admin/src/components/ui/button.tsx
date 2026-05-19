import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
    "fmf:inline-flex fmf:cursor-pointer fmf:items-center fmf:justify-center fmf:gap-2 fmf:whitespace-nowrap fmf:rounded-md fmf:text-sm fmf:font-medium fmf:transition-colors fmf:focus-visible:outline-none fmf:focus-visible:ring-2 fmf:focus-visible:ring-offset-2 fmf:disabled:pointer-events-none fmf:disabled:opacity-50",
    {
        variants: {
            variant: {
                default:
                    "fmf:bg-brand-600 fmf:text-white fmf:hover:bg-brand-700 fmf:focus-visible:ring-brand-500",
                ghost: "fmf:bg-transparent fmf:hover:bg-slate-100 fmf:text-slate-900",
                outline:
                    "fmf:border fmf:border-slate-300 fmf:bg-white fmf:hover:bg-slate-50 fmf:text-slate-900",
                destructive:
                    "fmf:bg-red-600 fmf:text-white fmf:hover:bg-red-700 fmf:focus-visible:ring-red-500",
            },
            size: {
                default: "fmf:h-9 fmf:px-4 fmf:py-2",
                sm: "fmf:h-8 fmf:rounded-md fmf:px-3 fmf:text-xs",
                lg: "fmf:h-10 fmf:rounded-md fmf:px-6",
                icon: "fmf:h-9 fmf:w-9",
            },
        },
        defaultVariants: { variant: "default", size: "default" },
    },
);

export interface ButtonProps
    extends ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof buttonVariants> {
    asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild, ...props }, ref) => {
        const Comp = asChild ? Slot : "button";
        return (
            <Comp
                ref={ref}
                className={cn(buttonVariants({ variant, size }), className)}
                {...props}
            />
        );
    },
);
Button.displayName = "Button";

export { buttonVariants };
