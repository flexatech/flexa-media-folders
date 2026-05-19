import type { FolderSort } from "../settings/useSettings";
import type {
    FlattenedItem,
    FolderNodeData,
    FolderTreeNode,
} from "./types";

export function buildTree(
    flat: FolderNodeData[],
    sort: FolderSort = "manual",
): FolderTreeNode[] {
    const byParent = new Map<number, FolderTreeNode[]>();
    for (const node of flat) {
        const list = byParent.get(node.parent) ?? [];
        list.push({ ...node, children: [] });
        byParent.set(node.parent, list);
    }
    const compare = (a: FolderTreeNode, b: FolderTreeNode) => {
        if (sort === "asc") {
            return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
        }
        if (sort === "desc") {
            return b.name.localeCompare(a.name, undefined, { sensitivity: "base" });
        }
        return a.ord - b.ord;
    };
    const link = (parent: number): FolderTreeNode[] => {
        const list = byParent.get(parent) ?? [];
        list.sort(compare);
        for (const node of list) {
            node.children = link(node.id);
        }
        return list;
    };
    return link(0);
}

export function flattenTree(
    tree: FolderTreeNode[],
    expandedIds: Set<number>,
    parentId = 0,
    depth = 0,
    parentLastChildPath: boolean[] = [],
    out: FlattenedItem[] = [],
): FlattenedItem[] {
    for (let i = 0; i < tree.length; i += 1) {
        const node = tree[i];
        const hasChildren = node.children.length > 0;
        const collapsed = !expandedIds.has(node.id);
        const isLastChild = i === tree.length - 1;
        const lastChildPath = [...parentLastChildPath, isLastChild];
        out.push({
            id: node.id,
            name: node.name,
            parent: node.parent,
            ord: node.ord,
            type: node.type,
            color: node.color,
            createdBy: node.createdBy,
            createdAt: node.createdAt,
            updatedAt: node.updatedAt,
            count: node.count,
            depth,
            index: i,
            parentId,
            hasChildren,
            collapsed,
            lastChildPath,
        });
        if (hasChildren && !collapsed) {
            flattenTree(
                node.children,
                expandedIds,
                node.id,
                depth + 1,
                lastChildPath,
                out,
            );
        }
    }
    return out;
}

/**
 * Collect ids of all descendants of `id` from a flat list (the flat list must
 * be in tree order, which `flattenTree` guarantees).
 */
export function descendantIds(items: FlattenedItem[], id: number): number[] {
    const result: number[] = [];
    const idx = items.findIndex((i) => i.id === id);
    if (idx === -1) {
        return result;
    }
    const baseDepth = items[idx].depth;
    for (let i = idx + 1; i < items.length; i += 1) {
        if (items[i].depth <= baseDepth) {
            break;
        }
        result.push(items[i].id);
    }
    return result;
}

interface Projection {
    depth: number;
    parentId: number;
}

/**
 * Given the flat list and the active drag (overId + offsetLeft), figure out
 * the projected parent + depth. Mirrors the canonical dnd-kit SortableTree
 * example, simplified for our case (no max-depth cap).
 */
export function projectDrop(
    items: FlattenedItem[],
    activeId: number,
    overId: number,
    offsetLeft: number,
    indentationWidth: number,
): Projection {
    const overIndex = items.findIndex((i) => i.id === overId);
    const activeIndex = items.findIndex((i) => i.id === activeId);
    if (overIndex === -1 || activeIndex === -1) {
        return { depth: 0, parentId: 0 };
    }
    const activeItem = items[activeIndex];
    const newItems = arrayMove(items, activeIndex, overIndex);
    const previousItem = newItems[overIndex - 1];
    const nextItem = newItems[overIndex + 1];

    const dragDepth = Math.round(offsetLeft / indentationWidth);
    const projectedDepth = activeItem.depth + dragDepth;
    const maxDepth = previousItem
        ? previousItem.hasChildren && !previousItem.collapsed
            ? previousItem.depth + 1
            : previousItem.depth + 1
        : 0;
    const minDepth = nextItem ? nextItem.depth : 0;

    let depth = projectedDepth;
    if (projectedDepth >= maxDepth) {
        depth = maxDepth;
    } else if (projectedDepth < minDepth) {
        depth = minDepth;
    }
    if (depth < 0) {
        depth = 0;
    }

    let parentId = 0;
    if (depth > 0 && previousItem) {
        if (depth === previousItem.depth) {
            parentId = previousItem.parentId;
        } else if (depth > previousItem.depth) {
            parentId = previousItem.id;
        } else {
            const ancestor = newItems
                .slice(0, overIndex)
                .reverse()
                .find((item) => item.depth === depth);
            parentId = ancestor ? ancestor.parentId : 0;
        }
    }
    return { depth, parentId };
}

export function arrayMove<T>(arr: T[], from: number, to: number): T[] {
    const copy = arr.slice();
    const [item] = copy.splice(from, 1);
    copy.splice(to, 0, item);
    return copy;
}

/**
 * Filter the flat tree by a search term, keeping ancestor paths so matched
 * folders remain navigable.
 */
export function filterFlat(items: FlattenedItem[], search: string): FlattenedItem[] {
    const term = search.trim().toLowerCase();
    if (term === "") {
        return items;
    }
    const matched = new Set<number>();
    const byId = new Map<number, FlattenedItem>(items.map((i) => [i.id, i]));
    for (const item of items) {
        if (item.name.toLowerCase().includes(term)) {
            let cur: number | undefined = item.id;
            while (cur !== undefined) {
                matched.add(cur);
                const parentId: number | undefined = byId.get(cur)?.parentId;
                cur = parentId !== undefined && parentId > 0 ? parentId : undefined;
            }
        }
    }
    return items.filter((i) => matched.has(i.id));
}
