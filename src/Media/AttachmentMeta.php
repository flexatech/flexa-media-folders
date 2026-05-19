<?php

declare(strict_types=1);

namespace Flexa\MediaFolders\Media;

use Flexa\MediaFolders\Domain\Attachment\AttachmentFolderRepository;
use Flexa\MediaFolders\Support\SingletonTrait;
use WP_Post;

defined( 'ABSPATH' ) || exit;

/**
 * Surfaces folder membership on the attachment JSON consumed by wp.media so
 * each Attachment model knows which folder(s) it belongs to without an
 * extra round-trip. The bridge reads it as `attachment.get( 'flexaMfFolders' )`.
 */
final class AttachmentMeta {
	use SingletonTrait;

	public function __construct(
		private readonly AttachmentFolderRepository $relations = new AttachmentFolderRepository(),
	) {}

	public function register(): void {
		add_filter( 'wp_prepare_attachment_for_js', [ $this, 'attach_folder_ids' ], 10, 2 );
	}

	/**
	 * @param array<string,mixed> $response
	 * @return array<string,mixed>
	 */
	public function attach_folder_ids( array $response, WP_Post $attachment ): array {
		$response['flexaMfFolders'] = $this->relations->folders_for( (int) $attachment->ID );
		return $response;
	}
}
