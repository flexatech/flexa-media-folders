<?php

declare(strict_types=1);

namespace Flexa\MediaFolders\Install;

defined( 'ABSPATH' ) || exit;

final class Deactivator {
	public static function deactivate(): void {
		// Reserved for cron clean-up in later phases.
	}
}
