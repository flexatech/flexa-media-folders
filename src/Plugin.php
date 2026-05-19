<?php

declare(strict_types=1);

namespace Flexa\MediaFolders;

use Flexa\MediaFolders\Admin\AdminMenu;
use Flexa\MediaFolders\Admin\Enqueue;
use Flexa\MediaFolders\Cli\FolderCommand;
use Flexa\MediaFolders\Install\Migrator;
use Flexa\MediaFolders\Media\AttachmentMeta;
use Flexa\MediaFolders\Media\QueryFilter;
use Flexa\MediaFolders\Rest\RegisterFacade;
use Flexa\MediaFolders\Support\SingletonTrait;

defined( 'ABSPATH' ) || exit;

final class Plugin {
	use SingletonTrait;

	private bool $booted = false;

	public function boot(): void {
		if ( $this->booted ) {
			return;
		}
		$this->booted = true;

		// Translations load automatically: WordPress.org-hosted plugins have
		// had just-in-time textdomain loading since WP 4.6, so no explicit
		// load_plugin_textdomain() call is needed here.
		add_action( 'admin_init', [ Migrator::class, 'maybe_upgrade' ] );

		AdminMenu::instance()->register();
		Enqueue::instance()->register();
		RegisterFacade::instance()->register();
		QueryFilter::instance()->register();
		AttachmentMeta::instance()->register();

		if ( defined( 'WP_CLI' ) && WP_CLI ) {
			FolderCommand::register();
		}
	}
}
