import type { BulkCreateNode } from "./useFolderMutations";

/**
 * Parse a bulk-create textarea into a tree. One line per folder; `/` splits
 * a line into a path (parent/child/grandchild). Duplicate names under the
 * same parent collapse into the same node so children merge cleanly.
 *
 * Whitespace-only lines and empty path segments are skipped. Names are
 * trimmed; a 190-char cap matches the PHP-side validation (the column is
 * VARCHAR(191) for utf8mb4 index limits).
 */
export const MAX_NAME_LENGTH = 190;

export function parseBulkInput(text: string): BulkCreateNode[] {
    const roots: BulkCreateNode[] = [];
    const lines = text.split("\n");
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === "") {
            continue;
        }
        const segments = trimmed
            .split("/")
            .map((s) => s.trim())
            .filter((s) => s !== "" && s.length <= MAX_NAME_LENGTH);
        if (segments.length === 0) {
            continue;
        }
        let level = roots;
        for (const segment of segments) {
            let existing = level.find((n) => n.name === segment);
            if (!existing) {
                existing = { name: segment, children: [] };
                level.push(existing);
            }
            level = existing.children;
        }
    }
    return roots;
}

export function countNodes(nodes: BulkCreateNode[]): number {
    let total = 0;
    for (const node of nodes) {
        total += 1 + countNodes(node.children);
    }
    return total;
}
