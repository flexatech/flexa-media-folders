<?php

declare(strict_types=1);

namespace Flexa\MediaFolders\Rest;

use Flexa\MediaFolders\Domain\Attachment\AttachmentFolderRepository;
use Flexa\MediaFolders\Domain\Folder\FolderRepository;
use Flexa\MediaFolders\Install\Migrator;
use WP_Query;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;

defined( 'ABSPATH' ) || exit;

/**
 * Lists attachments scoped to a folder. Phase 3 will swap the in-memory
 * filter for a posts_join + posts_where so the standard media query can
 * also filter - but the REST endpoint is useful on its own for the
 * Pro Gallery block and external integrations.
 */
final class AttachmentController extends BaseRestController {
	public const SPECIAL_ALL           = -1;
	public const SPECIAL_UNCATEGORIZED = 0;

	public function __construct(
		private readonly FolderRepository $folders = new FolderRepository(),
		private readonly AttachmentFolderRepository $relations = new AttachmentFolderRepository(),
	) {}

	public function register_routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/attachments',
			[
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => [ $this, 'list' ],
				'permission_callback' => [ $this, 'manage_permission' ],
				'args'                => [
					'folder'   => [
						'type'              => 'integer',
						'default'           => self::SPECIAL_ALL,
						'sanitize_callback' => static fn( $v ): int => (int) $v,
					],
					'search'   => [
						'type'              => 'string',
						'default'           => '',
						'sanitize_callback' => 'sanitize_text_field',
					],
					'mime'     => [
						'type'              => 'string',
						'default'           => '',
						'sanitize_callback' => 'sanitize_text_field',
					],
					'per_page' => [
						'type'              => 'integer',
						'default'           => 80,
						'sanitize_callback' => 'absint',
					],
					'page'     => [
						'type'              => 'integer',
						'default'           => 1,
						'sanitize_callback' => 'absint',
					],
				],
			]
		);
	}

	public function list( WP_REST_Request $request ): WP_REST_Response {
		$folder   = (int) $request->get_param( 'folder' );
		$search   = (string) $request->get_param( 'search' );
		$mime     = (string) $request->get_param( 'mime' );
		$per_page = max( 1, min( 200, (int) $request->get_param( 'per_page' ) ) );
		$page     = max( 1, (int) $request->get_param( 'page' ) );

		$args = [
			'post_type'      => 'attachment',
			'post_status'    => 'inherit',
			'posts_per_page' => $per_page,
			'paged'          => $page,
			'orderby'        => 'date',
			'order'          => 'DESC',
		];
		if ( $search !== '' ) {
			$args['s'] = $search;
		}
		if ( $mime !== '' ) {
			$args['post_mime_type'] = $mime;
		}

		$bucket = $folder;
		add_filter( 'posts_clauses', $clauses = $this->build_clauses_filter( $bucket ), 10, 2 );
		$query = new WP_Query( $args );
		remove_filter( 'posts_clauses', $clauses, 10 );

		$items = [];
		foreach ( $query->posts as $post ) {
			$items[] = $this->map_attachment( $post );
		}

		return new WP_REST_Response(
			[
				'items'      => $items,
				'total'      => (int) $query->found_posts,
				'totalPages' => (int) $query->max_num_pages,
				'page'       => $page,
				'perPage'    => $per_page,
			],
			200
		);
	}

	/**
	 * @return callable
	 */
	private function build_clauses_filter( int $folder ) {
		$relation_table = $GLOBALS['wpdb']->prefix . Migrator::RELATION_TABLE;
		return static function ( array $clauses, WP_Query $query ) use ( $folder, $relation_table ): array {
			global $wpdb;
			if ( $query->get( 'post_type' ) !== 'attachment' ) {
				return $clauses;
			}
			if ( $folder === self::SPECIAL_ALL ) {
				return $clauses;
			}
			if ( $folder === self::SPECIAL_UNCATEGORIZED ) {
				$clauses['join']  .= " LEFT JOIN {$relation_table} fmf ON fmf.attachment_id = {$wpdb->posts}.ID ";
				$clauses['where'] .= ' AND fmf.attachment_id IS NULL ';
				$clauses['groupby'] = "{$wpdb->posts}.ID";
				return $clauses;
			}
			$clauses['join'] .= $wpdb->prepare(
				// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared -- Table name comes from $wpdb->prefix; the folder id is bound via the %d placeholder.
				" INNER JOIN {$relation_table} fmf ON fmf.attachment_id = {$wpdb->posts}.ID AND fmf.folder_id = %d ",
				$folder
			);
			$clauses['groupby'] = "{$wpdb->posts}.ID";
			return $clauses;
		};
	}

	/**
	 * @return array<string,mixed>
	 */
	private function map_attachment( \WP_Post $post ): array {
		$id  = (int) $post->ID;
		$url = (string) wp_get_attachment_url( $id );
		return [
			'id'        => $id,
			'title'     => get_the_title( $post ),
			'mime'      => (string) $post->post_mime_type,
			'url'       => $url,
			'thumbnail' => (string) wp_get_attachment_image_url( $id, 'thumbnail' ),
			'date'      => mysql_to_rfc3339( $post->post_date_gmt ?: $post->post_date ),
			'alt'       => (string) get_post_meta( $id, '_wp_attachment_image_alt', true ),
			'folders'   => $this->relations->folders_for( $id ),
		];
	}
}
