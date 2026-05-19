<?php

declare(strict_types=1);

namespace Flexa\MediaFolders\Support;

defined( 'ABSPATH' ) || exit;

/**
 * Capability helpers. Pro overrides `flexa_mf/capabilities/manage` and friends
 * to inject per-user scoping or role-based folder access.
 */
final class Capabilities {
	public const MANAGE   = 'upload_files';
	public const SETTINGS = 'manage_options';

	public static function can_manage_folders(): bool {
		return current_user_can( apply_filters( 'flexa_mf/capabilities/manage', self::MANAGE ) );
	}

	public static function can_manage_settings(): bool {
		return current_user_can( apply_filters( 'flexa_mf/capabilities/settings', self::SETTINGS ) );
	}

	public static function can_access_folder( int $folder_id ): bool {
		return (bool) apply_filters( 'flexa_mf/capabilities/access_folder', self::can_manage_folders(), $folder_id );
	}
}
