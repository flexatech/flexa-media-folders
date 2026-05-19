import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { FolderTreeResponse } from "./types";

export const FOLDER_TREE_QUERY_KEY = ["flexa-mf", "folders"] as const;

export function useFolderTree() {
    return useQuery<FolderTreeResponse>({
        queryKey: FOLDER_TREE_QUERY_KEY,
        queryFn: () => api.get<FolderTreeResponse>("folders?with_counts=1"),
    });
}
