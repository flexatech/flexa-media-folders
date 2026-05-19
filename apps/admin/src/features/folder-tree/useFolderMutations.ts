import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { FolderNodeData, FolderTreeResponse } from "./types";
import { FOLDER_TREE_QUERY_KEY } from "./useFolderTree";

interface CreateInput {
    name: string;
    parent: number;
    color?: string | null;
}

interface UpdateInput {
    id: number;
    name?: string;
    parent?: number;
    ord?: number;
    color?: string | null;
}

interface DeleteInput {
    id: number;
    reparentTo: number | null;
}

interface ReorderInput {
    parent: number;
    ids: number[];
}

export interface BulkCreateNode {
    name: string;
    children: BulkCreateNode[];
}

interface BulkCreateInput {
    parent: number;
    items: BulkCreateNode[];
}

interface BulkCreateResponse {
    created: FolderNodeData[];
    count: number;
}

function nowIso() {
    return new Date().toISOString();
}

export function useCreateFolder() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: CreateInput) =>
            api.post<FolderNodeData>("folders", {
                name: input.name,
                parent: input.parent,
                color: input.color ?? null,
            }),
        onMutate: async (input) => {
            await qc.cancelQueries({ queryKey: FOLDER_TREE_QUERY_KEY });
            const previous = qc.getQueryData<FolderTreeResponse>(FOLDER_TREE_QUERY_KEY);
            if (previous) {
                const optimisticId = -Date.now();
                const optimistic: FolderNodeData = {
                    id: optimisticId,
                    name: input.name,
                    parent: input.parent,
                    ord: 9_999_999,
                    type: "attachment",
                    color: input.color ?? null,
                    createdBy: 0,
                    createdAt: nowIso(),
                    updatedAt: nowIso(),
                    count: 0,
                };
                qc.setQueryData<FolderTreeResponse>(FOLDER_TREE_QUERY_KEY, {
                    ...previous,
                    flat: [...previous.flat, optimistic],
                });
            }
            return { previous };
        },
        onError: (_err, _input, ctx) => {
            if (ctx?.previous) {
                qc.setQueryData(FOLDER_TREE_QUERY_KEY, ctx.previous);
            }
        },
        onSettled: () => {
            void qc.invalidateQueries({ queryKey: FOLDER_TREE_QUERY_KEY });
        },
    });
}

export function useUpdateFolder() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, ...changes }: UpdateInput) =>
            api.patch<FolderNodeData>(`folders/${id}`, changes as Record<string, unknown>),
        onMutate: async (input) => {
            await qc.cancelQueries({ queryKey: FOLDER_TREE_QUERY_KEY });
            const previous = qc.getQueryData<FolderTreeResponse>(FOLDER_TREE_QUERY_KEY);
            if (previous) {
                qc.setQueryData<FolderTreeResponse>(FOLDER_TREE_QUERY_KEY, {
                    ...previous,
                    flat: previous.flat.map((f) =>
                        f.id === input.id
                            ? {
                                  ...f,
                                  ...(input.name !== undefined ? { name: input.name } : null),
                                  ...(input.parent !== undefined ? { parent: input.parent } : null),
                                  ...(input.ord !== undefined ? { ord: input.ord } : null),
                                  ...(input.color !== undefined ? { color: input.color } : null),
                                  updatedAt: nowIso(),
                              }
                            : f,
                    ),
                });
            }
            return { previous };
        },
        onError: (_err, _input, ctx) => {
            if (ctx?.previous) {
                qc.setQueryData(FOLDER_TREE_QUERY_KEY, ctx.previous);
            }
        },
        onSettled: () => {
            void qc.invalidateQueries({ queryKey: FOLDER_TREE_QUERY_KEY });
        },
    });
}

export function useDeleteFolder() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, reparentTo }: DeleteInput) => {
            const query = reparentTo === null ? "" : `?reparent_to=${reparentTo}`;
            return api.delete<{ removed: number }>(`folders/${id}${query}`);
        },
        onMutate: async ({ id, reparentTo }) => {
            await qc.cancelQueries({ queryKey: FOLDER_TREE_QUERY_KEY });
            const previous = qc.getQueryData<FolderTreeResponse>(FOLDER_TREE_QUERY_KEY);
            if (!previous) {
                return { previous };
            }
            const toRemove = new Set<number>();
            if (reparentTo === null) {
                const collect = (target: number) => {
                    toRemove.add(target);
                    for (const child of previous.flat.filter((f) => f.parent === target)) {
                        collect(child.id);
                    }
                };
                collect(id);
            } else {
                toRemove.add(id);
            }
            const flat = previous.flat
                .filter((f) => !toRemove.has(f.id))
                .map((f) =>
                    reparentTo !== null && f.parent === id
                        ? { ...f, parent: reparentTo, updatedAt: nowIso() }
                        : f,
                );
            qc.setQueryData<FolderTreeResponse>(FOLDER_TREE_QUERY_KEY, { ...previous, flat });
            return { previous };
        },
        onError: (_err, _input, ctx) => {
            if (ctx?.previous) {
                qc.setQueryData(FOLDER_TREE_QUERY_KEY, ctx.previous);
            }
        },
        onSettled: () => {
            void qc.invalidateQueries({ queryKey: FOLDER_TREE_QUERY_KEY });
        },
    });
}

export function useBulkCreateFolders() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (input: BulkCreateInput) =>
            api.post<BulkCreateResponse>("folders/bulk", {
                parent: input.parent,
                items: input.items,
            }),
        onSettled: () => {
            void qc.invalidateQueries({ queryKey: FOLDER_TREE_QUERY_KEY });
        },
    });
}

export function useReorderFolders() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ parent, ids }: ReorderInput) =>
            api.post<{ ok: true }>("folders/reorder", { parent, ids }),
        onMutate: async ({ parent, ids }) => {
            await qc.cancelQueries({ queryKey: FOLDER_TREE_QUERY_KEY });
            const previous = qc.getQueryData<FolderTreeResponse>(FOLDER_TREE_QUERY_KEY);
            if (previous) {
                const orderIndex = new Map(ids.map((id, idx) => [id, idx]));
                qc.setQueryData<FolderTreeResponse>(FOLDER_TREE_QUERY_KEY, {
                    ...previous,
                    flat: previous.flat.map((f) =>
                        f.parent === parent && orderIndex.has(f.id)
                            ? { ...f, ord: orderIndex.get(f.id) ?? f.ord, parent }
                            : f,
                    ),
                });
            }
            return { previous };
        },
        onError: (_err, _input, ctx) => {
            if (ctx?.previous) {
                qc.setQueryData(FOLDER_TREE_QUERY_KEY, ctx.previous);
            }
        },
        onSettled: () => {
            void qc.invalidateQueries({ queryKey: FOLDER_TREE_QUERY_KEY });
        },
    });
}
