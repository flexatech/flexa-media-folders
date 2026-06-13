import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { _n, __, sprintf } from "@/lib/i18n";
import { useUiStore } from "@/lib/store";
import { refreshMediaLibrary } from "@/lib/wp-media-bridge";
import { FOLDER_TREE_QUERY_KEY } from "../folder-tree/useFolderTree";

interface AssignInput {
    folderId: number;
    attachmentIds: number[];
}

interface AssignResponse {
    moved: number;
    /** Pre-move membership, folder id ("0" = uncategorized) => attachment ids. */
    previous?: Record<string, number[]>;
}

/** How long the success toast (and its Undo button) stays on screen. */
const UNDO_TOAST_MS = 5000;

function buildUndo(
    qc: QueryClient,
    targetFolderId: number,
    previous: Record<string, number[]>,
): (() => void) | undefined {
    const groups = Object.entries(previous)
        .map(([folderId, attachmentIds]) => ({
            folderId: Number(folderId),
            attachmentIds,
        }))
        .filter(
            (group) =>
                Number.isInteger(group.folderId) &&
                group.folderId !== targetFolderId &&
                group.attachmentIds.length > 0,
        );
    if (groups.length === 0) {
        return undefined;
    }
    return () => {
        void Promise.all(
            groups.map((group) =>
                api.post<AssignResponse>(`folders/${group.folderId}/attachments`, {
                    attachment_ids: group.attachmentIds,
                }),
            ),
        )
            .then(() => {
                useUiStore.getState().showToast(__("Move undone."));
            })
            .catch(() => {
                useUiStore
                    .getState()
                    .showToast(__("Failed to undo. Please try again."), "error");
            })
            .finally(() => {
                void qc.invalidateQueries({ queryKey: FOLDER_TREE_QUERY_KEY });
                refreshMediaLibrary();
            });
    };
}

export function useAssignAttachments() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ folderId, attachmentIds }: AssignInput) =>
            api.post<AssignResponse>(`folders/${folderId}/attachments`, {
                attachment_ids: attachmentIds,
            }),
        onSuccess: (data, vars) => {
            const count = vars.attachmentIds.length;
            const undo = buildUndo(qc, vars.folderId, data.previous ?? {});
            useUiStore
                .getState()
                .showToast(
                    sprintf(_n("Moved %s item", "Moved %s items", count), count),
                    "success",
                    undo
                        ? {
                              durationMs: UNDO_TOAST_MS,
                              action: { label: __("Undo"), onAction: undo },
                          }
                        : undefined,
                );
        },
        onError: () => {
            useUiStore
                .getState()
                .showToast(__("Failed to move items. Please try again."), "error");
        },
        onSettled: () => {
            void qc.invalidateQueries({ queryKey: FOLDER_TREE_QUERY_KEY });
            refreshMediaLibrary();
        },
    });
}
