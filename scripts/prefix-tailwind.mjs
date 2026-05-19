#!/usr/bin/env node
/**
 * One-shot migration: prefix every Tailwind utility class in our React/TS
 * source with `fmf:` so they stop colliding with WP admin's bare class names
 * (e.g. WP's `.fixed` for tables vs Tailwind's `.fixed` for position).
 *
 * Strategy: rewrite class strings ONLY inside known contexts -
 *   1. JSX attribute `className="..."` (or `class="..."` for completeness)
 *   2. String arguments to `cn(...)` calls
 *   3. The base string + variant-record strings inside `cva(...)` calls
 *
 * Inside those strings, every whitespace-separated token gets `fmf:` prepended
 * EXCEPT tokens already prefixed `fmf:` and project-specific `flexa-mf-*`.
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.argv[2] ?? "apps/admin/src");
const PREFIX = "fmf:";

const exts = new Set([".ts", ".tsx"]);

function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const out = [];
    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            out.push(...walk(full));
        } else if (exts.has(path.extname(entry.name))) {
            out.push(full);
        }
    }
    return out;
}

function transformToken(tok) {
    if (!tok) return tok;
    if (tok.startsWith(PREFIX)) return tok;
    if (tok.startsWith("flexa-mf-")) return tok;
    return PREFIX + tok;
}

function transformClassString(s) {
    return s
        .split(/(\s+)/)
        .map((part) => (/^\s+$/.test(part) ? part : transformToken(part)))
        .join("");
}

/**
 * Walk through `src` and find paired delimiters starting at `i`. Returns the
 * index of the matching close, respecting nested parens/braces/brackets and
 * strings.
 */
function matchClose(src, openIdx, openChar, closeChar) {
    let depth = 0;
    let i = openIdx;
    while (i < src.length) {
        const ch = src[i];
        if (ch === '"' || ch === "'" || ch === "`") {
            // skip string
            const quote = ch;
            i++;
            while (i < src.length) {
                if (src[i] === "\\") {
                    i += 2;
                    continue;
                }
                if (src[i] === quote) {
                    i++;
                    break;
                }
                i++;
            }
            continue;
        }
        if (ch === openChar) depth++;
        else if (ch === closeChar) {
            depth--;
            if (depth === 0) return i;
        }
        i++;
    }
    return -1;
}

/**
 * Transform every double-quoted string literal that appears within `[start, end)`
 * of `src`. Returns the rewritten slice.
 */
function rewriteStringLiteralsInRange(src, start, end) {
    let i = start;
    let out = "";
    while (i < end) {
        const ch = src[i];
        if (ch === '"') {
            // find matching close, allowing escapes
            let j = i + 1;
            while (j < end) {
                if (src[j] === "\\") {
                    j += 2;
                    continue;
                }
                if (src[j] === '"') break;
                j++;
            }
            const inner = src.slice(i + 1, j);
            out += '"' + transformClassString(inner) + '"';
            i = j + 1;
            continue;
        }
        if (ch === "'") {
            // single-quoted string -- transform too (cn() can take single-quoted)
            let j = i + 1;
            while (j < end) {
                if (src[j] === "\\") {
                    j += 2;
                    continue;
                }
                if (src[j] === "'") break;
                j++;
            }
            const inner = src.slice(i + 1, j);
            out += "'" + transformClassString(inner) + "'";
            i = j + 1;
            continue;
        }
        if (ch === "`") {
            // template literal -- transform raw segments between ${...}
            let j = i + 1;
            let buf = "`";
            while (j < end) {
                if (src[j] === "\\") {
                    buf += src.slice(j, j + 2);
                    j += 2;
                    continue;
                }
                if (src[j] === "`") {
                    buf += "`";
                    j++;
                    break;
                }
                if (src[j] === "$" && src[j + 1] === "{") {
                    // copy ${ expression } as-is
                    const closeBrace = matchClose(src, j + 1, "{", "}");
                    if (closeBrace === -1 || closeBrace >= end) {
                        buf += src[j];
                        j++;
                        continue;
                    }
                    buf += src.slice(j, closeBrace + 1);
                    j = closeBrace + 1;
                    continue;
                }
                // accumulate raw text, but we need to transform on the fly:
                // collect until next ${ or ` and transform that chunk.
                let k = j;
                while (
                    k < end &&
                    src[k] !== "`" &&
                    !(src[k] === "$" && src[k + 1] === "{") &&
                    src[k] !== "\\"
                ) {
                    k++;
                }
                buf += transformClassString(src.slice(j, k));
                j = k;
            }
            out += buf;
            i = j;
            continue;
        }
        out += ch;
        i++;
    }
    return out;
}

function rewriteFile(src) {
    let i = 0;
    let out = "";
    while (i < src.length) {
        // Match JSX `className="..."`
        // We match the attribute name then = then either "..." (literal) or { ... } (expression)
        const classNameMatch = /\bclassName\s*=\s*/y;
        classNameMatch.lastIndex = i;
        const m = classNameMatch.exec(src);
        if (m && m.index === i) {
            out += m[0];
            i += m[0].length;
            // next char: " or { or '
            if (src[i] === '"' || src[i] === "'") {
                // literal string
                const quote = src[i];
                let j = i + 1;
                while (j < src.length) {
                    if (src[j] === "\\") {
                        j += 2;
                        continue;
                    }
                    if (src[j] === quote) break;
                    j++;
                }
                const inner = src.slice(i + 1, j);
                out += quote + transformClassString(inner) + quote;
                i = j + 1;
                continue;
            }
            if (src[i] === "{") {
                // JSX expression - find matching brace, then transform all string literals
                // inside that range (handles cn(...), cva(...), conditionals, ternaries).
                const closeBrace = matchClose(src, i, "{", "}");
                if (closeBrace === -1) {
                    out += src.slice(i);
                    i = src.length;
                    continue;
                }
                out += rewriteStringLiteralsInRange(src, i, closeBrace + 1);
                i = closeBrace + 1;
                continue;
            }
            continue;
        }

        // Match `cn(...)` and `cva(...)` calls anywhere - they're our class utilities
        const callMatch = /\b(cn|cva|buttonVariants)\s*\(/y;
        callMatch.lastIndex = i;
        const c = callMatch.exec(src);
        if (c && c.index === i) {
            out += c[0];
            i += c[0].length;
            // i now points just after the opening paren
            // find matching close paren starting at i-1
            const openParenIdx = i - 1;
            const closeParen = matchClose(src, openParenIdx, "(", ")");
            if (closeParen === -1) {
                out += src.slice(i);
                i = src.length;
                continue;
            }
            out += rewriteStringLiteralsInRange(src, i, closeParen);
            // include the close paren itself unmodified
            out += ")";
            i = closeParen + 1;
            continue;
        }

        out += src[i];
        i++;
    }
    return out;
}

const files = walk(ROOT);
let changed = 0;
for (const file of files) {
    const before = fs.readFileSync(file, "utf8");
    const after = rewriteFile(before);
    if (after !== before) {
        fs.writeFileSync(file, after);
        changed++;
        console.log("✏️  " + path.relative(process.cwd(), file));
    }
}
console.log(`\nDone. ${changed} file(s) modified.`);
