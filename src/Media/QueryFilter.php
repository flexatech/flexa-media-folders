<?php

declare(strict_types=1);

namespace Flexa\MediaFolders\Media;

use Flexa\MediaFolders\Install\Migrator;
use Flexa\MediaFolders\Support\Capabilities;
use Flexa\MediaFolders\Support\SingletonTrait;
use WP_Query;

defined( 'ABSPATH' ) || exit;

/**
 * Bridges the {@see flexa_mf_folder} query var into WP_Query so the standard
 * media library (grid + list + modal) can filter by folder. Two entry points:
 *
 *  - {@see ajax_query_attachments_args} - the media modal posts a `query` array
 *    via admin-ajax; we copy `query.flexa_mf_folder` into the query vars.
 *  - {@see parse_query} - the list-view (upload.php) reads `?flexa_mf_folder=…`
 *    from the URL and the query var gets registered the same way.
 *
 * Once the query var is set, {@see posts_clauses} JOINs the relation table.
 * Two special bucket values mirror {@see AttachmentController}:
 *   -1 → All files (no filter)
 *    0 → Uncategorized (LEFT JOIN, no relation rows)
 *
 * Symmetry with the REST controller is intentional - the front-end uses the
 * same bucket constants whether it talks to admin-ajax or to /wp-json.
 */
final class QueryFilter {
	use SingletonTrait;

	public const QUERY_VAR           = 'flexa_mf_folder';
	public const SPECIAL_ALL         = -1;
	public const SPECIAL_UNCATEGORIZED = 0;

	public function register(): void {
		add_filter( 'query_vars', [ $this, 'register_query_var' ] );
		add_filter( 'ajax_query_attachments_args', [ $this, 'copy_ajax_query_var' ] );
		add_action( 'parse_query', [ $this, 'copy_url_query_var' ] );
		add_filter( 'posts_clauses', [ $this, 'join_relation_table' ], 10, 2 );
	}

	/**
	 * @param array<int,string> $vars
	 * @return array<int,string>
	 */
	public function register_query_var( array $vars ): array {
		$vars[] = self::QUERY_VAR;
		return $vars;
	}

	/**
	 * Media modal: $_REQUEST['query']['flexa_mf_folder'] → $args[flexa_mf_folder].
	 *
	 * @param array<string,mixed> $args
	 * @return array<string,mixed>
	 */
	public function copy_ajax_query_var( array $args ): array {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only filter on the core ajax_query_attachments_args hook; sanitized via (int) cast and gated by the capability check below.
		$folder = isset( $_REQUEST['query'][ self::QUERY_VAR ] ) ? (int) $_REQUEST['query'][ self::QUERY_VAR ] : null;
		if ( $folder === null ) {
			return $args;
		}
		// Defense-in-depth: wp_ajax_query_attachments() already enforces
		// `upload_files` upstream, but a third-party plugin could invoke
		// this filter outside that context. Re-check before honoring the
		// folder hint so a no-cap caller can't influence the query.
		if ( ! Capabilities::can_manage_folders() ) {
			return $args;
		}
		$args[ self::QUERY_VAR ] = $folder;
		return $args;
	}

	/**
	 * List view: ?flexa_mf_folder=… on upload.php gets surfaced as a query var.
	 */
	public function copy_url_query_var( WP_Query $query ): void {
		if ( ! is_admin() || ! $query->is_main_query() ) {
			return;
		}
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- Read-only navigation parameter; sanitized via (int) cast and gated by the capability check below. A nonce would break the URL on every bookmark/share.
		$folder = isset( $_GET[ self::QUERY_VAR ] ) ? (int) $_GET[ self::QUERY_VAR ] : null;
		if ( $folder === null ) {
			return;
		}
		// upload.php itself is gated by `upload_files`, but parse_query fires
		// on every admin screen. Re-check the cap so the query var can't be
		// smuggled in from an unrelated admin page by someone without media
		// access (e.g. a Contributor visiting a custom CPT screen).
		if ( ! Capabilities::can_manage_folders() ) {
			return;
		}
		$query->set( self::QUERY_VAR, $folder );
	}

	/**
	 * Applies the folder JOIN when a query carries the flexa_mf_folder var.
	 *
	 * @param array<string,string> $clauses
	 * @return array<string,string>
	 */
	public function join_relation_table( array $clauses, WP_Query $query ): array {
		if ( $query->get( 'post_type' ) !== 'attachment' ) {
			return $clauses;
		}
		$bucket = $query->get( self::QUERY_VAR, null );
		if ( $bucket === null || $bucket === '' ) {
			return $clauses;
		}
		$bucket = (int) $bucket;
		if ( $bucket === self::SPECIAL_ALL ) {
			return $clauses;
		}

		global $wpdb;
		$relation_table = $wpdb->prefix . Migrator::RELATION_TABLE;

		if ( $bucket === self::SPECIAL_UNCATEGORIZED ) {
			$clauses['join']    .= " LEFT JOIN {$relation_table} fmf ON fmf.attachment_id = {$wpdb->posts}.ID ";
			$clauses['where']   .= ' AND fmf.attachment_id IS NULL ';
			$clauses['groupby'] = "{$wpdb->posts}.ID";
			return $clauses;
		}

		$clauses['join']    .= $wpdb->prepare(
			// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table name comes from $wpdb->prefix; the folder id is bound via the %d placeholder.
			" INNER JOIN {$relation_table} fmf ON fmf.attachment_id = {$wpdb->posts}.ID AND fmf.folder_id = %d ",
			$bucket
		);
		$clauses['groupby'] = "{$wpdb->posts}.ID";
		return $clauses;
	}
}
