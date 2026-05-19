import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { _n, __, sprintf } from "@/lib/i18n";
import { useUiStore } from "@/lib/store";
import { refreshMediaLibrary } from "@/lib/wp-media-bridge";
import { FOLDER_TREE_QUERY_KEY } from "../folder-tree/useFolderTree";

interface AssignInput {
    folderId: number;
    attachmentIds: number[];
}

export function useAssignAttachments() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ folderId, attachmentIds }: AssignInput) =>
            api.post<{ moved: number }>(`folders/${folderId}/attachments`, {
                attachment_ids: attachmentIds,
            }),
        onSuccess: (_data, vars) => {
            const count = vars.attachmentIds.length;
            useUiStore
                .getState()
                .showToast(
                    sprintf(_n("Moved %s item", "Moved %s items", count), count),
                    "success",
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
