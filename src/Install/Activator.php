<?php

declare(strict_types=1);

namespace Flexa\MediaFolders\Install;

defined( 'ABSPATH' ) || exit;

final class Activator {
	public static function activate(): void {
		Migrator::migrate();

		if ( get_option( 'flexa_mf_settings', null ) === null ) {
			add_option(
				'flexa_mf_settings',
				[
					'default_folder'   => 'last',
					'folder_sort'      => 'manual',
					'show_counts'      => true,
				]
			);
		}
	}
}
