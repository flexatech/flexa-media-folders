---
name: wordpress-plugin-check
description: Run and resolve WordPress Plugin Check (the WordPress.org Plugin Review Team's tool). Use when the user wants to run Plugin Check, hands you a plugin-check JSON/CLI report, asks to fix "plugin check" / "PCP" warnings, or prepare a plugin for WordPress.org submission. Covers the canonical fix for every common violation code (PreparedSQL, DirectDatabaseQuery, NonceVerification, ValidatedSanitizedInput, EnqueuedResourceParameters, DiscouragedFunctions, PrefixAllGlobals, readme parser warnings) and how to verify without drowning in unrelated phpcs noise.
---

# WordPress Plugin Check - run & resolve

Plugin Check is the static-analysis tool the WordPress.org Plugin Review Team runs on every submission. Passing it is a prerequisite for listing a plugin in the directory. It bundles a subset of WordPress Coding Standards (WPCS) sniffs plus its own `PluginCheck.*` sniffs and a readme parser.

## Running it

Plugin Check is itself a plugin (`plugin-check`).

```bash
wp plugin install plugin-check --activate          # if not present
wp plugin check <plugin-slug> --format=json        # CLI, machine-readable
wp plugin check <plugin-slug>                      # CLI, human-readable
```

Or in wp-admin: **Tools → Plugin Check**. The admin UI can export a JSON report — that is the file you may be handed (`<slug>-<slug>-php-<timestamp>.json`).

### Report shape

```jsonc
{
  "results": {
    "src/Some/File.php": [
      { "code": "WordPress.DB.PreparedSQL.InterpolatedNotPrepared",
        "type": "ERROR" | "WARNING", "line": 34, "column": 5, "message": "..." }
    ]
  }
}
```

Work file-by-file. **ERROR** must be fixed; **WARNING** should be fixed — reviewers will ask about leftover warnings.

## Core principle

Only suppress **confirmed false positives**, and always with a trailing `-- <reason>`. Prefer fixing the code. Never silence a real vulnerability. A `phpcs:ignore` without a justification is itself a review red flag.

## The `phpcs:ignore` two-line rule (most common mistake)

`// phpcs:ignore` suppresses violations on **its own line and the next line only**. For a multi-line `$wpdb->prepare(...)` the violation is reported on the **SQL string line**, not the `$wpdb->prepare(` line — so a comment placed above `$wpdb->prepare(` misses it. Either:

- put the comment **directly above the SQL string**, or
- wrap the statement in a `// phpcs:disable ...` / `// phpcs:enable ...` block (same sniff list on both), or
- for a class that is entirely data-access, put one file-level `// phpcs:disable` after the `defined( 'ABSPATH' ) || exit;` guard.

Disable/enable and ignore accept category prefixes: `WordPress.DB` covers all of `WordPress.DB.*`.

## Fix recipes by code

### `WordPress.DB.PreparedSQL.InterpolatedNotPrepared` / `.NotPrepared` / `WordPress.DB.PreparedSQLPlaceholders.UnfinishedPrepare`

PHPCS cannot statically see inside two safe constructs:
- **Table names** — `"... FROM {$wpdb->posts}"` or `"{$this->table()}"` built from `$wpdb->prefix`. **Fixable** by binding them through the `%i` identifier placeholder (WP 6.2+).
- **Dynamic `IN ()` lists** — `$placeholders = implode( ',', array_fill( 0, count( $ids ), '%d' ) )`. The values *are* bound through `$wpdb->prepare()`; PHPCS just can't see `%d` inside the variable. No native fix — the IN()-list pattern is itself the canonical WP idiom — so this one stays suppressed.

**Prefer the `%i` fix over suppression** whenever `Requires at least` is 6.2 or higher. A file-level `phpcs:disable` for `WordPress.DB.PreparedSQL` silences the tool, but the WordPress.org human reviewer team will still email asking you to confirm safety on every interpolated-table query. Binding the identifier through `prepare()` removes the question entirely — the prepare call is now self-contained, and the only string interpolation left is the canonical `IN(%d,%d,…)` list. If you have to bump `Requires at least` from 5.x → 6.2 to enable this, do it: WP 6.2 shipped 2023-03 and is below the platform's official supported floor at any point in 2025+.

```php
// ✅ Preferred: table identifier bound via %i. WP 6.2+.
$row = $wpdb->get_row(
    $wpdb->prepare( 'SELECT * FROM %i WHERE id = %d', $this->table(), $id ),
    ARRAY_A
);

// ✅ Combined with a dynamic IN() list: table goes first in the bound array.
$placeholders = implode( ',', array_fill( 0, count( $ids ), '%d' ) );
$rows = $wpdb->get_results(
    $wpdb->prepare(
        "SELECT * FROM %i WHERE id IN ({$placeholders})",
        array_merge( [ $this->table() ], $ids )
    ),
    ARRAY_A
);
```

When bumping the WP minimum isn't an option, OR for a dedicated repository / DB-layer class that genuinely binds every value through `$wpdb->prepare()` and only interpolates `$wpdb->prefix`-derived names, suppress with a file-level disable:

```php
defined( 'ABSPATH' ) || exit;

/*
 * Dedicated repository for the plugin's custom tables. Every value is bound
 * through $wpdb->prepare() and table names come from $wpdb->prefix; the sniffs
 * below cannot statically verify either.
 */
// phpcs:disable WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL, WordPress.DB.PreparedSQLPlaceholders, PluginCheck.Security.DirectDB
```

For a one-off query in a non-DB class (e.g. injecting clauses into a `WP_Query` filter where rewriting the JOIN with `%i` is invasive), scope it tight:

```php
$clauses['join'] .= $wpdb->prepare(
    // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table name from $wpdb->prefix; folder id bound via %d.
    " INNER JOIN {$relation_table} fmf ON fmf.attachment_id = {$wpdb->posts}.ID AND fmf.folder_id = %d ",
    $folder
);
```

**Gotchas with `%i`**:
- It needs WP 6.2. Check **both** `readme.txt` (`Requires at least:`) **and** the plugin-header docblock — they often drift apart, and Plugin Check reads the header.
- `prepare()` quotes `%i` arguments with backticks, so don't pre-wrap the value (`%i` + `"\`{$table}\`"` would double-quote).
- Placeholders fill left-to-right. When combining `%i` with a dynamic `IN()` list, the table name must come **first** in the bound array: `array_merge( [ $this->table() ], $ids )`.
- Plain raw queries (`$wpdb->query( "DELETE FROM {$table}" )` with no values to bind) still need `prepare()` once you switch to `%i`: `$wpdb->query( $wpdb->prepare( 'DELETE FROM %i', $table ) )`.

### `PluginCheck.Security.DirectDB.UnescapedDBParameter`

Plugin Check's own sniff — fires when a variable flows into a `$wpdb` method. Same judgement as above; if the value is bound or is a `$wpdb->prefix` table name, include `PluginCheck.Security.DirectDB` in the ignore/disable list. Plugin Check honors `phpcs:ignore` / `phpcs:disable` annotations.

### `WordPress.DB.DirectDatabaseQuery.DirectQuery` / `.NoCaching` / `.SchemaChange`

Direct queries against a plugin's **own custom tables** are expected and fine. Suppress with a reason. `.NoCaching` is irrelevant for writes/teardown; `.SchemaChange` covers `CREATE/ALTER/DROP` (migrators, `uninstall.php`). Reads that run often *should* genuinely use `wp_cache_*` — fix those rather than ignore.

### `WordPress.Security.ValidatedSanitizedInput.InputNotSanitized` / `.MissingUnslash`

Every read of `$_GET` / `$_POST` / `$_REQUEST` / `$_COOKIE` / `$_SERVER` must be sanitized **in the same expression as the superglobal access**. The sniff stops tracking the value the moment it lands in an intermediate variable — sanitizing it in a *later* statement does not count.

- Text → `sanitize_text_field( wp_unslash( $_POST['x'] ) )` — unslash first, then a string sanitizer, all wrapping the access.
- Integers → apply `(int)` / `absint()` **directly** to the access. A numeric or bool cast counts as both sanitization *and* unslashing, so do **not** add `wp_unslash()` — inserting it between the access and the cast (`(int) wp_unslash( $_GET['x'] )`) detaches the cast from the superglobal and re-triggers `InputNotSanitized`.

```php
// ✅ recognised: cast applied directly to the access
$folder = isset( $_GET['flexa_mf_folder'] ) ? (int) $_GET['flexa_mf_folder'] : null;

// ❌ NOT recognised: wp_unslash sits between the access and the cast
$folder = (int) wp_unslash( $_GET['flexa_mf_folder'] );
// ❌ NOT recognised: sanitised in a later statement, off the superglobal
$raw = wp_unslash( $_GET['flexa_mf_folder'] ); $folder = (int) $raw;
```

Nested keys are fine as long as the cast wraps the whole access: `(int) $_REQUEST['query']['flexa_mf_folder']`.

### `WordPress.Security.NonceVerification.Missing` / `.Recommended`

- Reading a superglobal **for a state change** → verify a nonce (`check_admin_referer()`, `wp_verify_nonce()`).
- Read-only access inside a **core hook that already nonce-checks** (e.g. `ajax_query_attachments_args`), or a read-only navigation param → sanitize it (see above), then `// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- <why it is safe>`.
- This sniff also fires on `isset()` / `is_array()` checks of a superglobal. Keep the `isset()` validation and the sanitized read on **one line** so a single ignore covers both (the two-line rule).
- The WordPress.org Plugin Review Team sends a **separate template warning** (not a Plugin Check sniff) asking for an explicit `current_user_can()` next to every superglobal read — even when an upstream WP function (`wp_ajax_query_attachments`, `upload.php`, …) already enforces the cap. Silencing the sniff with a `phpcs:ignore` that points at "WP authorizes upstream" passes the tool but still gets a human-reviewer rejection. Add a local cap check after the isset/fast-exit and reference it in the ignore comment.

```php
public function copy_url_query_var( WP_Query $query ): void {
    if ( ! is_admin() || ! $query->is_main_query() ) {
        return;
    }
    // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only nav param; sanitized via (int) cast and gated by the capability check below.
    $folder = isset( $_GET['flexa_mf_folder'] ) ? (int) $_GET['flexa_mf_folder'] : null;
    if ( $folder === null ) {
        return;            // fast-exit before the cap call - unrelated admin pages pay nothing
    }
    if ( ! Capabilities::can_manage_folders() ) {
        return;
    }
    $query->set( 'flexa_mf_folder', $folder );
}
```

Order matters: `isset()` first (cheap), then sanitized read, then cap check (only on actual folder requests). Reversing the last two would call `current_user_can()` on every admin pageload regardless of whether the param is present.

**Never read superglobals at file/global scope** — they would run on every request, including guest pageviews, *and* `current_user_can()` isn't even available before `pluggable.php` loads. Always wrap inside a hook callback or class method. The reviewer's template flags global-scope input access as a stability red flag separately from the cap issue.

**Don't trust the upstream caller alone.** WP-managed hook contexts (e.g. `ajax_query_attachments_args` firing only inside `wp_ajax_query_attachments`) are stable today, but a third-party plugin can invoke the same filter outside that context. The local cap check is cheap defense-in-depth and makes the suppression legitimately auditable.

### `WordPress.WP.EnqueuedResourceParameters.MissingVersion`

Pass a real version as the 4th arg of `wp_enqueue_script()` / `wp_enqueue_style()` — the plugin version constant. Never `null` and never omit it (causes browsers to serve stale cached assets). Applies to dev-mode enqueues too.

```php
wp_enqueue_script( $handle, $url, $deps, FLEXA_MF_VERSION, true );
```

### `PluginCheck.CodeAnalysis.DiscouragedFunctions.load_plugin_textdomainFound`

Remove the `load_plugin_textdomain()` call entirely. Since WP 4.6 translations for WordPress.org-hosted plugins load just-in-time automatically. Keep the text-domain constant (still used by `wp_set_script_translations()` for JS strings) — only the PHP call goes.

### `WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound`

Anything at **global/file scope** must carry the plugin prefix: variables, functions, classes, constants, hook names. Most often hit in `uninstall.php` and the main plugin file. `$folder_table` → `$flexa_mf_folder_table`. (Variables inside a class method or function body are fine — only global scope.)

### readme.txt parser warnings

- `mismatched_plugin_name` — the `=== Name ===` line must match the `Plugin Name:` header in the main PHP file **exactly**.
- `readme_parser_warnings_too_many_tags` — maximum **5** tags. Trim to the 5 most relevant.
- `readme_parser_warnings_no_short_description_present` — add a single line (≤150 chars, no markup) between the header block and `== Description ==`.
- Also keep `Stable tag`, `Tested up to`, and `Requires at least` present and current.

## Verifying your fixes

The `PluginCheck.*` sniffs ship only with the Plugin Check plugin — stock `phpcs` can't run them. The `WordPress.*` ones you can:

```bash
vendor/bin/phpcs -p \
  --sniffs=WordPress.DB.PreparedSQL,WordPress.DB.PreparedSQLPlaceholders,WordPress.DB.DirectDatabaseQuery,WordPress.Security.NonceVerification,WordPress.Security.ValidatedSanitizedInput,WordPress.WP.EnqueuedResourceParameters,WordPress.NamingConventions.PrefixAllGlobals \
  --extensions=php <changed files>
```

Pass the exact sniff codes from the report you are fixing. **Do not** run the project's full `phpcs.xml.dist` to check a Plugin Check fix — it applies the entire `WordPress` standard and buries the relevant result under pre-existing, deliberate project style choices (short arrays, non-Yoda conditions, missing doc comments). Use targeted `--sniffs=` for a sanity check, then re-run `wp plugin check` for the authoritative verdict. Always `php -l` changed files too.

**Watch for fixes that trade one sniff for another.** A change that silences sniff A can introduce sniff B — e.g. wrapping a superglobal in `wp_unslash()` to satisfy `MissingUnslash` detaches a later `(int)` cast and trips `InputNotSanitized`. After fixing, re-run Plugin Check over the *whole* file, not just the lines you touched.

## Workflow

1. Read the JSON/CLI report; group violations by file, then by code.
2. For each code, apply the recipe above — **fix** by default, suppress only confirmed false positives with a `--` reason.
3. Mind the two-line rule: place ignores on (or directly above) the reported line, or use disable/enable blocks.
4. `php -l` every changed file; targeted `phpcs --sniffs=` sanity check.
5. Re-run `wp plugin check <slug>` to confirm zero remaining errors.
