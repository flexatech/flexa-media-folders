<?php
/**
 * Plugin Name:       Flexa Media Folders
 * Description:       Organize the WordPress Media Library into a hierarchical, drag-and-drop folder tree.
 * Version:           1.0.1
 * Requires at least: 6.2
 * Requires PHP:      8.2
 * Author:            Flexa Tech
 * Author URI:        https://flexa.vn
 * License:           GPL v2 or later
 * License URI:       https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:       flexa-media-folders
 * Domain Path:       /i18n/languages
 */

declare(strict_types=1);

defined( 'ABSPATH' ) || exit;

if ( version_compare( PHP_VERSION, '8.2', '<' ) ) {
	add_action(
		'admin_notices',
		static function (): void {
			echo '<div class="notice notice-error"><p>';
			echo esc_html__( 'Flexa Media Folders requires PHP 8.2 or higher. The plugin has been disabled.', 'flexa-media-folders' );
			echo '</p></div>';
		}
	);
	return;
}

define( 'FLEXA_MF_VERSION', '1.0.1' );
define( 'FLEXA_MF_FILE', __FILE__ );
define( 'FLEXA_MF_PATH', plugin_dir_path( __FILE__ ) );
define( 'FLEXA_MF_URL', plugin_dir_url( __FILE__ ) );
define( 'FLEXA_MF_BASENAME', plugin_basename( __FILE__ ) );
define( 'FLEXA_MF_REST_NAMESPACE', 'flexa-mf/v1' );
define( 'FLEXA_MF_TEXT_DOMAIN', 'flexa-media-folders' );

if ( file_exists( FLEXA_MF_PATH . 'vendor/autoload.php' ) ) {
	require_once FLEXA_MF_PATH . 'vendor/autoload.php';
} else {
	spl_autoload_register(
		static function ( string $class ): void {
			$prefix = 'Flexa\\MediaFolders\\';
			if ( ! str_starts_with( $class, $prefix ) ) {
				return;
			}
			$relative = substr( $class, strlen( $prefix ) );
			$file     = FLEXA_MF_PATH . 'src/' . str_replace( '\\', '/', $relative ) . '.php';
			if ( is_readable( $file ) ) {
				require $file;
			}
		}
	);
}

register_activation_hook( __FILE__, [ \Flexa\MediaFolders\Install\Activator::class, 'activate' ] );
register_deactivation_hook( __FILE__, [ \Flexa\MediaFolders\Install\Deactivator::class, 'deactivate' ] );

add_action(
	'plugins_loaded',
	static function (): void {
		\Flexa\MediaFolders\Plugin::instance()->boot();
	}
);
