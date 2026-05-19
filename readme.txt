=== Flexa Media Folders ===
Contributors: flexatech
Tags: media library, folders, media, organize, attachments
Requires at least: 6.2
Tested up to: 6.9
Requires PHP: 8.2
Stable tag: 1.0.1
License: GPL v2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Organize the WordPress Media Library into drag-and-drop folders with a fast React tree, color labels, and a REST API.

== Description ==

Flexa Media Folders adds a hierarchical, drag-and-drop folder tree to the WordPress Media Library. Group images, videos, documents and any other attachment into nested folders, then filter the library to a single folder with one click - in the grid view, the list view, and the media picker inside the post editor.

Folders are stored in two dedicated, indexed database tables, so your `wp_term*` tables stay clean and the tree loads fast even with thousands of files.

= Features =

* **Hierarchical folder tree** - create unlimited nested folders, rename them, and reorder them by drag-and-drop.
* **Drag attachments into folders** - drag an item from the Media Library straight onto a folder.
* **Works everywhere the Media Library does** - the folder sidebar appears on the Media grid, the list view (`upload.php`), and the media modal in both the block editor and the Classic Editor.
* **One-click filtering** - click a folder to filter the library to it, plus built-in "All files" and "Uncategorized" views.
* **Color labels** - assign one of 18 colors to any folder from the right-click menu to spot it at a glance.
* **Full context menu** - New Folder, Rename, Cut, Paste, Delete and Change Color, all from a right-click.
* **File counts** - each folder can show how many attachments it contains (toggle in Settings).
* **Folder search** - filter the folder tree as you type.
* **Settings page** - choose a default folder for new uploads (none / last used / a specific folder), set the folder sort order, toggle file counts, and exclude specific post types from showing the sidebar.
* **Dark mode** - the tree automatically follows your WordPress admin color scheme.
* **Accessible** - full ARIA tree semantics, keyboard navigation, and visible focus styles.
* **Translation ready** - every string is internationalized and a `.pot` template is bundled.
* **REST API** - all screens are powered by a REST API under `/wp-json/flexa-mf/v1/`, so external integrations and your own code can read and manage folders too.
* **WP-CLI** - manage folders and reset plugin data from the command line with `wp flexa-mf`.
* **Clean uninstall** - a Settings danger zone (and `wp flexa-mf reset`) wipes all plugin data on demand; uninstalling the plugin drops its tables. Your media files are never touched.

= Source code for compiled JavaScript and CSS =

The plugin ships with minified/compiled JavaScript and CSS in `assets/dist/`. The human-readable source code for these assets is publicly available and maintained at:

https://github.com/flexatech/flexa-media-folders

== Installation ==

1. Upload the plugin files to `/wp-content/plugins/flexa-media-folders`, or install it through the WordPress **Plugins** screen.
2. Activate the plugin through the **Plugins** screen.
3. Open **Media** in the admin menu - the folder sidebar appears next to your library. Visit **Media → Media Folders** to configure defaults.

== Frequently Asked Questions ==

= Does this move or rename my media files? =

No. Folders are an organizational layer stored separately in the database. Your files stay exactly where WordPress put them, with the same URLs.

= What happens to my folders if I deactivate or delete the plugin? =

Deactivating keeps all folder data. Deleting (uninstalling) the plugin drops its database tables and removes its settings - but your media files are never deleted. You can also wipe folder data on demand from the Settings danger zone.

= Does it use WordPress taxonomies? =

No. Folders live in two dedicated, indexed tables. This keeps your `wp_term*` tables clean and lets the tree load in a single query.

= Can I filter the Media Library by folder inside the post editor? =

Yes. The folder sidebar is available in the media modal in both the block editor and the Classic Editor.

= Is there a REST API? =

Yes - all folder data is exposed under `/wp-json/flexa-mf/v1/`. The endpoints require the same capabilities as the Media Library itself.

= How does the plugin handle authentication and permissions? =

Every state-changing request goes through the WordPress REST API and is gated by two checks: a capability check (`upload_files` for folder actions, `manage_options` for settings and the data-reset endpoint) and the standard WordPress REST nonce (`X-WP-Nonce`). The plugin does not register any custom admin-ajax endpoints. Both capability gates are filterable via `flexa_mf/capabilities/manage` and `flexa_mf/capabilities/settings` if you need to tighten or loosen them.

= Can I stop the sidebar from showing on a particular post type? =

Yes. The plugin's Settings page has a per-post-type exclusion list.

== Screenshots ==

1. The folder tree sidebar in the Media Library grid view.
2. Dragging selected attachments onto a folder.
3. The folder right-click context menu with the color palette.
4. The folder sidebar inside the block editor media modal.
5. The Flexa Media Folders settings page.

== Changelog ==

= 1.0.1 =
* Security: bind every custom-table identifier through `wpdb::prepare()`'s `%i` placeholder so no SQL string interpolates a table name outside `prepare()`.
* Security: gate the Media Library query-filter superglobal reads behind an explicit `current_user_can()` check (defense in depth on top of WordPress's upstream cap enforcement).
* Fix: the admin UI now loads correctly on the Settings page.
* Fix: dark-mode styling on the folder tree, drag tooltip, and toast.
* Compatibility: minimum WordPress version bumped from 5.8 to 6.2 (required for the `%i` placeholder).

= 1.0.0 =
* Initial release.
* Hierarchical, drag-and-drop folder tree for the Media Library.
* Drag attachments into folders.
* Folder sidebar in the Media grid, the list view, and the editor media modal.
* One-click folder filtering with built-in "All files" and "Uncategorized" views.
* Folder color labels (18-color palette) and a full right-click context menu.
* Per-folder file counts, folder-tree search, and a Settings page (default upload folder, sort order, count display, post-type exclusions).
* Dark mode that follows the WordPress admin color scheme; full keyboard and ARIA accessibility.
* REST API under `/wp-json/flexa-mf/v1/` and `wp flexa-mf` WP-CLI commands.
* Translation ready with a bundled `.pot` template.

== Upgrade Notice ==

= 1.0.1 =
Security hardening for SQL identifier binding and admin capability checks; dark-mode and settings-page UI fixes. Now requires WordPress 6.2 or later.

= 1.0.0 =
Initial release of Flexa Media Folders.
