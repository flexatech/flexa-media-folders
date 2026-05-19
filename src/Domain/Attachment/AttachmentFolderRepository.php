<?php

declare(strict_types=1);

namespace Flexa\MediaFolders\Domain\Attachment;

use Flexa\MediaFolders\Install\Migrator;

defined( 'ABSPATH' ) || exit;

/*
 * Dedicated repository for the plugin's custom attachment <-> folder relation
 * table.
 *
 * Every SQL string in this file either uses no interpolation, or interpolates
 * one of exactly THREE trusted constructs - nothing else. Neither construct is
 * reachable from user input. The three constructs:
 *
 *   1. A table name from $wpdb->prefix (table(), $wpdb->posts).
 *      Identifiers cannot be bound through $wpdb->prepare() before WP 6.2's
 *      %i placeholder, and this plugin supports WP 5.8+.
 *
 *   2. A dynamic IN(?,?,…) placeholder list built from
 *      implode( ',', array_fill( 0, count( $ids ), '%d' ) ). Every
 *      interpolated character is itself a %d placeholder; the actual integer
 *      values are bound through $wpdb->prepare()'s second argument.
 *
 *   3. A dynamic VALUES(?,?,0),(?,?,0),… list built by pushing the literal
 *      string "(%d, %d, 0)" once per row and binding the values through
 *      prepare()'s second argument (set_folder() bulk insert). Same safety
 *      story as #2 - every interpolated character is itself a placeholder.
 *
 * All id arrays are pushed through filter_attachments() which array_map-int-
 * casts and array_filters them; count($ids) cannot diverge from the bound
 * value count. The WordPress.DB.* and PluginCheck.Security.DirectDB sniffs
 * cannot statically see inside any of these patterns, so they are disabled
 * for the file.
 */
// phpcs:disable WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL, WordPress.DB.PreparedSQLPlaceholders, PluginCheck.Security.DirectDB

/**
 * SQL for the attachment ↔ folder relation table.
 */
final class AttachmentFolderRepository {
	public function table(): string {
		global $wpdb;
		return $wpdb->prefix . Migrator::RELATION_TABLE;
	}

	/**
	 * @return int[] attachment ids that exist in $wp_posts as attachments
	 */
	private function filter_attachments( array $attachment_ids ): array {
		$attachment_ids = array_values( array_unique( array_map( 'intval', $attachment_ids ) ) );
		$attachment_ids = array_filter( $attachment_ids, static fn( int $id ): bool => $id > 0 );
		if ( $attachment_ids === [] ) {
			return [];
		}
		global $wpdb;
		// $attachment_ids was int-cast + filtered above; $placeholders is the
		// "%d,%d,…" list from safe construct #2 in the file header.
		$placeholders = implode( ',', array_fill( 0, count( $attachment_ids ), '%d' ) );
		$rows         = $wpdb->get_col(
			$wpdb->prepare(
				"SELECT ID FROM {$wpdb->posts} WHERE post_type = 'attachment' AND ID IN ({$placeholders})",
				$attachment_ids
			)
		);
		return array_map( 'intval', (array) $rows );
	}

	/**
	 * Move attachments to a single folder, replacing any existing
	 * folder membership. Set $folder_id to 0 to mark as Uncategorized
	 * (removes all relations).
	 *
	 * @param int[] $attachment_ids
	 * @return int number of attachments touched
	 */
	public function set_folder( array $attachment_ids, int $folder_id ): int {
		$attachment_ids = $this->filter_attachments( $attachment_ids );
		if ( $attachment_ids === [] ) {
			return 0;
		}

		global $wpdb;
		// $attachment_ids was int-cast + filtered above; $placeholders is the
		// "%d,%d,…" list from safe construct #2 in the file header.
		$placeholders = implode( ',', array_fill( 0, count( $attachment_ids ), '%d' ) );

		$wpdb->query(
			$wpdb->prepare(
				"DELETE FROM {$this->table()} WHERE attachment_id IN ({$placeholders})",
				$attachment_ids
			)
		);

		if ( $folder_id <= 0 ) {
			return count( $attachment_ids );
		}

		// Build a "(?,?,0),(?,?,0),…" VALUES tail - safe construct #3 from
		// the file header. The literal "(%d, %d, 0)" is appended once per
		// id, and the integer attachment_id + folder_id are bound through
		// prepare()'s second arg.
		$values = [];
		$args   = [];
		foreach ( $attachment_ids as $attachment_id ) {
			$values[] = '(%d, %d, 0)';
			$args[]   = $attachment_id;
			$args[]   = $folder_id;
		}
		$wpdb->query(
			$wpdb->prepare(
				"INSERT INTO {$this->table()} (attachment_id, folder_id, ord) VALUES " . implode( ',', $values ),
				$args
			)
		);
		return count( $attachment_ids );
	}

	/**
	 * Detach attachments from a folder without moving them anywhere.
	 *
	 * @param int[] $attachment_ids
	 */
	public function detach( array $attachment_ids, int $folder_id ): int {
		$attachment_ids = $this->filter_attachments( $attachment_ids );
		if ( $attachment_ids === [] ) {
			return 0;
		}
		global $wpdb;
		// $attachment_ids was int-cast + filtered above; $placeholders is the
		// "%d,%d,…" list from safe construct #2 in the file header. $folder_id
		// (int) is prepended to $args so the literal "%d" before IN(…) is also
		// bound through prepare.
		$placeholders = implode( ',', array_fill( 0, count( $attachment_ids ), '%d' ) );
		$args         = array_merge( [ $folder_id ], $attachment_ids );
		return (int) $wpdb->query(
			$wpdb->prepare(
				"DELETE FROM {$this->table()} WHERE folder_id = %d AND attachment_id IN ({$placeholders})",
				$args
			)
		);
	}

	/**
	 * @return int[] folder ids the attachment belongs to
	 */
	public function folders_for( int $attachment_id ): array {
		global $wpdb;
		$rows = $wpdb->get_col(
			$wpdb->prepare( "SELECT folder_id FROM {$this->table()} WHERE attachment_id = %d", $attachment_id )
		);
		return array_map( 'intval', (array) $rows );
	}

	public function clear_attachment( int $attachment_id ): void {
		global $wpdb;
		$wpdb->query(
			$wpdb->prepare( "DELETE FROM {$this->table()} WHERE attachment_id = %d", $attachment_id )
		);
	}
}
