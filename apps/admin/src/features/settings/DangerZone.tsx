import { AlertTriangle } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { __ } from "@/lib/i18n";
import { useResetAllData } from "./useSettings";

const CONFIRM_PHRASE = "delete all folders";

export function DangerZone() {
    const [open, setOpen] = useState(false);
    const [confirm, setConfirm] = useState("");
    const reset = useResetAllData();

    const close = () => {
        if (reset.isPending) {
            return;
        }
        setOpen(false);
        setConfirm("");
        reset.reset();
    };

    const submit = () => {
        if (confirm.trim().toLowerCase() !== CONFIRM_PHRASE) {
            return;
        }
        reset.mutate(CONFIRM_PHRASE, {
            onSuccess: () => {
                setOpen(false);
                setConfirm("");
            },
        });
    };

    return (
        <section className="fmf:space-y-4 fmf:rounded-lg fmf:border fmf:border-red-200 fmf:bg-red-50/50 fmf:p-5">
            <header className="fmf:flex fmf:items-start fmf:gap-3">
                <AlertTriangle className="fmf:mt-0.5 fmf:h-5 fmf:w-5 fmf:text-red-600" />
                <div>
                    <h2 className="fmf:text-base fmf:font-semibold fmf:text-red-900">
                        {__("Danger zone")}
                    </h2>
                    <p className="fmf:text-sm fmf:text-red-800">
                        {__(
                            "Permanently delete all folders and detach every attachment from every folder. Your media files themselves are never touched.",
                        )}
                    </p>
                </div>
            </header>

            <Button variant="destructive" onClick={() => setOpen(true)}>
                {__("Reset folder data…")}
            </Button>

            <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{__("Reset folder data?")}</DialogTitle>
                        <DialogDescription>
                            {__(
                                "This drops every folder and detaches every attachment. The attachments themselves stay in the Media Library. This cannot be undone.",
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="fmf:space-y-1.5">
                        <Label htmlFor="flexa-mf-reset-confirm">
                            {__("Type")}{" "}
                            <code className="fmf:font-mono fmf:text-red-700">{CONFIRM_PHRASE}</code>{" "}
                            {__("to confirm")}
                        </Label>
                        <Input
                            id="flexa-mf-reset-confirm"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            autoComplete="off"
                            autoFocus
                        />
                        {reset.isError && (
                            <p className="fmf:text-sm fmf:text-red-700">
                                {(reset.error as Error).message}
                            </p>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="ghost" onClick={close} disabled={reset.isPending}>
                            {__("Cancel")}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={submit}
                            disabled={
                                reset.isPending ||
                                confirm.trim().toLowerCase() !== CONFIRM_PHRASE
                            }
                        >
                            {reset.isPending ? __("Resetting…") : __("Reset everything")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </section>
    );
}
