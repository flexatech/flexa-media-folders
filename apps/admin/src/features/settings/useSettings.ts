import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type FolderSort = "manual" | "asc" | "desc";

export interface PostTypeInfo {
    name: string;
    label: string;
}

/**
 * `default_folder` is "none" | "last" | "<positive integer>" - encoded as a
 * string because the REST controller's sanitize_text_field keeps the type
 * uniform. UI components convert as needed.
 */
export interface SettingsData {
    default_folder: string;
    folder_sort: FolderSort;
    show_counts: boolean;
    /**
     * Slugs that opt OUT of the folder sidebar. Empty = every public post
     * type uses Flexa Media Folders.
     */
    excluded_post_types: string[];
    /** Read-only: list of public post-type slugs the server knows about. */
    available_post_types: PostTypeInfo[];
}

type WritableSettings = Omit<SettingsData, "available_post_types">;

const SETTINGS_KEY = ["flexa-mf", "settings"] as const;

export function useSettings() {
    return useQuery<SettingsData>({
        queryKey: SETTINGS_KEY,
        queryFn: () => api.get<SettingsData>("settings"),
    });
}

export function useSaveSettings() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: Partial<WritableSettings>) =>
            api.post<SettingsData>("settings", input as Record<string, unknown>),
        onMutate: async (input) => {
            await qc.cancelQueries({ queryKey: SETTINGS_KEY });
            const prev = qc.getQueryData<SettingsData>(SETTINGS_KEY);
            if (prev) {
                qc.setQueryData<SettingsData>(SETTINGS_KEY, {
                    ...prev,
                    ...input,
                });
            }
            return { prev };
        },
        onError: (_err, _vars, ctx) => {
            if (ctx?.prev) {
                qc.setQueryData(SETTINGS_KEY, ctx.prev);
            }
        },
        onSuccess: (next) => {
            qc.setQueryData(SETTINGS_KEY, next);
        },
    });
}

export function useResetAllData() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (confirm: string) =>
            api.post<{ ok: true }>("reset", { confirm }),
        onSuccess: () => {
            void qc.invalidateQueries();
        },
    });
}
