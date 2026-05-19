import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ className, type = "text", ...props }, ref) => {
        return (
            <input
                ref={ref}
                type={type}
                className={cn(
                    "fmf:flex fmf:h-9 fmf:w-full fmf:rounded-md fmf:border fmf:border-slate-300 fmf:bg-white fmf:px-3 fmf:py-1 fmf:text-sm fmf:shadow-sm fmf:transition-colors",
                    "fmf:placeholder:text-slate-400",
                    "fmf:focus-visible:outline-none fmf:focus-visible:ring-2 fmf:focus-visible:ring-brand-500 fmf:focus-visible:ring-offset-1",
                    "fmf:disabled:cursor-not-allowed fmf:disabled:opacity-50",
                    className,
                )}
                {...props}
            />
        );
    },
);
Input.displayName = "Input";
