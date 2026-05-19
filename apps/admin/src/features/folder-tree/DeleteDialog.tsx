import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useDeleteFolder } from "./useFolderMutations";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    id: number;
    name: string;
    hasChildren: boolean;
    parentId: number;
}

export function DeleteDialog({
    open,
    onOpenChange,
    id,
    name,
    hasChildren,
    parentId,
}: Props) {
    const [keepChildren, setKeepChildren] = useState(true);
    const del = useDeleteFolder();

    const submit = () => {
        del.mutate(
            {
                id,
                reparentTo: hasChildren && keepChildren ? parentId : null,
            },
            { onSuccess: () => onOpenChange(false) },
        );
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Delete folder</DialogTitle>
                    <DialogDescription>
                        Delete <strong>{name}</strong>? Attachments inside stay in
                        your Media Library - only the folder is removed.
                    </DialogDescription>
                </DialogHeader>
                {hasChildren && (
                    <div className="fmf:space-y-2 fmf:rounded-md fmf:bg-slate-50 fmf:p-3 fmf:text-sm">
                        <label className="fmf:flex fmf:items-start fmf:gap-2">
                            <input
                                type="radio"
                                name="children"
                                className="fmf:mt-0.5"
                                checked={keepChildren}
                                onChange={() => setKeepChildren(true)}
                            />
                            <span>Move subfolders up to the parent</span>
                        </label>
                        <label className="fmf:flex fmf:items-start fmf:gap-2">
                            <input
                                type="radio"
                                name="children"
                                className="fmf:mt-0.5"
                                checked={!keepChildren}
                                onChange={() => setKeepChildren(false)}
                            />
                            <span className="fmf:text-red-600">
                                Delete subfolders too
                            </span>
                        </label>
                    </div>
                )}
                <DialogFooter>
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={del.isPending}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={submit}
                        disabled={del.isPending}
                    >
                        {del.isPending ? "Deleting…" : "Delete"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
