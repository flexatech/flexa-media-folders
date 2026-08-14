<?php

declare(strict_types=1);

namespace Flexa\MediaFolders\Support;

defined( 'ABSPATH' ) || exit;

/**
 * Capability helpers. The `flexa_mf/capabilities/*` filters allow add-ons to
 * inject per-user scoping or role-based folder access.
 */
final class Capabilities {
	public const MANAGE   = 'upload_files';
	public const EDIT     = 'manage_categories';
	public const SETTINGS = 'manage_options';

	public static function can_manage_folders(): bool {
		return current_user_can( apply_filters( 'flexa_mf/capabilities/manage', self::MANAGE ) );
	}

	/**
	 * Gate for structural changes to the shared folder tree (create, rename,
	 * move, delete, reorder, bulk create). Folders are a single site-wide
	 * taxonomy visible to every user, so mutating the tree is a management
	 * action - `upload_files` (which every author holds) is too low. Defaults
	 * to `manage_categories`, the core capability for editing shared taxonomies,
	 * held by Editors and Administrators. Add-ons can adjust via the filter.
	 */
	public static function can_edit_folders(): bool {
		return current_user_can( apply_filters( 'flexa_mf/capabilities/edit', self::EDIT ) );
	}

	public static function can_manage_settings(): bool {
		return current_user_can( apply_filters( 'flexa_mf/capabilities/settings', self::SETTINGS ) );
	}

	public static function can_access_folder( int $folder_id ): bool {
		return (bool) apply_filters( 'flexa_mf/capabilities/access_folder', self::can_manage_folders(), $folder_id );
	}
}
