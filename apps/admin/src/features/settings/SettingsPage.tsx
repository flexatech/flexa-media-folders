import {
    ChevronDown,
    Eye,
    FolderTree,
    Plug,
    Save,
    ShieldAlert,
    SlidersHorizontal,
    type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
    FolderTreeSelect,
    type FolderTreeSelectOption,
} from "@/components/ui/folder-tree-select";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/cn";
import { __ } from "@/lib/i18n";
import type { FolderTreeNode } from "../folder-tree/types";
import { useFolderTree } from "../folder-tree/useFolderTree";
import { DangerZone } from "./DangerZone";
import {
    type FolderSort,
    type SettingsData,
    useSaveSettings,
    useSettings,
} from "./useSettings";

const SORT_OPTIONS: Array<{ value: FolderSort; label: string }> = [
    { value: "manual", label: __("Manual (drag to reorder)") },
    { value: "asc", label: __("Name (A → Z)") },
    { value: "desc", label: __("Name (Z → A)") },
];

type SectionId = "general" | "integrations" | "danger";

interface SectionMeta {
    id: SectionId;
    title: string;
    subtitle: string;
    icon: LucideIcon;
    paneTitle: string;
    paneSubtitle: string;
}

const SECTIONS: SectionMeta[] = [
    {
        id: "general",
        title: __("General"),
        subtitle: __("Core folder behavior"),
        icon: SlidersHorizontal,
        paneTitle: __("General Settings"),
        paneSubtitle: __("Essential configuration options"),
    },
    {
        id: "integrations",
        title: __("Integrations"),
        subtitle: __("Post types & editors"),
        icon: Plug,
        paneTitle: __("Post Types"),
        paneSubtitle: __("Exclude post types from the folder sidebar"),
    },
    {
        id: "danger",
        title: __("Danger Zone"),
        subtitle: __("Destructive actions"),
        icon: ShieldAlert,
        paneTitle: __("Danger Zone"),
        paneSubtitle: __("Reset everything"),
    },
];

