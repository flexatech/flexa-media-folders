export interface FolderNodeData {
    id: number;
    name: string;
    parent: number;
    ord: number;
    type: string;
    color: string | null;
    createdBy: number;
    createdAt: string;
    updatedAt: string;
    count: number;
}

export interface FolderTreeNode extends FolderNodeData {
    children: FolderTreeNode[];
}

export interface FolderTreeResponse {
    tree: FolderTreeNode[];
    flat: FolderNodeData[];
    specials: {
        all: number | null;
        uncategorized: number | null;
    };
}

/**
 * A flattened tree row with display depth, used by the dnd-kit sortable list.
 */
export interface FlattenedItem extends FolderNodeData {
    depth: number;
    index: number;
    parentId: number;
    hasChildren: boolean;
    collapsed: boolean;
    /**
     * `lastChildPath[k]` is true when the depth-k ancestor of this row (or the
     * row itself when k === depth) is the last child of its parent. Length is
     * `depth + 1`. Drives the indent guide lines so the rendering of "is the
     * line still going below this row" doesn't need an extra tree walk.
     */
    lastChildPath: boolean[];
}

export type SpecialFolderId = "all" | "uncategorized";
export type SelectedFolderId = number | SpecialFolderId;
