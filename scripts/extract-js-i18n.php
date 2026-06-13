<?php
/**
 * i18n helper for makepot.sh — run via `wp eval-file ... --skip-wordpress`.
 *
 * Modes (first positional arg):
 *   extract  — pull literal __()/_x()/_n() calls out of the TS/TSX admin app
 *              into plain-JS stub files (same relative paths + line numbers)
 *              so `wp i18n make-pot` can parse them without a TS toolchain.
 *              Strings must be literals (see apps/admin/src/lib/i18n.ts).
 *   fix-refs — rewrite stub-file references in build/.makepot/js.pot back to
 *              the real apps/admin/src/*.ts(x) paths.
 */

declare(strict_types=1);

$root    = dirname( __DIR__ );
$src_dir = $root . '/apps/admin/src';
$tmp_dir = $root . '/build/.makepot/js';
$js_pot  = $root . '/build/.makepot/js.pot';
$mode    = $args[0] ?? 'extract';

// A JS string literal: double- or single-quoted, with escape support.
$str     = '(?:"(?:[^"\\\\]|\\\\.)*"|\'(?:[^\'\\\\]|\\\\.)*\')';
$pattern = '/(?<![\\w$.])(__|_x|_n)\\s*\\(\\s*(' . $str . ')(?:\\s*,\\s*(' . $str . '))?/';

if ( 'extract' === $mode ) {
	$files = new RecursiveIteratorIterator( new RecursiveDirectoryIterator( $src_dir, FilesystemIterator::SKIP_DOTS ) );
	$total = 0;

	foreach ( $files as $file ) {
		if ( ! preg_match( '/\.tsx?$/', $file->getFilename() ) ) {
			continue;
		}

		$content = file_get_contents( $file->getPathname() );
		if ( false === $content || ! preg_match_all( $pattern, $content, $matches, PREG_OFFSET_CAPTURE | PREG_SET_ORDER ) ) {
			continue;
		}

		// Place each reconstructed call on its original line so POT references line up.
		$lines = array();
		foreach ( $matches as $m ) {
			$fn     = $m[1][0];
			$first  = $m[2][0];
			$second = isset( $m[3] ) && '' !== $m[3][0] ? $m[3][0] : null;

			if ( '__' === $fn ) {
				$call = "__({$first});";
			} elseif ( null === $second ) {
				continue; // _x/_n need two literal args; non-literal calls are a convention violation.
			} elseif ( '_x' === $fn ) {
				$call = "_x({$first}, {$second});";
			} else {
				$call = "_n({$first}, {$second}, 1);";
			}

			$line             = substr_count( $content, "\n", 0, $m[0][1] ) + 1;
			$lines[ $line ][] = $call;
			++$total;
		}

		if ( ! $lines ) {
			continue;
		}

		$max  = max( array_keys( $lines ) );
		$stub = '';
		for ( $i = 1; $i <= $max; $i++ ) {
			$stub .= ( isset( $lines[ $i ] ) ? implode( ' ', $lines[ $i ] ) : '' ) . "\n";
		}

		$rel = substr( $file->getPathname(), strlen( $src_dir ) + 1 );
		$out = $tmp_dir . '/' . preg_replace( '/\.tsx?$/', '.js', $rel );
		if ( ! is_dir( dirname( $out ) ) ) {
			mkdir( dirname( $out ), 0755, true );
		}
		file_put_contents( $out, $stub );
	}

	echo "Extracted {$total} i18n calls into {$tmp_dir}\n";
	return;
}

if ( 'fix-refs' === $mode ) {
	$pot = file_get_contents( $js_pot );
	if ( false === $pot ) {
		fwrite( STDERR, "Missing {$js_pot}\n" );
		exit( 1 );
	}

	$pot = preg_replace_callback(
		'/^#: (.+)$/m',
		function ( $m ) use ( $src_dir ) {
			$out = array();
			foreach ( preg_split( '/\s+/', trim( $m[1] ) ) as $ref ) {
				if ( preg_match( '/^(.*)\.js:(\d+)$/', $ref, $r ) ) {
					$ext   = file_exists( "{$src_dir}/{$r[1]}.tsx" ) ? 'tsx' : ( file_exists( "{$src_dir}/{$r[1]}.ts" ) ? 'ts' : 'js' );
					$out[] = "apps/admin/src/{$r[1]}.{$ext}:{$r[2]}";
				} else {
					$out[] = $ref;
				}
			}
			return '#: ' . implode( ' ', $out );
		},
		$pot
	);

	file_put_contents( $js_pot, $pot );
	echo "Rewrote references in {$js_pot}\n";
	return;
}

fwrite( STDERR, "Unknown mode '{$mode}' (expected 'extract' or 'fix-refs')\n" );
exit( 1 );
