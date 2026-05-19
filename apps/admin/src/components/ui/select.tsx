import { forwardRef, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
    options: Array<{ value: string; label: string }>;
}

/**
 * Lightweight native `<select>`. We deliberately avoid the Radix Select for
 * the settings page - native renders correctly inside the WP admin frame
 * and is fully a11y/keyboard-conformant out of the box.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
    ({ options, className, ...rest }, ref) => (
        <select
            ref={ref}
            className={cn(
                "fmf:h-9 fmf:rounded-md fmf:border fmf:border-slate-300 fmf:bg-white fmf:px-2 fmf:text-sm fmf:text-slate-900 fmf:shadow-sm fmf:transition-colors",
                "fmf:focus-visible:outline-none fmf:focus-visible:ring-2 fmf:focus-visible:ring-brand-500 fmf:focus-visible:ring-offset-1",
                "fmf:disabled:cursor-not-allowed fmf:disabled:opacity-60",
                className,
            )}
            {...rest}
        >
            {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                    {opt.label}
                </option>
            ))}
        </select>
    ),
);
Select.displayName = "Select";
