<?php

declare(strict_types=1);

namespace Flexa\MediaFolders\Rest;

use Flexa\MediaFolders\Support\Resetter;
use WP_Error;
use WP_REST_Request;
use WP_REST_Response;
use WP_REST_Server;

defined( 'ABSPATH' ) || exit;

final class SettingsController extends BaseRestController {
	public const OPTION_KEY = 'flexa_mf_settings';

	private const DEFAULTS = [
		'default_folder'      => 'last',
		'folder_sort'         => 'manual',
		'show_counts'         => true,
		// Empty list = every public post type uses Flexa Media Folders.
		// Slugs listed here opt out of the folder sidebar.
		'excluded_post_types' => [],
	];

	public function register_routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/settings',
			[
				[
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => [ $this, 'get' ],
					'permission_callback' => [ $this, 'manage_permission' ],
				],
				[
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => [ $this, 'update' ],
					'permission_callback' => [ $this, 'settings_permission' ],
					'args'                => [
						'default_folder' => [
							'type'              => 'string',
							'sanitize_callback' => 'sanitize_text_field',
						],
						'folder_sort'    => [
							'type'              => 'string',
							'sanitize_callback' => 'sanitize_key',
						],
						'show_counts'    => [
							'type' => 'boolean',
						],
						'excluded_post_types' => [
							'type'  => 'array',
							'items' => [ 'type' => 'string' ],
						],
					],
				],
			]
		);

		register_rest_route(
			self::NAMESPACE,
			'/reset',
			[
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => [ $this, 'reset' ],
				'permission_callback' => [ $this, 'settings_permission' ],
				'args'                => [
					'confirm' => [
						'type'              => 'string',
						'required'          => true,
						'sanitize_callback' => 'sanitize_text_field',
					],
				],
			]
		);
	}

	public function reset( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$confirm = strtolower( trim( (string) $request->get_param( 'confirm' ) ) );
		if ( $confirm !== 'delete all folders' ) {
			return new WP_Error(
				'flexa_mf_reset_unconfirmed',
				__( 'Type "delete all folders" to confirm.', 'flexa-media-folders' ),
				[ 'status' => 400 ]
			);
		}
		$result = Resetter::reset_all();
		return new WP_REST_Response(
			[
				'ok'        => true,
				'folders'   => $result['folders'],
				'relations' => $result['relations'],
			],
			200
		);
	}

	public function get(): WP_REST_Response {
		$payload = $this->load();
		// Read-only sidecar so the React form can render the post-type
		// checklist without a second round-trip. Not persisted.
		$payload['available_post_types'] = $this->available_post_types();
		return new WP_REST_Response( $payload, 200 );
	}

	public function update( WP_REST_Request $request ): WP_REST_Response {
		$settings = $this->load();
		foreach ( array_keys( self::DEFAULTS ) as $key ) {
			$value = $request->get_param( $key );
			if ( $value === null ) {
				continue;
			}
			if ( $key === 'show_counts' ) {
				$settings[ $key ] = (bool) $value;
				continue;
			}
			if ( $key === 'folder_sort' && ! in_array( $value, [ 'manual', 'asc', 'desc' ], true ) ) {
				continue;
			}
			if ( $key === 'excluded_post_types' ) {
				$allowed         = array_keys( $this->available_post_types_map() );
				$incoming        = is_array( $value ) ? $value : [];
				$settings[ $key ] = array_values(
					array_intersect(
						array_map( 'sanitize_key', array_map( 'strval', $incoming ) ),
						$allowed
					)
				);
				continue;
			}
			$settings[ $key ] = (string) $value;
		}
		update_option( self::OPTION_KEY, $settings, false );
		$response                         = $settings;
		$response['available_post_types'] = $this->available_post_types();
		return new WP_REST_Response( $response, 200 );
	}

	/**
	 * @return array<string,mixed>
	 */
	private function load(): array {
		$stored = get_option( self::OPTION_KEY, [] );
		if ( ! is_array( $stored ) ) {
			$stored = [];
		}
		return array_merge( self::DEFAULTS, $stored );
	}

	/**
	 * @return list<array{name: string, label: string}>
	 */
	private function available_post_types(): array {
		$out = [];
		foreach ( $this->available_post_types_map() as $name => $object ) {
			$out[] = [
				'name'  => $name,
				'label' => (string) ( $object->labels->singular_name ?? $object->label ?? $name ),
			];
		}
		return $out;
	}

	/**
	 * Public post types excluding 'attachment' (the media library itself).
	 *
	 * @return array<string, \WP_Post_Type>
	 */
	private function available_post_types_map(): array {
		$types = get_post_types( [ 'public' => true ], 'objects' );
		unset( $types['attachment'] );
		return $types;
	}
}
