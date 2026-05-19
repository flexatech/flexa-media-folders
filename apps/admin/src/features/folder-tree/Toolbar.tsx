import { __ } from "@/lib/i18n";

export function Toolbar() {
    return (
        <div className="fmf:flex fmf:items-center fmf:justify-center fmf:gap-2 fmf:border-b fmf:border-slate-200 fmf:pb-3 fmf:pl-10 fmf:pr-10">
            <h2 className="fmf:text-xs fmf:font-semibold fmf:uppercase fmf:tracking-wider fmf:text-slate-500">
                {__("Directory")}
            </h2>
        </div>
    );
}
