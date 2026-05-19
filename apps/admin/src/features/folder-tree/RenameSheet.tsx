import { FolderPen, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { __ } from "@/lib/i18n";
import { useUpdateFolder } from "./useFolderMutations";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    id: number;
    currentName: string;
}

export function RenameSheet({ open, onOpenChange, id, currentName }: Props) {
    const [name, setName] = useState(currentName);
    const update = useUpdateFolder();

    useEffect(() => {
        if (open) {
            setName(currentName);
            update.reset();
        }
        // `update` is a fresh object each render - depending on it
        // would re-run this effect on every keystroke and revert the input.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, currentName]);

    const submit = () => {
        const trimmed = name.trim();
        if (trimmed === "" || trimmed === currentName) {
            onOpenChange(false);
            return;
        }
        update.mutate(
            { id, name: trimmed },
            { onSuccess: () => onOpenChange(false) },
        );
    };

    const disabled =
        update.isPending || name.trim() === "" || name.trim() === currentName;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="fmf:flex fmf:w-full fmf:flex-col fmf:gap-0 fmf:p-0 fmf:sm:max-w-md"
                overlayClassName="fmf:bg-slate-900/15"
            >
                <SheetHeader className="fmf:flex fmf:flex-row fmf:items-start fmf:gap-3 fmf:space-y-0 fmf:border-b fmf:border-slate-200 fmf:bg-gradient-to-br fmf:from-brand-50 fmf:to-white fmf:px-6 fmf:py-5">
                    <span className="fmf:flex fmf:h-10 fmf:w-10 fmf:shrink-0 fmf:items-center fmf:justify-center fmf:rounded-xl fmf:bg-brand-500 fmf:text-white fmf:shadow-sm">
                        <FolderPen className="fmf:h-5 fmf:w-5" aria-hidden />
                    </span>
                    <div className="fmf:flex-1 fmf:space-y-1">
                        <SheetTitle className="fmf:text-lg fmf:font-semibold fmf:text-slate-900">
                            {__("Rename folder")}
                        </SheetTitle>
                        <SheetDescription className="fmf:text-sm fmf:text-slate-600">
                            {__("Pick a new name for this folder.")}
                        </SheetDescription>
                    </div>
                </SheetHeader>

                <div className="fmf:flex-1 fmf:overflow-y-auto fmf:px-6 fmf:py-5">
                    <label
                        htmlFor="flexa-mf-rename-input"
                        className="fmf:mb-1.5 fmf:block fmf:text-xs fmf:font-semibold fmf:text-slate-700"
                    >
                        {__("Folder name")}
                    </label>
                    <Input
                        id="flexa-mf-rename-input"
                        autoFocus
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                submit();
                            }
                        }}
                        className="fmf:w-4/5"
                    />
                    {update.isError && (
                        <p className="fmf:mt-2 fmf:text-xs fmf:text-red-600">
                            {(update.error as Error).message}
                        </p>
                    )}
                </div>

                <SheetFooter className="fmf:mt-0 fmf:flex fmf:flex-row fmf:items-center fmf:justify-end fmf:gap-2 fmf:border-t fmf:border-slate-200 fmf:bg-slate-50 fmf:px-6 fmf:py-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenChange(false)}
                        disabled={update.isPending}
                    >
                        {__("Cancel")}
                    </Button>
                    <Button size="sm" onClick={submit} disabled={disabled}>
                        {update.isPending && (
                            <Loader2
                                className="fmf:h-4 fmf:w-4 fmf:animate-spin"
                                aria-hidden
                            />
                        )}
                        {update.isPending ? __("Saving…") : __("Save")}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
