<?php

declare(strict_types=1);

namespace Flexa\MediaFolders\Cli;

use Flexa\MediaFolders\Domain\Attachment\AttachmentFolderRepository;
use Flexa\MediaFolders\Domain\Folder\FolderRepository;
use Flexa\MediaFolders\Support\Resetter;
use WP_CLI;

defined( 'ABSPATH' ) || exit;

/**
 * Manage Flexa Media Folders from WP-CLI.
 *
 *     wp flexa-mf folder list
 *     wp flexa-mf folder create "Photos" --parent=0 --color=#3b82f6
 *     wp flexa-mf folder rename 12 "Archive"
 *     wp flexa-mf folder move 12 --parent=4
 *     wp flexa-mf folder delete 12 [--reparent-to=0]
 *     wp flexa-mf folder assign 99,100,101 --folder=12
 *     wp flexa-mf reset --yes
 */
final class FolderCommand {
	public static function register(): void {
		if ( ! class_exists( WP_CLI::class ) ) {
			return;
		}
		WP_CLI::add_command( 'flexa-mf folder', self::class );
		WP_CLI::add_command(
			'flexa-mf reset',
			static function ( array $args, array $assoc ): void {
				WP_CLI::confirm( 'This will drop all Flexa Media Folders folders and relations. Continue?', $assoc );
				$result = Resetter::reset_all();
				WP_CLI::success(
					sprintf(
						'Removed %d folder(s) and %d attachment relation(s).',
						$result['folders'],
						$result['relations']
					)
				);
			}
		);
	}

	private function folders(): FolderRepository {
		return new FolderRepository();
	}

	private function attachments(): AttachmentFolderRepository {
		return new AttachmentFolderRepository();
	}

	/**
	 * List all folders.
	 *
	 * ## OPTIONS
	 *
	 * [--format=<format>]
	 * : Output format. Accepts table, json, csv, yaml. Default: table.
	 *
	 * @when after_wp_load
	 */
	public function list( array $args, array $assoc ): void {
		$format  = (string) ( $assoc['format'] ?? 'table' );
		$folders = $this->folders()->all( FolderRepository::DEFAULT_TYPE, true );

		$rows = array_map(
			static fn( $f ) => [
				'id'     => $f->id,
				'name'   => $f->name,
				'parent' => $f->parent,
				'ord'    => $f->ord,
				'count'  => $f->count,
				'color'  => $f->color ?? '',
			],
			$folders
		);

		\WP_CLI\Utils\format_items( $format, $rows, [ 'id', 'name', 'parent', 'ord', 'count', 'color' ] );
	}

	/**
	 * Create a folder.
	 *
	 * ## OPTIONS
	 *
	 * <name>
	 * : The folder name.
	 *
	 * [--parent=<id>]
	 * : Parent folder id. Default: 0 (root).
	 *
	 * [--color=<hex>]
	 * : Optional hex color (#rgb or #rrggbb).
	 *
	 * @when after_wp_load
	 */
	public function create( array $args, array $assoc ): void {
		$name = (string) ( $args[0] ?? '' );
		if ( trim( $name ) === '' ) {
			WP_CLI::error( 'Folder name is required.' );
		}
		$parent = (int) ( $assoc['parent'] ?? 0 );
		$color  = isset( $assoc['color'] ) ? (string) $assoc['color'] : null;

		if ( $parent > 0 && ! $this->folders()->exists( $parent ) ) {
			WP_CLI::error( sprintf( 'Parent folder #%d does not exist.', $parent ) );
		}

		$id = $this->folders()->create(
			[
				'name'   => $name,
				'parent' => $parent,
				'color'  => $color,
			]
		);
		WP_CLI::success( sprintf( 'Created folder #%d (%s).', $id, $name ) );
	}

