import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

interface SwitchProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
    checked: boolean;
    onCheckedChange: (next: boolean) => void;
}

/**
 * Minimal CSS-only toggle - no extra Radix package needed. The hidden input
 * is what the form/keyboard interacts with; the visual is two divs that
 * follow the `peer-checked:` state.
 */
export const Switch = forwardRef<HTMLInputElement, SwitchProps>(
    ({ checked, onCheckedChange, className, disabled, id, ...rest }, ref) => {
        return (
            <label
                className={cn(
                    "fmf:relative fmf:inline-flex fmf:h-5 fmf:w-9 fmf:cursor-pointer fmf:items-center",
                    disabled && "fmf:cursor-not-allowed fmf:opacity-60",
                    className,
                )}
            >
                <input
                    ref={ref}
                    id={id}
                    type="checkbox"
                    role="switch"
                    checked={checked}
                    disabled={disabled}
                    onChange={(e) => onCheckedChange(e.target.checked)}
                    className="fmf:peer fmf:sr-only"
                    {...rest}
                />
                <span
                    aria-hidden
                    className="fmf:h-5 fmf:w-9 fmf:rounded-full fmf:bg-slate-300 fmf:transition-colors fmf:peer-checked:bg-brand-600 fmf:peer-focus-visible:ring-2 fmf:peer-focus-visible:ring-brand-500 fmf:peer-focus-visible:ring-offset-2"
                />
                <span
                    aria-hidden
                    className="fmf:absolute fmf:left-0.5 fmf:h-4 fmf:w-4 fmf:rounded-full fmf:bg-white fmf:shadow fmf:transition-transform fmf:peer-checked:translate-x-4"
                />
            </label>
        );
    },
);
Switch.displayName = "Switch";
