<?php

declare(strict_types=1);

namespace Flexa\MediaFolders\Install;

defined( 'ABSPATH' ) || exit;

/**
 * Versioned schema migrator. Runs on activation and on admin_init via maybe_upgrade.
 */
final class Migrator {
	public const DB_VERSION       = '1.0.0';
	public const VERSION_OPTION   = 'flexa_mf_db_version';
	public const FOLDER_TABLE     = 'flexa_mf_folder';
	public const RELATION_TABLE   = 'flexa_mf_attachment_folder';

	public static function maybe_upgrade(): void {
		$installed = (string) get_option( self::VERSION_OPTION, '' );
		if ( $installed === self::DB_VERSION ) {
			return;
		}
		self::migrate();
	}

	public static function migrate(): void {
		global $wpdb;

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		$charset_collate = $wpdb->get_charset_collate();
		$folder_table    = $wpdb->prefix . self::FOLDER_TABLE;
		$relation_table  = $wpdb->prefix . self::RELATION_TABLE;

		$folder_sql = "CREATE TABLE {$folder_table} (
			id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
			name VARCHAR(190) NOT NULL DEFAULT '',
			parent BIGINT UNSIGNED NOT NULL DEFAULT 0,
			ord INT NOT NULL DEFAULT 0,
			type VARCHAR(40) NOT NULL DEFAULT 'attachment',
			color VARCHAR(20) DEFAULT NULL,
			created_by BIGINT UNSIGNED NOT NULL DEFAULT 0,
			created_at DATETIME NOT NULL DEFAULT '0000-00-00 00:00:00',
			updated_at DATETIME NOT NULL DEFAULT '0000-00-00 00:00:00',
			PRIMARY KEY  (id),
			KEY parent_idx (parent),
			KEY type_parent_ord_idx (type, parent, ord),
			KEY created_by_idx (created_by)
		) {$charset_collate};";

		$relation_sql = "CREATE TABLE {$relation_table} (
			attachment_id BIGINT UNSIGNED NOT NULL,
			folder_id BIGINT UNSIGNED NOT NULL,
			ord INT NOT NULL DEFAULT 0,
			PRIMARY KEY  (attachment_id, folder_id),
			KEY folder_idx (folder_id),
			KEY folder_ord_idx (folder_id, ord)
		) {$charset_collate};";

		dbDelta( $folder_sql );
		dbDelta( $relation_sql );

		update_option( self::VERSION_OPTION, self::DB_VERSION, false );
	}
}