	/**
	 * Rename a folder.
	 *
	 * ## OPTIONS
	 *
	 * <id>
	 * : Folder id.
	 *
	 * <name>
	 * : New folder name.
	 *
	 * @when after_wp_load
	 */
	public function rename( array $args, array $assoc ): void {
		unset( $assoc );
		$id   = (int) ( $args[0] ?? 0 );
		$name = (string) ( $args[1] ?? '' );
		if ( $id <= 0 || trim( $name ) === '' ) {
			WP_CLI::error( 'Usage: wp flexa-mf folder rename <id> <name>' );
		}
		if ( ! $this->folders()->exists( $id ) ) {
			WP_CLI::error( sprintf( 'Folder #%d not found.', $id ) );
		}
		$this->folders()->update( $id, [ 'name' => $name ] );
		WP_CLI::success( sprintf( 'Renamed folder #%d to %s.', $id, $name ) );
	}

	/**
	 * Move a folder to a different parent.
	 *
	 * ## OPTIONS
	 *
	 * <id>
	 * : Folder id.
	 *
	 * --parent=<parent>
	 * : New parent id (0 for root).
	 *
	 * @when after_wp_load
	 */
	public function move( array $args, array $assoc ): void {
		$id     = (int) ( $args[0] ?? 0 );
		$parent = (int) ( $assoc['parent'] ?? -1 );
		if ( $id <= 0 || $parent < 0 ) {
			WP_CLI::error( 'Usage: wp flexa-mf folder move <id> --parent=<parent>' );
		}
		$repo = $this->folders();
		if ( ! $repo->exists( $id ) ) {
			WP_CLI::error( sprintf( 'Folder #%d not found.', $id ) );
		}
		if ( $parent === $id ) {
			WP_CLI::error( 'A folder cannot be its own parent.' );
		}
		if ( $parent > 0 ) {
			if ( ! $repo->exists( $parent ) ) {
				WP_CLI::error( sprintf( 'Parent folder #%d not found.', $parent ) );
			}
			if ( in_array( $parent, $repo->descendant_ids( $id ), true ) ) {
				WP_CLI::error( 'A folder cannot be moved into its own descendant.' );
			}
		}
		$repo->update( $id, [ 'parent' => $parent ] );
		WP_CLI::success( sprintf( 'Moved folder #%d under parent #%d.', $id, $parent ) );
	}

	/**
	 * Delete a folder.
	 *
	 * ## OPTIONS
	 *
	 * <id>
	 * : Folder id.
	 *
	 * [--reparent-to=<parent>]
	 * : Move children to this parent instead of deleting them.
	 *
	 * @when after_wp_load
	 */
	public function delete( array $args, array $assoc ): void {
		$id = (int) ( $args[0] ?? 0 );
		if ( $id <= 0 ) {
			WP_CLI::error( 'Usage: wp flexa-mf folder delete <id> [--reparent-to=<parent>]' );
		}
		$reparent_to = array_key_exists( 'reparent-to', $assoc ) ? (int) $assoc['reparent-to'] : null;
		$removed     = $this->folders()->delete( $id, $reparent_to );
		WP_CLI::success( sprintf( 'Removed %d folder(s).', $removed ) );
	}

	/**
	 * Assign attachments to a folder.
	 *
	 * ## OPTIONS
	 *
	 * <ids>
	 * : Comma-separated list of attachment ids.
	 *
	 * --folder=<id>
	 * : Folder id (0 = Uncategorized).
	 *
	 * @when after_wp_load
	 */
	public function assign( array $args, array $assoc ): void {
		$raw    = (string) ( $args[0] ?? '' );
		$folder = (int) ( $assoc['folder'] ?? -1 );
		if ( $raw === '' || $folder < 0 ) {
			WP_CLI::error( 'Usage: wp flexa-mf folder assign <id,id,...> --folder=<id>' );
		}
		if ( $folder > 0 && ! $this->folders()->exists( $folder ) ) {
			WP_CLI::error( sprintf( 'Folder #%d not found.', $folder ) );
		}
		$ids   = array_filter( array_map( 'intval', array_map( 'trim', explode( ',', $raw ) ) ) );
		$moved = $this->attachments()->set_folder( $ids, $folder );
		WP_CLI::success( sprintf( 'Moved %d attachment(s).', $moved ) );
	}
}
