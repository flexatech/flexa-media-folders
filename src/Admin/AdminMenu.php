<?php

declare(strict_types=1);

namespace Flexa\MediaFolders\Admin;

use Flexa\MediaFolders\Support\SingletonTrait;

defined( 'ABSPATH' ) || exit;

final class AdminMenu {
	use SingletonTrait;

	public const SLUG = 'flexa-media-folders';

	public function register(): void {
		add_action( 'admin_menu', [ $this, 'register_menu' ] );
		add_filter( 'plugin_action_links_' . FLEXA_MF_BASENAME, [ $this, 'add_settings_link' ] );
	}

	/**
	 * @param array<string,string> $links
	 * @return array<string,string>
	 */
	public function add_settings_link( array $links ): array {
		$settings = sprintf(
			'<a href="%s">%s</a>',
			esc_url( admin_url( 'upload.php?page=' . self::SLUG ) ),
			esc_html__( 'Settings', 'flexa-media-folders' )
		);

		return array_merge( [ 'settings' => $settings ], $links );
	}

	public function register_menu(): void {
		// Registered as a submenu under Media (upload.php) rather than a
		// top-level menu so the plugin sits next to the feature it extends
		// instead of cluttering the admin sidebar. The hook suffix produced
		// here is `media_page_<SLUG>`; Enqueue.php matches that exact string.
		add_submenu_page(
			'upload.php',
			__( 'Media Folders', 'flexa-media-folders' ),
			__( 'Media Folders', 'flexa-media-folders' ),
			'upload_files',
			self::SLUG,
			[ $this, 'render_page' ]
		);
	}

	public function render_page(): void {
		$template = FLEXA_MF_PATH . 'views/admin-app.php';
		if ( is_readable( $template ) ) {
			require $template;
		}
	}
}
