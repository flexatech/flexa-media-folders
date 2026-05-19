import {
    ArrowUpRight,
    ArrowUpWideNarrow,
    FolderOpen,
    Hash,
    Loader2,
    Sparkles,
} from "lucide-react";
import { type ReactNode } from "react";
import {
    FolderTreeSelect,
    type FolderTreeSelectOption,
} from "@/components/ui/folder-tree-select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select } from "@/components/ui/select";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { __ } from "@/lib/i18n";
import { useUiStore } from "@/lib/store";
import { getFlexaMF } from "@/lib/wp";
import type { FolderTreeNode } from "../folder-tree/types";
import { useFolderTree } from "../folder-tree/useFolderTree";
import { type FolderSort, useSaveSettings, useSettings } from "./useSettings";

const SORT_OPTIONS: Array<{ value: FolderSort; label: string }> = [
    { value: "manual", label: __("Manual (drag to reorder)") },
    { value: "asc", label: __("Name (A → Z)") },
    { value: "desc", label: __("Name (Z → A)") },
];

interface SettingsSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function SettingsSheet({ open, onOpenChange }: SettingsSheetProps) {
    const settings = useSettings();
    const folders = useFolderTree();
    const save = useSaveSettings();
    const data = settings.data;

    const folderOptions: FolderTreeSelectOption[] = [
        { value: "none", label: __("No folder (show all)"), depth: 0 },
        { value: "last", label: __("Last-selected folder"), depth: 0 },
        ...(folders.data ? flattenTree(folders.data.tree) : []),
    ];
    const folderOptionSeparators = new Set(["last"]);

    const apply = <K extends "default_folder" | "folder_sort" | "show_counts">(
        key: K,
        value: K extends "show_counts"
            ? boolean
            : K extends "folder_sort"
              ? FolderSort
              : string,
    ) => {
        save.mutate(
            { [key]: value } as Parameters<typeof save.mutate>[0],
            {
                onError: () => {
                    useUiStore
                        .getState()
                        .showToast(__("Failed to save settings"), "error");
                },
            },
        );
    };

    const settingsUrl = getFlexaMF().settingsUrl;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="fmf:flex fmf:w-full fmf:flex-col fmf:gap-0 fmf:p-0 fmf:sm:max-w-md"
                overlayClassName="fmf:bg-slate-900/15"
            >
                <SheetHeader className="fmf:flex fmf:flex-row fmf:items-start fmf:gap-3 fmf:space-y-0 fmf:border-b fmf:border-slate-200 fmf:bg-gradient-to-br fmf:from-brand-50 fmf:to-white fmf:px-6 fmf:py-5">
                    <span className="fmf:flex fmf:h-10 fmf:w-10 fmf:shrink-0 fmf:items-center fmf:justify-center fmf:rounded-xl fmf:bg-brand-500 fmf:text-white fmf:shadow-sm">
                        <Sparkles className="fmf:h-5 fmf:w-5" aria-hidden />
                    </span>
                    <div className="fmf:flex-1 fmf:space-y-1">
                        <div className="fmf:flex fmf:items-center fmf:gap-2">
                            <SheetTitle className="fmf:text-lg fmf:font-semibold fmf:text-slate-900">
                                {__("Quick Settings")}
                            </SheetTitle>
                            {save.isPending && (
                                <span
                                    className="fmf:inline-flex fmf:items-center fmf:gap-1 fmf:text-xs fmf:text-slate-500"
                                    aria-live="polite"
                                >
                                    <Loader2
                                        className="fmf:h-3 fmf:w-3 fmf:animate-spin"
                                        aria-hidden
                                    />
                                    {__("Saving…")}
                                </span>
                            )}
                        </div>
                        <SheetDescription className="fmf:text-sm fmf:text-slate-600">
                            {__("Changes apply instantly. Everything else lives on the full settings page.")}
                        </SheetDescription>
                    </div>
                </SheetHeader>

                <ScrollArea className="fmf:flex-1 fmf:min-h-0">
                    <div className="fmf:px-6 fmf:py-5">
                        {(settings.isLoading || !data) && (
                            <div className="fmf:flex fmf:items-center fmf:justify-center fmf:gap-2 fmf:py-10 fmf:text-sm fmf:text-slate-500">
                                <Loader2
                                    className="fmf:h-4 fmf:w-4 fmf:animate-spin"
                                    aria-hidden
                                />
                                {__("Loading settings…")}
                            </div>
                        )}

