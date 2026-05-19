<?php

declare(strict_types=1);

namespace Flexa\MediaFolders\Support;

use Flexa\MediaFolders\Install\Migrator;
use Flexa\MediaFolders\Rest\SettingsController;

defined( 'ABSPATH' ) || exit;

/**
 * Wipes all Flexa Media Folders data: every folder, every attachment relation,
 * and the settings option. Used by the Settings page danger zone and by the
 * `wp flexa-mf reset` CLI command - having one helper keeps both code paths
 * consistent so they can never drift.
 *
 * Media files in the WP Media Library are never touched.
 */
final class Resetter {
	/**
	 * @return array{folders:int, relations:int}
	 */
	public static function reset_all(): array {
		global $wpdb;

		$folder_table   = $wpdb->prefix . Migrator::FOLDER_TABLE;
		$relation_table = $wpdb->prefix . Migrator::RELATION_TABLE;

		// phpcs:disable WordPress.DB.DirectDatabaseQuery, PluginCheck.Security.DirectDB -- Bulk teardown of the plugin's own custom tables; table identifiers are bound via the %i placeholder and there is nothing to cache.
		$relations_removed = (int) $wpdb->query( $wpdb->prepare( 'DELETE FROM %i', $relation_table ) );
		$folders_removed   = (int) $wpdb->query( $wpdb->prepare( 'DELETE FROM %i', $folder_table ) );
		// phpcs:enable WordPress.DB.DirectDatabaseQuery, PluginCheck.Security.DirectDB

		delete_option( SettingsController::OPTION_KEY );

		do_action( 'flexa_mf/data_reset' );

		return [
			'folders'   => $folders_removed,
			'relations' => $relations_removed,
		];
	}
}
