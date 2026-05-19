<?php
/**
 * Mount node for the React admin app. Enqueue.php enqueues the bundled assets.
 *
 * @var string $page_title Localized title (optional).
 */

declare(strict_types=1);

defined( 'ABSPATH' ) || exit;
?>
<div class="flexa-mf-wrap flexa-mf-settings-wrap">
	<h1 class="screen-reader-text"><?php echo esc_html__( 'Flexa Media Folders', 'flexa-media-folders' ); ?></h1>
	<div id="flexa-mf-admin-root" data-flexa-mf-context="settings"></div>
</div>
