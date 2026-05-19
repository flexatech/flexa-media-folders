import { create } from "zustand";
import { persist, type PersistOptions } from "zustand/middleware";
import type { SelectedFolderId } from "@/features/folder-tree/types";

export interface ToastState {
    id: number;
    message: string;
    tone: "success" | "error";
}

interface UiState {
    selectedFolderId: SelectedFolderId;
    expandedIds: number[];
    search: string;
    clipboardFolderId: number | null;
    toast: ToastState | null;
    sidebarCollapsed: boolean;
    uploadSidebarWidth: number;
    /** `null` keeps the default `calc(100vh - 32px)` height; a number switches
     *  the upload sidebar to an explicit user-controlled height. */
    uploadSidebarHeight: number | null;
    displayFolderId: boolean;
    setSelected: (id: SelectedFolderId) => void;
    toggleExpanded: (id: number) => void;
    setExpanded: (ids: number[]) => void;
    expand: (id: number) => void;
    collapse: (id: number) => void;
    setSearch: (term: string) => void;
    setClipboardFolder: (id: number | null) => void;
    showToast: (message: string, tone?: ToastState["tone"]) => void;
    dismissToast: () => void;
    toggleSidebar: () => void;
    setUploadSidebarWidth: (width: number) => void;
    setUploadSidebarHeight: (height: number) => void;
    toggleDisplayFolderId: () => void;
}

const persistOptions: PersistOptions<
    UiState,
    Pick<
        UiState,
        | "selectedFolderId"
        | "expandedIds"
        | "sidebarCollapsed"
        | "uploadSidebarWidth"
        | "uploadSidebarHeight"
        | "displayFolderId"
    >
> = {
    name: "flexa-mf:ui",
    partialize: (state) => ({
        selectedFolderId: state.selectedFolderId,
        expandedIds: state.expandedIds,
        sidebarCollapsed: state.sidebarCollapsed,
        uploadSidebarWidth: state.uploadSidebarWidth,
        uploadSidebarHeight: state.uploadSidebarHeight,
        displayFolderId: state.displayFolderId,
    }),
};

export const useUiStore = create<UiState>()(
    persist(
        (set) => ({
            selectedFolderId: "all",
            expandedIds: [],
            search: "",
            clipboardFolderId: null,
            toast: null,
            sidebarCollapsed: false,
            uploadSidebarWidth: 260,
            uploadSidebarHeight: null,
            displayFolderId: false,
            toggleSidebar: () =>
                set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
            toggleDisplayFolderId: () =>
                set((state) => ({ displayFolderId: !state.displayFolderId })),
            setUploadSidebarWidth: (uploadSidebarWidth) =>
                set({ uploadSidebarWidth }),
            setUploadSidebarHeight: (uploadSidebarHeight) =>
                set({ uploadSidebarHeight }),
            setSelected: (selectedFolderId) => set({ selectedFolderId }),
            setClipboardFolder: (clipboardFolderId) => set({ clipboardFolderId }),
            showToast: (message, tone = "success") =>
                set({ toast: { id: Date.now(), message, tone } }),
            dismissToast: () => set({ toast: null }),
            toggleExpanded: (id) =>
                set((state) => ({
                    expandedIds: state.expandedIds.includes(id)
                        ? state.expandedIds.filter((x) => x !== id)
                        : [...state.expandedIds, id],
                })),
            setExpanded: (expandedIds) => set({ expandedIds }),
            expand: (id) =>
                set((state) =>
                    state.expandedIds.includes(id)
                        ? state
                        : { ...state, expandedIds: [...state.expandedIds, id] },
                ),
            collapse: (id) =>
                set((state) => ({
                    expandedIds: state.expandedIds.filter((x) => x !== id),
                })),
            setSearch: (search) => set({ search }),
        }),
        persistOptions,
    ),
);
