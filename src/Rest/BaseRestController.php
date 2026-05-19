<?php

declare(strict_types=1);

namespace Flexa\MediaFolders\Rest;

use Flexa\MediaFolders\Support\Capabilities;
use WP_Error;
use WP_REST_Request;

defined( 'ABSPATH' ) || exit;

/**
 * Base class for REST controllers. Provides permission callbacks shared by
 * every endpoint so individual controllers never forget the gate.
 */
abstract class BaseRestController {
	public const NAMESPACE = FLEXA_MF_REST_NAMESPACE;

	abstract public function register_routes(): void;

	public function manage_permission( WP_REST_Request $request ): bool|WP_Error {
		unset( $request );
		if ( ! Capabilities::can_manage_folders() ) {
			return new WP_Error(
				'flexa_mf_forbidden',
				__( 'You do not have permission to manage folders.', 'flexa-media-folders' ),
				[ 'status' => rest_authorization_required_code() ]
			);
		}
		return true;
	}

	public function settings_permission( WP_REST_Request $request ): bool|WP_Error {
		unset( $request );
		if ( ! Capabilities::can_manage_settings() ) {
			return new WP_Error(
				'flexa_mf_forbidden',
				__( 'You do not have permission to update settings.', 'flexa-media-folders' ),
				[ 'status' => rest_authorization_required_code() ]
			);
		}
		return true;
	}
}
