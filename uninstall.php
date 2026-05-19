<?php
/**
 * Uninstall handler. Drops plugin tables and options.
 */

declare(strict_types=1);

defined( 'WP_UNINSTALL_PLUGIN' ) || exit;

global $wpdb;

$flexa_mf_folder_table   = $wpdb->prefix . 'flexa_mf_folder';
$flexa_mf_relation_table = $wpdb->prefix . 'flexa_mf_attachment_folder';

// phpcs:disable WordPress.DB, PluginCheck.Security.DirectDB -- One-off table teardown on uninstall; table names are derived from $wpdb->prefix and object caching is irrelevant here.
$wpdb->query( "DROP TABLE IF EXISTS `{$flexa_mf_relation_table}`" );
$wpdb->query( "DROP TABLE IF EXISTS `{$flexa_mf_folder_table}`" );
// phpcs:enable WordPress.DB, PluginCheck.Security.DirectDB

delete_option( 'flexa_mf_db_version' );
delete_option( 'flexa_mf_settings' );