export function SettingsPage() {
    const settings = useSettings();
    const folders = useFolderTree();
    const save = useSaveSettings();

    const [form, setForm] = useState<SettingsData | null>(null);
    const [active, setActive] = useState<SectionId>("general");
    useEffect(() => {
        if (settings.data && !form) {
            setForm(settings.data);
        }
    }, [settings.data, form]);

    if (settings.isLoading || !form) {
        return (
            <div className="fmf:p-6 fmf:text-sm fmf:text-slate-500">
                {__("Loading settings…")}
            </div>
        );
    }
    if (settings.isError) {
        return (
            <div className="fmf:m-6 fmf:rounded-md fmf:bg-red-50 fmf:p-4 fmf:text-sm fmf:text-red-700">
                {__("Failed to load settings:")} {(settings.error as Error).message}
            </div>
        );
    }

    const folderOptions: FolderTreeSelectOption[] = [
        { value: "none", label: __("No folder (show all)"), depth: 0 },
        { value: "last", label: __("Last-selected folder"), depth: 0 },
        ...(folders.data ? flattenTree(folders.data.tree) : []),
    ];
    const folderOptionSeparators = new Set(["last"]);

    const dirty =
        settings.data !== undefined &&
        (form.default_folder !== settings.data.default_folder ||
            form.folder_sort !== settings.data.folder_sort ||
            form.show_counts !== settings.data.show_counts ||
            !samePostTypes(
                form.excluded_post_types,
                settings.data.excluded_post_types,
            ));

    const onSave = () => {
        const { available_post_types: _ignored, ...writable } = form;
        save.mutate(writable);
    };

    // `excluded` mirrors the checkbox value: true = exclude this post type
    // (add to the list), false = include it (remove from the list).
    const togglePostType = (name: string, excluded: boolean) => {
        const next = excluded
            ? Array.from(new Set([...form.excluded_post_types, name]))
            : form.excluded_post_types.filter((p) => p !== name);
        setForm({ ...form, excluded_post_types: next });
    };

    return (
        <div className="fmf:min-h-full fmf:bg-slate-50">
            {/* Brand strip */}
            <div className="fmf:border-b fmf:border-slate-200 fmf:bg-white">
                <div className="fmf:mx-auto fmf:flex fmf:max-w-6xl fmf:items-center fmf:gap-4 fmf:px-6 fmf:py-3">
                    <span className="fmf:flex fmf:h-10 fmf:w-10 fmf:shrink-0 fmf:items-center fmf:justify-center fmf:rounded-lg fmf:bg-brand-500 fmf:text-white fmf:shadow-sm">
                        <FolderTree className="fmf:h-5 fmf:w-5" aria-hidden />
                    </span>
                    <div className="fmf:leading-tight">
                        <div className="fmf:text-sm fmf:font-semibold fmf:text-slate-900">
                            {__("Flexa Media Folders")}
                        </div>
                        <div className="fmf:text-xs fmf:text-slate-500">
                            {__("for WordPress")}
                        </div>
                    </div>
                </div>
            </div>

            {/* Page header */}
            <div className="fmf:mx-auto fmf:flex fmf:max-w-6xl fmf:flex-wrap fmf:items-start fmf:justify-between fmf:gap-4 fmf:px-6 fmf:pt-8 fmf:pb-6">
                <div className="fmf:space-y-1">
                    <h1 className="fmf:text-3xl fmf:font-bold fmf:text-slate-900">
                        {__("Settings")}
                    </h1>
                    <p className="fmf:text-sm fmf:text-slate-600">
                        {__("Configure how the folder tree behaves inside the Media Library.")}
                    </p>
                </div>
                <div className="fmf:flex fmf:items-center fmf:gap-3">
                    {save.isSuccess && !dirty && (
                        <span className="fmf:text-sm fmf:text-emerald-700">
                            {__("Settings saved.")}
                        </span>
                    )}
                    {save.isError && (
                        <span className="fmf:text-sm fmf:text-red-700">
                            {__("Save failed:")} {(save.error as Error).message}
                        </span>
                    )}
                    <Button
                        onClick={onSave}
                        disabled={!dirty || save.isPending}
                        className="fmf:gap-2"
                    >
                        <Save className="fmf:h-4 fmf:w-4" aria-hidden />
                        {save.isPending ? __("Saving…") : __("Save Settings")}
                    </Button>
                </div>
            </div>

            {/* Body: nav + pane */}
            <div className="fmf:mx-auto fmf:flex fmf:max-w-6xl fmf:flex-col fmf:gap-6 fmf:px-6 fmf:pb-12 fmf:md:flex-row">
                <aside className="fmf:w-full fmf:shrink-0 fmf:space-y-2 fmf:md:w-72">
                    {SECTIONS.map((s) => (
                        <NavItem
                            key={s.id}
                            section={s}
                            selected={active === s.id}
                            onSelect={() => setActive(s.id)}
                        />
                    ))}
                </aside>

                <main className="fmf:flex-1">
                    <div className="fmf:overflow-hidden fmf:rounded-xl fmf:border fmf:border-slate-200 fmf:bg-white fmf:shadow-sm">
                        <PaneHeader section={SECTIONS.find((s) => s.id === active)!} />
                        {active === "general" && (
                            <GeneralPane
                                form={form}
                                folderOptions={folderOptions}
                                folderOptionSeparators={folderOptionSeparators}
                                onChange={setForm}
                            />
                        )}
                        {active === "integrations" && (
                            <IntegrationsPane
                                form={form}
                                onToggle={togglePostType}
                            />
                        )}
                        {active === "danger" && (
                            <div className="fmf:p-5">
                                <DangerZone />
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}

interface NavItemProps {
    section: SectionMeta;
    selected: boolean;
    onSelect: () => void;
}

function NavItem({ section, selected, onSelect }: NavItemProps) {
    const Icon = section.icon;
    return (
        <button
            type="button"
            onClick={onSelect}
            aria-pressed={selected}
            className={cn(
                "fmf:group fmf:flex fmf:w-full fmf:items-center fmf:gap-3 fmf:rounded-xl fmf:border fmf:px-3 fmf:py-2.5 fmf:text-left fmf:transition-colors fmf:cursor-pointer",
                "fmf:focus-visible:outline-none fmf:focus-visible:ring-2 fmf:focus-visible:ring-brand-500",
                selected
                    ? "fmf:border-brand-500 fmf:bg-brand-500 fmf:text-white fmf:shadow-sm"
                    : "fmf:border-slate-200 fmf:bg-white fmf:text-slate-800 fmf:hover:border-slate-300 fmf:hover:bg-slate-50",
            )}
        >
            <span
                className={cn(
                    "fmf:flex fmf:h-9 fmf:w-9 fmf:shrink-0 fmf:items-center fmf:justify-center fmf:rounded-lg",
                    selected
                        ? "fmf:bg-white/15 fmf:text-white"
                        : "fmf:bg-slate-100 fmf:text-slate-600",
                )}
            >
                <Icon className="fmf:h-4 fmf:w-4" aria-hidden />
            </span>
            <span className="fmf:min-w-0 fmf:flex-1">
                <span
                    className={cn(
                        "fmf:block fmf:text-sm fmf:font-semibold",
                        selected ? "fmf:text-white" : "fmf:text-slate-900",
                    )}
                >
                    {section.title}
                </span>
                <span
                    className={cn(
                        "fmf:block fmf:text-xs",
                        selected ? "fmf:text-white/80" : "fmf:text-slate-500",
                    )}
                >
                    {section.subtitle}
                </span>
            </span>
            <ChevronDown
                className={cn(
                    "fmf:h-4 fmf:w-4 fmf:shrink-0 fmf:transition-transform",
                    selected
                        ? "fmf:text-white"
                        : "fmf:-rotate-90 fmf:text-slate-400",
                )}
                aria-hidden
            />
        </button>
    );
}

function PaneHeader({ section }: { section: SectionMeta }) {
    const Icon = section.icon;
    return (
        <div className="fmf:flex fmf:items-start fmf:gap-3 fmf:border-b fmf:border-slate-100 fmf:bg-slate-50/60 fmf:px-5 fmf:py-4">
            <span className="fmf:flex fmf:h-10 fmf:w-10 fmf:shrink-0 fmf:items-center fmf:justify-center fmf:rounded-lg fmf:bg-brand-50 fmf:text-brand-600">
                <Icon className="fmf:h-5 fmf:w-5" aria-hidden />
            </span>
            <div className="fmf:min-w-0 fmf:space-y-0.5">
                <h2 className="fmf:text-base fmf:font-semibold fmf:text-slate-900">
                    {section.paneTitle}
                </h2>
                <p className="fmf:text-sm fmf:text-slate-500">{section.paneSubtitle}</p>
            </div>
        </div>
    );
}

interface SettingRowProps {
    icon: LucideIcon;
    title: string;
    description?: string;
    htmlFor?: string;
    children: React.ReactNode;
}

function SettingRow({
    icon: Icon,
    title,
    description,
    htmlFor,
    children,
}: SettingRowProps) {
    return (
        <div className="fmf:flex fmf:items-center fmf:gap-3 fmf:px-5 fmf:py-4">
            <span className="fmf:flex fmf:h-10 fmf:w-10 fmf:shrink-0 fmf:items-center fmf:justify-center fmf:rounded-lg fmf:bg-slate-100 fmf:text-slate-600">
                <Icon className="fmf:h-4 fmf:w-4" aria-hidden />
            </span>
            <div className="fmf:min-w-0 fmf:flex-1">
                <Label
                    htmlFor={htmlFor}
                    className="fmf:block fmf:text-sm fmf:font-semibold fmf:text-slate-900"
                >
                    {title}
                </Label>
                {description && (
                    <p className="fmf:mt-0.5 fmf:text-xs fmf:text-slate-500">
                        {description}
                    </p>
                )}
            </div>
            <div className="fmf:shrink-0">{children}</div>
        </div>
    );
}

const ROW_DIVIDER = "fmf:border-t fmf:border-slate-100";

interface GeneralPaneProps {
    form: SettingsData;
    folderOptions: FolderTreeSelectOption[];
    folderOptionSeparators: Set<string>;
    onChange: (next: SettingsData) => void;
}

function GeneralPane({
    form,
    folderOptions,
    folderOptionSeparators,
    onChange,
}: GeneralPaneProps) {
    return (
        <div>
            <SettingRow
                icon={Eye}
                htmlFor="flexa-mf-default-folder"
                title={__("Default folder on load")}
                description={__("Which folder to open when the Media Library opens.")}
            >
                <FolderTreeSelect
                    id="flexa-mf-default-folder"
                    value={form.default_folder}
                    options={folderOptions}
                    separatorsAfter={folderOptionSeparators}
                    onChange={(v) => onChange({ ...form, default_folder: v })}
                />
            </SettingRow>
            <div className={ROW_DIVIDER}>
                <SettingRow
                    icon={SlidersHorizontal}
                    htmlFor="flexa-mf-folder-sort"
                    title={__("Folder sort order")}
                    description={__("Default order folders appear in the tree.")}
                >
                    <Select
                        id="flexa-mf-folder-sort"
                        value={form.folder_sort}
                        options={SORT_OPTIONS}
                        onChange={(e) =>
                            onChange({
                                ...form,
                                folder_sort: e.target.value as FolderSort,
                            })
                        }
                    />
                </SettingRow>
            </div>
            <div className={ROW_DIVIDER}>
                <SettingRow
                    icon={Eye}
                    htmlFor="flexa-mf-show-counts"
                    title={__("Show attachment counts")}
                    description={__("Show the number of attachments next to each folder.")}
                >
                    <Switch
                        id="flexa-mf-show-counts"
                        checked={form.show_counts}
                        onCheckedChange={(v) => onChange({ ...form, show_counts: v })}
                    />
                </SettingRow>
            </div>
        </div>
    );
}

interface IntegrationsPaneProps {
    form: SettingsData;
    onToggle: (name: string, excluded: boolean) => void;
}

function IntegrationsPane({ form, onToggle }: IntegrationsPaneProps) {
    return (
        <div className="fmf:space-y-4 fmf:p-5">
            <div className="fmf:space-y-1">
                <h3 className="fmf:text-sm fmf:font-semibold fmf:text-slate-900">
                    {__("Which post types should be excluded from Flexa Media Folders?")}
                </h3>
                <p className="fmf:text-xs fmf:text-slate-500">
                    {__("Flexa Media Folders is enabled on every public post type by default. Check a post type to exclude it from the folder sidebar.")}
                </p>
            </div>
            {form.available_post_types.length === 0 ? (
                <p className="fmf:text-sm fmf:text-slate-500">
                    {__("No public post types found.")}
                </p>
            ) : (
                <ul className="fmf:divide-y fmf:divide-slate-100 fmf:rounded-lg fmf:border fmf:border-slate-200">
                    {form.available_post_types.map((pt) => {
                        const id = `flexa-mf-pt-${pt.name}`;
                        const excluded = form.excluded_post_types.includes(
                            pt.name,
                        );
                        return (
                            <li
                                key={pt.name}
                                className="fmf:flex fmf:items-center fmf:gap-3 fmf:px-3 fmf:py-2.5"
                            >
                                <input
                                    id={id}
                                    type="checkbox"
                                    checked={excluded}
                                    onChange={(e) =>
                                        onToggle(pt.name, e.target.checked)
                                    }
                                    className="fmf:h-4 fmf:w-4 fmf:cursor-pointer fmf:rounded fmf:border-slate-300 fmf:text-brand-600 fmf:focus:ring-brand-500"
                                />
                                <Label
                                    htmlFor={id}
                                    className={cn(
                                        "fmf:flex-1 fmf:cursor-pointer fmf:text-sm fmf:font-normal",
                                        excluded
                                            ? "fmf:text-slate-400 fmf:line-through"
                                            : "fmf:text-slate-800",
                                    )}
                                >
                                    {pt.label}
                                </Label>
                                <code className="fmf:text-xs fmf:text-slate-400">
                                    {pt.name}
                                </code>
                            </li>
                        );
                    })}
                </ul>
            )}
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

function samePostTypes(a: string[], b: string[]): boolean {
    if (a.length !== b.length) {
        return false;
    }
    const sortedA = [...a].sort();
    const sortedB = [...b].sort();
    return sortedA.every((v, i) => v === sortedB[i]);
}
