import {
    Check,
    ChevronsDown,
    ChevronsUp,
    MoreVertical,
    Settings,
} from "lucide-react";
import { useState } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { __ } from "@/lib/i18n";
import { useUiStore } from "@/lib/store";
import { useFolderTree } from "../folder-tree/useFolderTree";
import { SettingsSheet } from "../settings/SettingsSheet";

export function SidebarMenu() {
    const displayFolderId = useUiStore((s) => s.displayFolderId);
    const toggleDisplayFolderId = useUiStore((s) => s.toggleDisplayFolderId);
    const setExpanded = useUiStore((s) => s.setExpanded);
    const search = useUiStore((s) => s.search);
    const flat = useFolderTree().data?.flat ?? [];
    const bulkDisabled = flat.length === 0 || search.trim() !== "";
    const [settingsOpen, setSettingsOpen] = useState(false);

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        type="button"
                        aria-label={__("Open menu")}
                        title={__("Open menu")}
                        className="fmf:absolute fmf:left-2 fmf:top-4 fmf:z-20 fmf:flex fmf:h-8 fmf:w-8 fmf:cursor-pointer fmf:items-center fmf:justify-center fmf:rounded-md fmf:text-slate-500 fmf:transition-colors fmf:hover:bg-slate-100 fmf:hover:text-slate-900 fmf:focus-visible:outline-none fmf:focus-visible:ring-2 fmf:focus-visible:ring-brand-500 fmf:data-[state=open]:bg-slate-100 fmf:data-[state=open]:text-slate-900"
                    >
                        <MoreVertical aria-hidden className="fmf:h-4 fmf:w-4" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" sideOffset={6}>
                    <DropdownMenuItem onSelect={() => setSettingsOpen(true)}>
                        <Settings
                            aria-hidden
                            className="fmf:h-4 fmf:w-4 fmf:text-slate-500"
                        />
                        {__("Settings")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        active={displayFolderId}
                        onSelect={(event) => {
                            event.preventDefault();
                            toggleDisplayFolderId();
                        }}
                    >
                        <span
                            aria-hidden
                            className="fmf:flex fmf:h-4 fmf:w-4 fmf:items-center fmf:justify-center fmf:text-sm fmf:font-semibold fmf:text-slate-500"
                        >
                            #
                        </span>
                        <span className="fmf:flex-1">{__("Display folder ID")}</span>
                        {displayFolderId && (
                            <Check
                                aria-hidden
                                className="fmf:h-4 fmf:w-4 fmf:text-brand-600"
                            />
                        )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        disabled={bulkDisabled}
                        onSelect={() => setExpanded(flat.map((f) => f.id))}
                    >
                        <ChevronsDown
                            aria-hidden
                            className="fmf:h-4 fmf:w-4 fmf:text-slate-500"
                        />
                        {__("Expand all")}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        disabled={bulkDisabled}
                        onSelect={() => setExpanded([])}
                    >
                        <ChevronsUp
                            aria-hidden
                            className="fmf:h-4 fmf:w-4 fmf:text-slate-500"
                        />
                        {__("Collapse all")}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
        </>
    );
}