                        {settings.isError && (
                            <div className="fmf:rounded-lg fmf:bg-red-50 fmf:p-3 fmf:text-sm fmf:text-red-700">
                                {__("Failed to load settings:")} {(settings.error as Error).message}
                            </div>
                        )}

                        {data && !settings.isLoading && (
                            <div className="fmf:space-y-3">
                                <SettingCard
                                    icon={<FolderOpen className="fmf:h-4 fmf:w-4" aria-hidden />}
                                    title={__("Default folder on load")}
                                    description={__("Which folder opens when the Media Library appears.")}
                                >
                                    <FolderTreeSelect
                                        id="flexa-mf-sheet-default-folder"
                                        value={data.default_folder}
                                        options={folderOptions}
                                        separatorsAfter={folderOptionSeparators}
                                        onChange={(v) => apply("default_folder", v)}
                                    />
                                </SettingCard>

                                <SettingCard
                                    icon={<ArrowUpWideNarrow className="fmf:h-4 fmf:w-4" aria-hidden />}
                                    title={__("Folder sort order")}
                                    description={__("Default order folders appear in the tree.")}
                                >
                                    <Select
                                        id="flexa-mf-sheet-folder-sort"
                                        value={data.folder_sort}
                                        options={SORT_OPTIONS}
                                        onChange={(e) =>
                                            apply("folder_sort", e.target.value as FolderSort)
                                        }
                                    />
                                </SettingCard>

                                <SettingCard
                                    icon={<Hash className="fmf:h-4 fmf:w-4" aria-hidden />}
                                    title={__("Show attachment counts")}
                                    description={__("Display the number of attachments next to each folder.")}
                                >
                                    <Switch
                                        id="flexa-mf-sheet-show-counts"
                                        checked={data.show_counts}
                                        onCheckedChange={(v) => apply("show_counts", v)}
                                    />
                                </SettingCard>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <div className="fmf:flex fmf:items-center fmf:justify-end fmf:border-t fmf:border-slate-200 fmf:bg-slate-50 fmf:px-6 fmf:py-3">
                    <a
                        href={settingsUrl}
                        className="fmf:inline-flex fmf:items-center fmf:gap-1 fmf:text-xs fmf:font-medium fmf:text-slate-500 fmf:transition-colors fmf:hover:text-brand-600"
                    >
                        {__("Open full settings")}
                        <ArrowUpRight className="fmf:h-3.5 fmf:w-3.5" aria-hidden />
                    </a>
                </div>
            </SheetContent>
        </Sheet>
    );
}

interface SettingCardProps {
    icon: ReactNode;
    title: string;
    description?: string;
    children: ReactNode;
}

function SettingCard({ icon, title, description, children }: SettingCardProps) {
    return (
        <div className="fmf:rounded-xl fmf:border fmf:border-slate-200 fmf:bg-white fmf:p-4 fmf:transition-colors fmf:hover:border-slate-300">
            <div className="fmf:flex fmf:items-start fmf:gap-3">
                <span className="fmf:flex fmf:h-8 fmf:w-8 fmf:shrink-0 fmf:items-center fmf:justify-center fmf:rounded-lg fmf:bg-brand-50 fmf:text-brand-600">
                    {icon}
                </span>
                <div className="fmf:min-w-0 fmf:flex-1 fmf:space-y-0.5">
                    <h3 className="fmf:text-sm fmf:font-semibold fmf:text-slate-900">
                        {title}
                    </h3>
                    {description && (
                        <p className="fmf:text-xs fmf:text-slate-500">{description}</p>
                    )}
                </div>
            </div>
            <div className="fmf:mt-3 fmf:pl-11">{children}</div>
        </div>
    );
}

function flattenTree(
    nodes: FolderTreeNode[],
    depth = 0,
): FolderTreeSelectOption[] {
    const out: FolderTreeSelectOption[] = [];
    for (const node of nodes) {
        out.push({ value: String(node.id), label: node.name, depth });
        if (node.children.length > 0) {
            out.push(...flattenTree(node.children, depth + 1));
        }
    }
    return out;
}
