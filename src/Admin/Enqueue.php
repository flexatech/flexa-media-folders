<?php

declare(strict_types=1);

namespace Flexa\MediaFolders\Admin;

use Flexa\MediaFolders\Rest\SettingsController;
use Flexa\MediaFolders\Support\SingletonTrait;

defined( 'ABSPATH' ) || exit;

/**
 * Reads the Vite manifest and enqueues built assets. In dev mode (FLEXA_MF_DEV
 * constant defined or `apps/admin/.dev` marker file present) it loads from the
 * local Vite dev server (default http://localhost:5173) with HMR.
 */
final class Enqueue {
	use SingletonTrait;

	private const HANDLE_ADMIN = 'flexa-mf-admin';
	private const HANDLE_MAIN  = 'flexa-mf-main';

	public function register(): void {
		add_action( 'admin_enqueue_scripts', [ $this, 'enqueue_admin' ] );
	}

	public function enqueue_admin( string $hook_suffix ): void {
		// Hook suffix for an `add_submenu_page( 'upload.php', … )` registration
		// is `media_page_<SLUG>`. If AdminMenu moves the page elsewhere, this
		// string has to move with it.
		$is_settings_page = 'media_page_' . AdminMenu::SLUG === $hook_suffix;
		$is_media_screen  = in_array(
			$hook_suffix,
			[ 'upload.php', 'post.php', 'post-new.php' ],
			true
		);

		if ( ! $is_settings_page && ! $is_media_screen ) {
			return;
		}

		// Honor the per-post-type exclusion list on post edit screens.
		// upload.php has no post_type and is always shown.
		if ( in_array( $hook_suffix, [ 'post.php', 'post-new.php' ], true ) ) {
			$screen    = function_exists( 'get_current_screen' ) ? get_current_screen() : null;
			$post_type = $screen ? (string) $screen->post_type : '';
			if ( $post_type !== '' && $this->is_post_type_excluded( $post_type ) ) {
				return;
			}
		}

		if ( $is_media_screen ) {
			wp_enqueue_media();
		}

		$entry   = $is_settings_page ? 'src/settings.tsx' : 'src/main.tsx';
		$handle  = $is_settings_page ? self::HANDLE_ADMIN : self::HANDLE_MAIN;
		$context = $is_settings_page ? 'settings' : 'media-library';

		if ( $this->is_dev_mode() ) {
			// The dev-server enqueue lives in a separate file that is excluded
			// from the production build (.distignore), so its intentionally
			// version-less wp_enqueue_script() calls never ship. is_dev_mode()
			// is false in a distributed install anyway; the is_readable() guard
			// is just defense-in-depth if this branch is somehow reached.
			$dev_server = __DIR__ . '/dev-server.php';
			if ( is_readable( $dev_server ) ) {
				require_once $dev_server;
				flexa_mf_enqueue_dev_server( $handle, $entry );
			}
		} else {
			$this->enqueue_prod( $handle, $entry );
		}

		// Translations for JS strings come from i18n/languages/{domain}-{locale}-{handle}.json.
		wp_set_script_translations(
			$handle,
			FLEXA_MF_TEXT_DOMAIN,
			FLEXA_MF_PATH . 'i18n/languages'
		);

		wp_localize_script(
			$handle,
			'flexaMF',
			[
				'restUrl'     => esc_url_raw( rest_url( FLEXA_MF_REST_NAMESPACE . '/' ) ),
				'restNonce'   => wp_create_nonce( 'wp_rest' ),
				'context'     => $context,
				'version'     => FLEXA_MF_VERSION,
				'pluginUrl'   => esc_url_raw( FLEXA_MF_URL ),
				'locale'      => determine_locale(),
				'theme'       => $this->detect_admin_theme(),
				'settingsUrl' => esc_url_raw( admin_url( 'upload.php?page=' . AdminMenu::SLUG ) ),
			]
		);
	}

