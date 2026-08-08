---
name: flexa-security
description: Enforce Flexa Media Folders security and UI conventions. Auto-invoke whenever editing or creating PHP, JS, JSX, or TSX files in this plugin - checks for forbidden inline `<style>`/`<script>` tags, unsanitized superglobal inputs ($_GET/$_POST/$_REQUEST/$_COOKIE/$_SERVER/$_SESSION), missing `permission_callback` on `register_rest_route()` / `wp_register_ability()`, and ensures new admin React form fields follow the project's FormField pattern.
---

# Flexa Media Folders - Security & UI Conventions

Apply these rules to any PHP, JS, JSX, or TSX code you write or modify in this plugin. Run through every check before reporting a task complete. If you find a violation in surrounding code while editing, fix it.

## 1. No inline `<style>` or `<script>` tags

- Never emit `<style>` or `<script>` tags directly in PHP output, HTML templates, or JSX.
- Enqueue styles with `wp_enqueue_style()` and scripts with `wp_enqueue_script()`.
- For React/admin UI, use the existing build pipeline - do not inject inline `<script>`/`<style>`.

If you must pass server data to the client, use `wp_localize_script()` or `wp_add_inline_script()` (data only, no markup).

### Functions for enqueue

| Type of code | Functions |
|---|---|
| Static JS | `wp_register_script()`, `wp_enqueue_script()`, `admin_enqueue_scripts()` |
| Inline JS | `wp_add_inline_script()` |
| Static CSS | `wp_register_style()`, `wp_enqueue_style()` |
| Inline CSS | `wp_add_inline_style()` |

👉 On **public** pages, enqueue via the `wp_enqueue_scripts` hook.
👉 On **admin** pages, enqueue via the `admin_enqueue_scripts` hook. You can also use `admin_print_scripts` and `admin_print_styles`.

## 2. Sanitize all superglobal inputs

Any value read from `$_GET`, `$_POST`, `$_REQUEST`, `$_COOKIE`, `$_SERVER`, or `$_SESSION` is untrusted and MUST be sanitized at the point of read. Pick the function that matches the expected shape:

| Input type | Function |
|---|---|
| Plain text | `sanitize_text_field()` |
| Email | `sanitize_email()` |
| URL (stored) | `esc_url_raw()` |
| Slug / key | `sanitize_key()` |
| Integer | `absint()` (non-negative) or `(int)` cast |
| Filename | `sanitize_file_name()` |
| Textarea | `sanitize_textarea_field()` |
| HTML (rich) | `wp_kses_post()` |

Always unslash before sanitizing: `sanitize_text_field( wp_unslash( $_POST['name'] ?? '' ) )`.

For nonces, verify with `check_admin_referer()` / `wp_verify_nonce()` in addition to sanitizing.

When outputting to the page, escape at output: `esc_html()`, `esc_attr()`, `esc_url()`, `esc_js()`, `wp_kses_post()`.

## 3. `permission_callback` is required on every REST route

Every `register_rest_route()` and `wp_register_ability()` call MUST include a `permission_callback`. Never use `'__return_true'` for endpoints that read or write privileged data - pick the capability that matches what the endpoint does.

```php
register_rest_route( 'flexa-media-folder/v1', '/my-endpoint', array(
    'methods'             => 'GET',
    'callback'            => 'flexa_media_folder_callback_function',
    'permission_callback' => function () {
        return current_user_can( 'manage_options' );
    },
) );
```

Guidance for picking capability:
- Settings / admin-only data → `manage_options`
- Media library reads/writes → `upload_files`
- Editing posts → `edit_posts` (or per-post `edit_post` with the ID)
- Public, intentionally unauthenticated endpoint → still set `permission_callback` to a function that returns `true` and add a comment explaining why it is public.

## 4. New admin React form fields follow the FormField pattern

Use this exact shape for any new form field in the admin React app. `control={form.control}` is required - the field will not register without it.

```tsx
<FormField
  control={form.control}
  name="thing.fieldName"
  render={({ field }) => (
    <FormItem>
      <FormLabel>{__('Field name')}</FormLabel>
      <FormControl>
        <Input {...field} value={field.value ?? ''} placeholder="…" />
      </FormControl>
      <FormDescription>{__('What this field does.')}</FormDescription>
      <FormMessage />
    </FormItem>
  )}
/>
```

Rules:
- Wrap all user-visible strings in `__('…')` (or `_x`, `_n` as appropriate) for i18n.
- Coalesce nullish values with `field.value ?? ''` so the input stays controlled.
- Use `FormDescription` for help text and `FormMessage` for validation errors - do not roll your own.
- For non-text inputs (Select, Switch, Checkbox), replace `<Input>` but keep the `FormField` / `FormItem` / `FormLabel` / `FormControl` / `FormDescription` / `FormMessage` structure.

## Review checklist

Before declaring a PHP or TSX change done:

- [ ] No inline `<style>` or `<script>` tags introduced.
- [ ] Every new read from `$_GET` / `$_POST` / `$_REQUEST` / `$_COOKIE` / `$_SERVER` / `$_SESSION` is unslashed and sanitized with the right function.
- [ ] Every new `register_rest_route()` / `wp_register_ability()` has a `permission_callback` with a real capability check.
- [ ] Output is escaped at the point of output (`esc_html`, `esc_attr`, `esc_url`, `wp_kses_post`).
- [ ] New admin form fields use the `FormField` pattern above with `control={form.control}` and `__()` strings.

If any check fails, fix it before handing the work back.
