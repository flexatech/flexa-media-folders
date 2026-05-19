<?php

declare(strict_types=1);

namespace Flexa\MediaFolders\Rest;

use Flexa\MediaFolders\Support\SingletonTrait;

defined( 'ABSPATH' ) || exit;

/**
 * Registers every REST controller in one place. Pro adds its own controllers
 * by hooking the `flexa_mf/rest/register_routes` action.
 */
final class RegisterFacade {
	use SingletonTrait;

	public function register(): void {
		add_action( 'rest_api_init', [ $this, 'register_routes' ] );
	}

	public function register_routes(): void {
		( new FolderController() )->register_routes();
		( new AttachmentController() )->register_routes();
		( new SettingsController() )->register_routes();

		do_action( 'flexa_mf/rest/register_routes' );
	}
}
