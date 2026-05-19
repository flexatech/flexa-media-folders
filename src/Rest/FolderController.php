<?php

declare(strict_types=1);

namespace Flexa\MediaFolders\Rest;

use Flexa\MediaFolders\Domain\Attachment\AttachmentFolderRepository;
use Flexa\MediaFolders\Domain\Folder\FolderRepository;
use Flexa\MediaFolders\Domain\Folder\FolderTreeBuilder;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;

defined( 'ABSPATH' ) || exit;

final class FolderController extends BaseRestController {
	public function __construct(
		private readonly FolderRepository $folders = new FolderRepository(),
		private readonly AttachmentFolderRepository $attachments = new AttachmentFolderRepository(),
		private readonly FolderTreeBuilder $tree = new FolderTreeBuilder(),
	) {}

	public function register_routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/folders',
			[
				[
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => [ $this, 'list_tree' ],
					'permission_callback' => [ $this, 'manage_permission' ],
					'args'                => [
						'with_counts' => [
							'type'    => 'boolean',
							'default' => true,
						],
						'type'        => [
							'type'              => 'string',
							'default'           => FolderRepository::DEFAULT_TYPE,
							'sanitize_callback' => 'sanitize_key',
						],
					],
				],
				[
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => [ $this, 'create' ],
					'permission_callback' => [ $this, 'manage_permission' ],
					'args'                => [
						'name'   => [
							'type'              => 'string',
							'required'          => true,
							'sanitize_callback' => [ $this, 'sanitize_name' ],
							'validate_callback' => [ $this, 'validate_name' ],
						],
						'parent' => [
							'type'              => 'integer',
							'default'           => 0,
							'sanitize_callback' => 'absint',
						],
						'color'  => [
							'type'              => [ 'string', 'null' ],
							'default'           => null,
							'sanitize_callback' => [ $this, 'sanitize_color' ],
						],
					],
				],
			]
		);

		register_rest_route(
			self::NAMESPACE,
			'/folders/(?P<id>\d+)',
			[
				[
					'methods'             => WP_REST_Server::EDITABLE,
					'callback'            => [ $this, 'update' ],
					'permission_callback' => [ $this, 'manage_permission' ],
					'args'                => [
						'id'     => [
							'type'              => 'integer',
							'required'          => true,
							'sanitize_callback' => 'absint',
						],
						'name'   => [
							'type'              => 'string',
							'sanitize_callback' => [ $this, 'sanitize_name' ],
							'validate_callback' => [ $this, 'validate_name_optional' ],
						],
						'parent' => [
							'type'              => 'integer',
							'sanitize_callback' => 'absint',
						],
						'ord'    => [
							'type'              => 'integer',
							'sanitize_callback' => 'absint',
						],
						'color'  => [
							'type'              => [ 'string', 'null' ],
							'sanitize_callback' => [ $this, 'sanitize_color' ],
						],
					],
				],
				[
					'methods'             => WP_REST_Server::DELETABLE,
					'callback'            => [ $this, 'delete' ],
					'permission_callback' => [ $this, 'manage_permission' ],
					'args'                => [
						'id'           => [
							'type'              => 'integer',
							'required'          => true,
							'sanitize_callback' => 'absint',
						],
						'reparent_to'  => [
							'type'              => [ 'integer', 'null' ],
							'sanitize_callback' => static function ( $value ) {
								if ( $value === null || $value === '' ) {
									return null;
								}
								return (int) $value;
							},
						],
					],
				],
			]
		);

		register_rest_route(
			self::NAMESPACE,
			'/folders/bulk',
			[
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => [ $this, 'bulk_create' ],
				'permission_callback' => [ $this, 'manage_permission' ],
				'args'                => [
					'parent' => [
						'type'              => 'integer',
						'default'           => 0,
						'sanitize_callback' => 'absint',
					],
					'items'  => [
						'type'     => 'array',
						'required' => true,
					],
				],
			]
		);

		register_rest_route(
			self::NAMESPACE,
			'/folders/reorder',
			[
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => [ $this, 'reorder' ],
				'permission_callback' => [ $this, 'manage_permission' ],
				'args'                => [
					'parent' => [
						'type'              => 'integer',
						'default'           => 0,
						'sanitize_callback' => 'absint',
					],
					'ids'    => [
						'type'     => 'array',
						'required' => true,
						'items'    => [ 'type' => 'integer' ],
					],
				],
			]
		);

		register_rest_route(
			self::NAMESPACE,
			'/folders/(?P<id>\d+)/attachments',
			[
				[
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => [ $this, 'assign_attachments' ],
					'permission_callback' => [ $this, 'manage_permission' ],
					'args'                => [
						'id'             => [
							'type'              => 'integer',
							'required'          => true,
							'sanitize_callback' => 'absint',
						],
						'attachment_ids' => [
							'type'     => 'array',
							'required' => true,
							'items'    => [ 'type' => 'integer' ],
						],
					],
				],
				[
					'methods'             => WP_REST_Server::DELETABLE,
					'callback'            => [ $this, 'detach_attachments' ],
					'permission_callback' => [ $this, 'manage_permission' ],
					'args'                => [
						'id'             => [
							'type'              => 'integer',
							'required'          => true,
							'sanitize_callback' => 'absint',
						],
						'attachment_ids' => [
							'type'     => 'array',
							'required' => true,
							'items'    => [ 'type' => 'integer' ],
						],
					],
				],
			]
		);
	}

	public function list_tree( WP_REST_Request $request ): WP_REST_Response {
		$type        = (string) $request->get_param( 'type' );
		$with_counts = (bool) $request->get_param( 'with_counts' );

		$folders = $this->folders->all( $type, $with_counts );

		$payload = [
			'tree'      => $this->tree->build( $folders ),
			'flat'      => array_map( static fn( $f ) => $f->to_array(), $folders ),
			'specials'  => [
				'all'           => $with_counts ? $this->folders->total_attachments() : null,
				'uncategorized' => $with_counts ? $this->folders->uncategorized_count() : null,
			],
		];
		return new WP_REST_Response( $payload, 200 );
	}

	public function create( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$parent = (int) $request->get_param( 'parent' );
		if ( $parent > 0 && ! $this->folders->exists( $parent ) ) {
			return new WP_Error(
				'flexa_mf_invalid_parent',
				__( 'Parent folder does not exist.', 'flexa-media-folders' ),
				[ 'status' => 400 ]
			);
		}

		$id = $this->folders->create(
			[
				'name'   => (string) $request->get_param( 'name' ),
				'parent' => $parent,
				'color'  => $request->get_param( 'color' ),
			]
		);
		$folder = $this->folders->find( $id );
		if ( ! $folder ) {
			return new WP_Error(
				'flexa_mf_create_failed',
				__( 'Folder could not be created.', 'flexa-media-folders' ),
				[ 'status' => 500 ]
			);
		}
		return new WP_REST_Response( $folder->to_array(), 201 );
	}

	public function update( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$id = (int) $request->get_param( 'id' );
		if ( ! $this->folders->exists( $id ) ) {
			return new WP_Error( 'flexa_mf_not_found', __( 'Folder not found.', 'flexa-media-folders' ), [ 'status' => 404 ] );
		}

		$changes = [];
		foreach ( [ 'name', 'parent', 'ord', 'color' ] as $field ) {
			if ( null !== $request->get_param( $field ) || $request->has_param( $field ) ) {
				$value = $request->get_param( $field );
				if ( $value !== null || $field === 'color' ) {
					$changes[ $field ] = $value;
				}
			}
		}

		if ( isset( $changes['parent'] ) ) {
			$new_parent = (int) $changes['parent'];
			if ( $new_parent === $id ) {
				return new WP_Error( 'flexa_mf_invalid_parent', __( 'A folder cannot be its own parent.', 'flexa-media-folders' ), [ 'status' => 400 ] );
			}
			if ( $new_parent > 0 ) {
				if ( ! $this->folders->exists( $new_parent ) ) {
					return new WP_Error( 'flexa_mf_invalid_parent', __( 'Parent folder does not exist.', 'flexa-media-folders' ), [ 'status' => 400 ] );
				}
				if ( in_array( $new_parent, $this->folders->descendant_ids( $id ), true ) ) {
					return new WP_Error(
						'flexa_mf_invalid_parent',
						__( 'A folder cannot be moved into its own descendant.', 'flexa-media-folders' ),
						[ 'status' => 400 ]
					);
				}
			}
		}

		$this->folders->update( $id, $changes );
		$folder = $this->folders->find( $id );
		return new WP_REST_Response( $folder?->to_array(), 200 );
	}

	public function delete( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$id = (int) $request->get_param( 'id' );
		if ( ! $this->folders->exists( $id ) ) {
			return new WP_Error( 'flexa_mf_not_found', __( 'Folder not found.', 'flexa-media-folders' ), [ 'status' => 404 ] );
		}
		$reparent_to = $request->get_param( 'reparent_to' );
		$reparent_to = $reparent_to === null ? null : (int) $reparent_to;

		$removed = $this->folders->delete( $id, $reparent_to );
		return new WP_REST_Response( [ 'removed' => $removed ], 200 );
	}

	/**
	 * Create many folders in one request from a nested tree payload. Each item
	 * is `{ name: string, children?: Item[] }`; we walk it depth-first, create
	 * the row, then recurse with the new id as the parent. Names that fail
	 * validation are skipped (so a single bad line doesn't abort the batch),
	 * and the response lists every folder actually created so the client can
	 * count and toast accurately.
	 *
	 * Atomicity: not transactional - partial creation is possible if the DB
	 * trips mid-batch. Acceptable for a bootstrap helper; the user can re-run
	 * with the same input and the dedupe pass on the client side will mark
	 * existing names so they're not re-created (left as a future polish).
	 */
	public function bulk_create( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$parent = (int) $request->get_param( 'parent' );
		if ( $parent > 0 && ! $this->folders->exists( $parent ) ) {
			return new WP_Error(
				'flexa_mf_invalid_parent',
				__( 'Parent folder does not exist.', 'flexa-media-folders' ),
				[ 'status' => 400 ]
			);
		}
		$items   = (array) $request->get_param( 'items' );
		$created = [];
		$this->bulk_create_walk( $items, $parent, $created );
		return new WP_REST_Response(
			[
				'created' => $created,
				'count'   => count( $created ),
			],
			201
		);
	}

	/**
	 * @param array<int, mixed> $items
	 * @param array<int, array<string, mixed>> $created
	 */
	private function bulk_create_walk( array $items, int $parent, array &$created ): void {
		foreach ( $items as $item ) {
			if ( ! is_array( $item ) ) {
				continue;
			}
			$name = isset( $item['name'] ) ? trim( sanitize_text_field( (string) $item['name'] ) ) : '';
			if ( $name === '' || mb_strlen( $name ) > 190 ) {
				continue;
			}
			$id     = $this->folders->create(
				[
					'name'   => $name,
					'parent' => $parent,
				]
			);
			$folder = $this->folders->find( $id );
			if ( $folder ) {
				$created[] = $folder->to_array();
			}
			if ( isset( $item['children'] ) && is_array( $item['children'] ) && $item['children'] !== [] ) {
				$this->bulk_create_walk( $item['children'], $id, $created );
			}
		}
	}

	public function reorder( WP_REST_Request $request ): WP_REST_Response {
		$parent = (int) $request->get_param( 'parent' );
		$ids    = array_map( 'intval', (array) $request->get_param( 'ids' ) );

		$this->folders->reorder_siblings( $parent, $ids );
		return new WP_REST_Response( [ 'ok' => true ], 200 );
	}

	public function assign_attachments( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$id = (int) $request->get_param( 'id' );
		// id === 0 means "uncategorize" - drop the relation row(s) entirely.
		// AttachmentFolderRepository::set_folder() handles folder_id <= 0 by
		// deleting all relations and returning the touched count.
		if ( $id > 0 && ! $this->folders->exists( $id ) ) {
			return new WP_Error( 'flexa_mf_not_found', __( 'Folder not found.', 'flexa-media-folders' ), [ 'status' => 404 ] );
		}
		$attachment_ids = array_map( 'intval', (array) $request->get_param( 'attachment_ids' ) );
		$count          = $this->attachments->set_folder( $attachment_ids, $id );
		return new WP_REST_Response( [ 'moved' => $count ], 200 );
	}

	public function detach_attachments( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$id             = (int) $request->get_param( 'id' );
		$attachment_ids = array_map( 'intval', (array) $request->get_param( 'attachment_ids' ) );
		$count          = $this->attachments->detach( $attachment_ids, $id );
		return new WP_REST_Response( [ 'detached' => $count ], 200 );
	}

	public function sanitize_name( mixed $value ): string {
		return trim( sanitize_text_field( (string) $value ) );
	}

	public function validate_name( mixed $value ): bool|WP_Error {
		$value = trim( (string) $value );
		if ( $value === '' ) {
			return new WP_Error(
				'flexa_mf_invalid_name',
				__( 'Folder name cannot be empty.', 'flexa-media-folders' )
			);
		}
		if ( mb_strlen( $value ) > 190 ) {
			return new WP_Error(
				'flexa_mf_invalid_name',
				__( 'Folder name is too long.', 'flexa-media-folders' )
			);
		}
		return true;
	}

	public function validate_name_optional( mixed $value ): bool|WP_Error {
		if ( $value === null || $value === '' ) {
			return true;
		}
		return $this->validate_name( $value );
	}

	public function sanitize_color( mixed $value ): ?string {
		if ( $value === null || $value === '' ) {
			return null;
		}
		$value = (string) $value;
		if ( preg_match( '/^#([0-9a-f]{3}|[0-9a-f]{6})$/i', $value ) === 1 ) {
			return strtolower( $value );
		}
		return null;
	}
}
