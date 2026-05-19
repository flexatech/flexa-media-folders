import { FolderTree, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { __, sprintf, _n } from "@/lib/i18n";
import { useUiStore } from "@/lib/store";
import { countNodes, parseBulkInput } from "./bulkParse";
import {
    useBulkCreateFolders,
    type BulkCreateNode,
} from "./useFolderMutations";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const EXAMPLE = [
    "Photos",
    "Videos",
    "Documents",
    "2026/January",
    "2026/February",
    "Clients/Acme/Logos",
    "Clients/Acme/Brochures",
].join("\n");

export function BulkCreateSheet({ open, onOpenChange }: Props) {
    const [text, setText] = useState("");
    const create = useBulkCreateFolders();

    // Clear a stale error/pending state when the sheet reopens, but keep
    // `text` - an accidental cancel or click-outside shouldn't lose what the
    // user typed. The draft lives in component state (this component stays
    // mounted), so it survives a close/reopen and is cleared only on a
    // successful create.
    useEffect(() => {
        if (open) {
            create.reset();
        }
        // `create` is a fresh object each render - keeping it out of deps
        // avoids calling create.reset() on every render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    const tree = useMemo<BulkCreateNode[]>(() => parseBulkInput(text), [text]);
    const total = useMemo(() => countNodes(tree), [tree]);

    const submit = () => {
        if (total === 0) {
            return;
        }
        create.mutate(
            { parent: 0, items: tree },
            {
                onSuccess: (data) => {
                    useUiStore.getState().showToast(
                        sprintf(
                            _n(
                                "Created %s folder",
                                "Created %s folders",
                                data.count,
                            ),
                            String(data.count),
                        ),
                    );
                    setText("");
                    onOpenChange(false);
                },
                onError: () => {
                    useUiStore
                        .getState()
                        .showToast(__("Failed to create folders"), "error");
                },
            },
        );
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="fmf:flex fmf:w-full fmf:flex-col fmf:gap-0 fmf:p-0 fmf:sm:max-w-xl"
                overlayClassName="fmf:bg-slate-900/15"
            >
                <SheetHeader className="fmf:flex fmf:flex-row fmf:items-start fmf:gap-3 fmf:space-y-0 fmf:border-b fmf:border-slate-200 fmf:bg-gradient-to-br fmf:from-brand-50 fmf:to-white fmf:px-6 fmf:py-5">
                    <span className="fmf:flex fmf:h-10 fmf:w-10 fmf:shrink-0 fmf:items-center fmf:justify-center fmf:rounded-xl fmf:bg-brand-500 fmf:text-white fmf:shadow-sm">
                        <FolderTree className="fmf:h-5 fmf:w-5" aria-hidden />
                    </span>
                    <div className="fmf:flex-1 fmf:space-y-1">
                        <SheetTitle className="fmf:text-lg fmf:font-semibold fmf:text-slate-900">
                            {__("Create folders in bulk")}
                        </SheetTitle>
                        <SheetDescription className="fmf:text-sm fmf:text-slate-600">
                            {__(
                                "One folder per line. Use “/” to nest - e.g. 2026/January creates 2026 then January inside it.",
                            )}
                        </SheetDescription>
                    </div>
                </SheetHeader>

                <ScrollArea className="fmf:flex-1 fmf:min-h-0">
                    <div className="fmf:px-6 fmf:py-5">
                        <label
                            htmlFor="flexa-mf-bulk-input"
                            className="fmf:mb-1.5 fmf:block fmf:text-xs fmf:font-semibold fmf:text-slate-700"
                        >
                            {__("Folder list")}
                        </label>
                        <textarea
                            id="flexa-mf-bulk-input"
                            autoFocus
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            spellCheck={false}
                            rows={10}
                            placeholder={EXAMPLE}
                            className="fmf:block fmf:w-full fmf:rounded-md fmf:border fmf:border-slate-300 fmf:bg-white fmf:px-3 fmf:py-2 fmf:font-mono fmf:text-sm fmf:text-slate-900 fmf:placeholder:text-slate-400 fmf:shadow-sm fmf:focus:outline-none fmf:focus:ring-2 fmf:focus:ring-brand-500"
                        />

                        <div className="fmf:mt-4">
                            <div className="fmf:mb-1.5 fmf:flex fmf:items-center fmf:justify-between">
                                <span className="fmf:text-xs fmf:font-semibold fmf:text-slate-700">
                                    {__("Preview")}
                                </span>
                                <span className="fmf:text-xs fmf:text-slate-500">
                                    {total === 0
                                        ? __("No folders yet")
                                        : sprintf(
                                              _n(
                                                  "%s folder",
                                                  "%s folders",
                                                  total,
                                              ),
                                              String(total),
                                          )}
                                </span>
                            </div>
                            <div className="fmf:max-h-64 fmf:overflow-auto fmf:rounded-md fmf:border fmf:border-slate-200 fmf:bg-slate-50 fmf:p-3">
                                {tree.length === 0 ? (
                                    <p className="fmf:text-xs fmf:text-slate-400">
                                        {__(
                                            "Start typing - the preview will show the tree you'll create.",
                                        )}
                                    </p>
                                ) : (
                                    <TreePreview nodes={tree} />
                                )}
                            </div>
                        </div>

                        {create.isError && (
                            <p className="fmf:mt-2 fmf:text-xs fmf:text-red-600">
                                {(create.error as Error).message}
                            </p>
                        )}
                    </div>
                </ScrollArea>

                <SheetFooter className="fmf:mt-0 fmf:flex fmf:flex-row fmf:items-center fmf:justify-end fmf:gap-2 fmf:border-t fmf:border-slate-200 fmf:bg-slate-50 fmf:px-6 fmf:py-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenChange(false)}
                        disabled={create.isPending}
                    >
                        {__("Cancel")}
                    </Button>
                    <Button
                        size="sm"
                        onClick={submit}
                        disabled={create.isPending || total === 0}
                    >
                        {create.isPending && (
                            <Loader2
                                className="fmf:h-4 fmf:w-4 fmf:animate-spin"
                                aria-hidden
                            />
                        )}
                        {create.isPending
                            ? __("Creating…")
                            : total === 0
                              ? __("Create")
                              : sprintf(
                                    _n(
                                        "Create %s folder",
                                        "Create %s folders",
                                        total,
                                    ),
                                    String(total),
                                )}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}

function TreePreview({ nodes }: { nodes: BulkCreateNode[] }) {
    return (
        <ul className="fmf:space-y-0.5 fmf:text-sm fmf:text-slate-700">
            {nodes.map((node, idx) => (
                <TreeNode key={`${node.name}-${idx}`} node={node} />
            ))}
        </ul>
    );
}

function TreeNode({ node }: { node: BulkCreateNode }) {
    return (
        <li>
            <div className="fmf:flex fmf:items-center fmf:gap-1.5 fmf:truncate">
                <span aria-hidden className="fmf:text-slate-400">
                    └
                </span>
                <span className="fmf:truncate">{node.name}</span>
            </div>
            {node.children.length > 0 && (
                <ul className="fmf:ml-4 fmf:space-y-0.5 fmf:border-l fmf:border-slate-200 fmf:pl-2">
                    {node.children.map((child, idx) => (
                        <TreeNode
                            key={`${child.name}-${idx}`}
                            node={child}
                        />
                    ))}
                </ul>
            )}
        </li>
    );
}
