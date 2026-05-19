<?php
/**
 * Vite dev-server asset enqueue - local development only.
 *
 * This file is intentionally EXCLUDED from the production build (see
 * .distignore) and is required on demand by Admin\Enqueue when dev mode is
 * active. Because it never ships, the dev-only wp_enqueue_script() calls below
 * - which omit a version on purpose to keep the Vite module URL query-free -
 * never reach a distributed install or Plugin Check.
 *
 * It is a plain require()'d file, not PSR-4 autoloaded: a missing class would
 * fatal if referenced, but a missing file is a silent no-op behind the
 * is_readable() guard in Enqueue.
 */

declare(strict_types=1);

namespace Flexa\MediaFolders\Admin;

defined( 'ABSPATH' ) || exit;

/**
 * Resolve the Vite dev-server origin (no trailing slash).
 */
function flexa_mf_dev_server_url(): string {
	if ( defined( 'FLEXA_MF_DEV_SERVER' ) && is_string( FLEXA_MF_DEV_SERVER ) ) {
		return rtrim( FLEXA_MF_DEV_SERVER, '/' );
	}
	return 'http://localhost:5173';
}

/**
 * Enqueue the Vite dev-server client + entry module with React Fast Refresh.
 */
function flexa_mf_enqueue_dev_server( string $handle, string $entry ): void {
	$base = flexa_mf_dev_server_url();

	// No `?ver=` query on dev-server URLs: Vite's esbuild plugin derives the
	// loader from the file extension, and `main.tsx?ver=1.0.0` defeats that
	// ("Invalid loader value" on every request). `null` keeps the URL clean.
	wp_enqueue_script( $handle . '-client', $base . '/@vite/client', [], null, false );
	wp_enqueue_script(
		$handle,
		$base . '/' . $entry,
		[ $handle . '-client', 'wp-i18n' ],
		null,
		true
	);

	add_filter(
		'script_loader_tag',
		static function ( string $tag, string $h ) use ( $handle, $base ): string {
			if ( $h === $handle . '-client' ) {
				$tag         = str_replace( '<script ', '<script type="module" ', $tag );
				$refresh_url = esc_url( $base . '/@react-refresh' );
				$preamble    =
					'<script type="module">' .
					'import RefreshRuntime from "' . $refresh_url . '";' .
					'RefreshRuntime.injectIntoGlobalHook(window);' .
					'window.$RefreshReg$ = () => {};' .
					'window.$RefreshSig$ = () => (type) => type;' .
					'window.__vite_plugin_react_preamble_installed__ = true;' .
					'</script>';
				return $tag . $preamble;
			}
			if ( $h === $handle ) {
				return str_replace( '<script ', '<script type="module" ', $tag );
			}
			return $tag;
		},
		10,
		2
	);
}