	/**
	 * Resolve the WP admin color scheme to a coarse light/dark bucket. The
	 * "midnight", "ectoplasm", and "ocean" schemes are dark; the rest are
	 * light. The React app applies `data-theme="dark"` to its root accordingly.
	 */
	private function detect_admin_theme(): string {
		$scheme = (string) get_user_option( 'admin_color' );
		if ( $scheme === '' ) {
			$scheme = 'fresh';
		}
		$dark_schemes = [ 'midnight', 'ectoplasm', 'ocean', 'coffee' ];
		return in_array( $scheme, $dark_schemes, true ) ? 'dark' : 'light';
	}

	private function is_post_type_excluded( string $post_type ): bool {
		$stored = get_option( SettingsController::OPTION_KEY, [] );
		if ( ! is_array( $stored ) ) {
			return false;
		}
		$excluded = $stored['excluded_post_types'] ?? [];
		return is_array( $excluded ) && in_array( $post_type, $excluded, true );
	}

	private function is_dev_mode(): bool {
		if ( defined( 'FLEXA_MF_DEV' ) && FLEXA_MF_DEV ) {
			return true;
		}
		return file_exists( FLEXA_MF_PATH . 'apps/admin/.dev' );
	}

	private function enqueue_prod( string $handle, string $entry ): void {
		$manifest_path = FLEXA_MF_PATH . 'assets/dist/.vite/manifest.json';
		if ( ! is_readable( $manifest_path ) ) {
			$manifest_path = FLEXA_MF_PATH . 'assets/dist/manifest.json';
		}
		if ( ! is_readable( $manifest_path ) ) {
			return;
		}

		$manifest_raw = file_get_contents( $manifest_path );
		if ( $manifest_raw === false ) {
			return;
		}
		$manifest = json_decode( $manifest_raw, true );
		if ( ! is_array( $manifest ) || ! isset( $manifest[ $entry ] ) ) {
			return;
		}

		$item     = $manifest[ $entry ];
		$dist_url = FLEXA_MF_URL . 'assets/dist/';

		// Vite hoists CSS that is shared across entries onto the imported
		// vendor chunk rather than the entry itself, so the entry's own
		// `css` array is empty. Walk the `imports` graph to pick it all up.
		$css_files = $this->collect_manifest_css( $manifest, $entry );
		foreach ( $css_files as $i => $css_file ) {
			wp_enqueue_style(
				$handle . '-css-' . $i,
				$dist_url . $css_file,
				[],
				FLEXA_MF_VERSION
			);
		}

		wp_enqueue_script(
			$handle,
			$dist_url . ( $item['file'] ?? '' ),
			[ 'wp-i18n' ],
			FLEXA_MF_VERSION,
			true
		);

		add_filter(
			'script_loader_tag',
			static function ( string $tag, string $h ) use ( $handle ): string {
				if ( $h === $handle ) {
					return str_replace( '<script ', '<script type="module" ', $tag );
				}
				return $tag;
			},
			10,
			2
		);
	}

	/**
	 * Collect every CSS file reachable from a Vite manifest entry, following
	 * the `imports` graph. Vite attaches CSS shared between entries to the
	 * imported chunk, not the entry, so a flat `$item['css']` read misses it.
	 *
	 * @param array<string,mixed>   $manifest Decoded Vite manifest.
	 * @param string                $key      Manifest key to walk from.
	 * @param array<string,true>    $seen     Cycle guard (internal).
	 * @return list<string> De-duplicated, 0-indexed list of CSS file paths.
	 */
	private function collect_manifest_css( array $manifest, string $key, array &$seen = [] ): array {
		if ( isset( $seen[ $key ] ) || ! isset( $manifest[ $key ] ) || ! is_array( $manifest[ $key ] ) ) {
			return [];
		}
		$seen[ $key ] = true;

		$item = $manifest[ $key ];
		$css  = [];

		if ( ! empty( $item['css'] ) && is_array( $item['css'] ) ) {
			$css = $item['css'];
		}
		if ( ! empty( $item['imports'] ) && is_array( $item['imports'] ) ) {
			foreach ( $item['imports'] as $import_key ) {
				$css = array_merge(
					$css,
					$this->collect_manifest_css( $manifest, (string) $import_key, $seen )
				);
			}
		}

		return array_values( array_unique( $css ) );
	}
}
