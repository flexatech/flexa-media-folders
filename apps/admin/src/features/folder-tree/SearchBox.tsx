import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { __ } from "@/lib/i18n";
import { useUiStore } from "@/lib/store";

export function SearchBox() {
    const search = useUiStore((s) => s.search);
    const setSearch = useUiStore((s) => s.setSearch);

    return (
        <div className="fmf:relative">
            <Search
                className="fmf:pointer-events-none fmf:absolute fmf:left-2.5 fmf:top-1/2 fmf:h-4 fmf:w-4 fmf:-translate-y-1/2 fmf:text-slate-400"
                aria-hidden
            />
            <Input
                placeholder={__("Search folders…")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="fmf:rounded-full fmf:bg-slate-50 fmf:pl-8 fmf:pr-8"
                aria-label={__("Search folders")}
                type="search"
            />
            {search && (
                <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="fmf:absolute fmf:right-2 fmf:top-1/2 fmf:-translate-y-1/2 fmf:cursor-pointer fmf:text-slate-400 fmf:hover:text-slate-700 fmf:focus-visible:outline-none fmf:focus-visible:ring-2 fmf:focus-visible:ring-brand-500 fmf:focus-visible:ring-offset-1"
                    aria-label={__("Clear search")}
                >
                    <X className="fmf:h-4 fmf:w-4" />
                </button>
            )}
        </div>
    );
}
