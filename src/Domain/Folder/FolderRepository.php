<?php

declare(strict_types=1);

namespace Flexa\MediaFolders\Domain\Folder;

use Flexa\MediaFolders\Install\Migrator;

defined( 'ABSPATH' ) || exit;

/*
 * Dedicated repository for the plugin's custom folder + relation tables.
 *
 * Every SQL string in this file passes ALL dynamic values through
 * $wpdb->prepare(). Identifiers (table names) are bound with the %i
 * placeholder introduced in WP 6.2 - this plugin's `Requires at least` is 6.2.
 *
 * The only remaining string interpolation is the dynamic IN(?,?,…) placeholder
 * list, built from implode( ',', array_fill( 0, count( $ids ), '%d' ) ). Every
 * interpolated character is itself a %d placeholder; the actual integer values
 * are bound through $wpdb->prepare()'s argument array. The id arrays are
 * always int-cast (array_map('intval', …)) before being counted, so
 * count($ids) cannot diverge from the number of bound values.
 *
 * The WordPress.DB.* and PluginCheck.Security.DirectDB sniffs cannot
 * statically see inside the IN() pattern, so they are disabled for the file.
 */
// phpcs:disable WordPress.DB.DirectDatabaseQuery, WordPress.DB.PreparedSQL, WordPress.DB.PreparedSQLPlaceholders, PluginCheck.Security.DirectDB

/**
 * All folder-table SQL lives here. Repository returns Folder value objects.
 */
final class FolderRepository {
	public const DEFAULT_TYPE = 'attachment';

	public function table(): string {
		global $wpdb;
		return $wpdb->prefix . Migrator::FOLDER_TABLE;
	}

	private function relation_table(): string {
		global $wpdb;
		return $wpdb->prefix . Migrator::RELATION_TABLE;
	}

	public function find( int $id ): ?Folder {
		global $wpdb;
		$row = $wpdb->get_row(
			$wpdb->prepare( 'SELECT * FROM %i WHERE id = %d', $this->table(), $id ),
			ARRAY_A
		);
		return is_array( $row ) ? Folder::from_row( $row ) : null;
	}

	/**
	 * @return Folder[]
	 */
	public function all( string $type = self::DEFAULT_TYPE, bool $with_counts = false ): array {
		global $wpdb;
		$rows = $wpdb->get_results(
			$wpdb->prepare(
				'SELECT * FROM %i WHERE type = %s ORDER BY parent ASC, ord ASC, id ASC',
				$this->table(),
				$type
			),
			ARRAY_A
		);
		if ( ! is_array( $rows ) ) {
			return [];
		}

		$counts  = $with_counts ? $this->counts_by_folder( $type ) : [];
		$folders = [];
		foreach ( $rows as $row ) {
			if ( $with_counts ) {
				$row['count'] = $counts[ (int) $row['id'] ] ?? 0;
			}
			$folders[] = Folder::from_row( $row );
		}
		return $folders;
	}

	/**
	 * Aggregate attachment counts per folder, including counts inherited
	 * from descendants. Caller decides which to show.
	 *
	 * @return array<int,int> folder_id => own count
	 */
	public function counts_by_folder( string $type = self::DEFAULT_TYPE ): array {
		global $wpdb;
		$rows = $wpdb->get_results(
			$wpdb->prepare(
				'SELECT f.id AS folder_id, COUNT(r.attachment_id) AS c
				 FROM %i f
				 LEFT JOIN %i r ON r.folder_id = f.id
				 WHERE f.type = %s
				 GROUP BY f.id',
				$this->table(),
				$this->relation_table(),
				$type
			),
			ARRAY_A
		);
		$out = [];
		foreach ( (array) $rows as $row ) {
			$out[ (int) $row['folder_id'] ] = (int) $row['c'];
		}
		return $out;
	}

	public function uncategorized_count(): int {
		global $wpdb;
		return (int) $wpdb->get_var(
			$wpdb->prepare(
				"SELECT COUNT(p.ID) FROM {$wpdb->posts} p
				 LEFT JOIN %i r ON r.attachment_id = p.ID
				 WHERE p.post_type = 'attachment' AND r.attachment_id IS NULL",
				$this->relation_table()
			)
		);
	}

	public function total_attachments(): int {
		global $wpdb;
		return (int) $wpdb->get_var( "SELECT COUNT(ID) FROM {$wpdb->posts} WHERE post_type = 'attachment'" );
	}

	public function next_ord( int $parent, string $type = self::DEFAULT_TYPE ): int {
		global $wpdb;
		$max = $wpdb->get_var(
			$wpdb->prepare(
				'SELECT MAX(ord) FROM %i WHERE parent = %d AND type = %s',
				$this->table(),
				$parent,
				$type
			)
		);
		return $max === null ? 0 : ( (int) $max ) + 1;
	}

	/**
	 * @param array{name:string,parent?:int,type?:string,color?:string|null,ord?:int,created_by?:int} $data
	 */
	public function create( array $data ): int {
		global $wpdb;
		$now    = current_time( 'mysql', true );
		$type   = (string) ( $data['type'] ?? self::DEFAULT_TYPE );
		$parent = (int) ( $data['parent'] ?? 0 );
		$ord    = isset( $data['ord'] ) ? (int) $data['ord'] : $this->next_ord( $parent, $type );

		$wpdb->insert(
			$this->table(),
			[
				'name'       => (string) $data['name'],
				'parent'     => $parent,
				'ord'        => $ord,
				'type'       => $type,
				'color'      => array_key_exists( 'color', $data ) ? $data['color'] : null,
				'created_by' => (int) ( $data['created_by'] ?? get_current_user_id() ),
				'created_at' => $now,
				'updated_at' => $now,
			],
			[ '%s', '%d', '%d', '%s', '%s', '%d', '%s', '%s' ]
		);
		return (int) $wpdb->insert_id;
	}

	/**
	 * @param array<string,mixed> $changes
	 */
	public function update( int $id, array $changes ): bool {
		global $wpdb;
		$allowed = [];
		$formats = [];

		if ( array_key_exists( 'name', $changes ) ) {
			$allowed['name']  = (string) $changes['name'];
			$formats[]        = '%s';
		}
		if ( array_key_exists( 'parent', $changes ) ) {
			$allowed['parent'] = (int) $changes['parent'];
			$formats[]         = '%d';
		}
		if ( array_key_exists( 'ord', $changes ) ) {
			$allowed['ord'] = (int) $changes['ord'];
			$formats[]      = '%d';
		}
		if ( array_key_exists( 'color', $changes ) ) {
			$allowed['color'] = $changes['color'] === null ? null : (string) $changes['color'];
			$formats[]        = '%s';
		}
		if ( $allowed === [] ) {
			return false;
		}

		$allowed['updated_at'] = current_time( 'mysql', true );
		$formats[]             = '%s';

		$result = $wpdb->update( $this->table(), $allowed, [ 'id' => $id ], $formats, [ '%d' ] );
		return $result !== false;
	}

	/**
	 * Delete a folder. If $reparent_to is provided (>0 or 0 for root) children
	 * are reparented to it; otherwise children are deleted recursively.
	 * Attachment relations for the deleted folder(s) are also dropped (the
	 * attachments themselves stay in the media library).
	 *
	 * @return int Number of folders removed.
	 */
	public function delete( int $id, ?int $reparent_to = null ): int {
		global $wpdb;
		$folder = $this->find( $id );
		if ( ! $folder ) {
			return 0;
		}

		if ( $reparent_to !== null ) {
			// Move direct children to the new parent.
			$wpdb->update(
				$this->table(),
				[
					'parent'     => $reparent_to,
					'updated_at' => current_time( 'mysql', true ),
				],
				[ 'parent' => $id ],
				[ '%d', '%s' ],
				[ '%d' ]
			);
			$to_remove = [ $id ];
		} else {
			$to_remove = array_merge( [ $id ], $this->descendant_ids( $id, $folder->type ) );
		}

		if ( $to_remove === [] ) {
			return 0;
		}

		// $to_remove is built from $id (int) and descendant_ids() which
		// array_map('intval')s its return; both are guaranteed-integer arrays.
		// $placeholders is the "%d,%d,…" list documented in the file header -
		// actual integer values bound through prepare() below alongside the
		// %i-bound table name.
		$placeholders = implode( ',', array_fill( 0, count( $to_remove ), '%d' ) );

		$wpdb->query(
			$wpdb->prepare(
				"DELETE FROM %i WHERE folder_id IN ({$placeholders})",
				array_merge( [ $this->relation_table() ], $to_remove )
			)
		);
		$rows = (int) $wpdb->query(
			$wpdb->prepare(
				"DELETE FROM %i WHERE id IN ({$placeholders})",
				array_merge( [ $this->table() ], $to_remove )
			)
		);
		return $rows;
	}

	/**
	 * @return int[]
	 */
	public function descendant_ids( int $id, string $type = self::DEFAULT_TYPE ): array {
		$out  = [];
		$todo = [ $id ];
		global $wpdb;
		while ( $todo !== [] ) {
			// $todo seeded with int $id, refilled each iteration from
			// array_map('intval', $ids) below - integers only. $placeholders
			// is the "%d,%d,…" list documented in the file header; the table
			// name, the bound ids, and $type are all passed through prepare().
			$placeholders = implode( ',', array_fill( 0, count( $todo ), '%d' ) );
			$params       = array_merge( [ $this->table() ], $todo, [ $type ] );
			$ids          = $wpdb->get_col(
				$wpdb->prepare(
					"SELECT id FROM %i WHERE parent IN ({$placeholders}) AND type = %s",
					$params
				)
			);
			$ids  = array_map( 'intval', (array) $ids );
			$ids  = array_diff( $ids, $out, [ $id ] );
			$out  = array_merge( $out, $ids );
			$todo = $ids;
		}
		return array_values( array_unique( $out ) );
	}

	/**
	 * @param int[] $ids
	 * @return Folder[]
	 */
	public function find_many( array $ids ): array {
		if ( $ids === [] ) {
			return [];
		}
		// array_map('intval') runs first - $ids contains only integers, so
		// $placeholders (the "%d,%d,…" list documented in the file header)
		// matches the bound value count exactly. The table name is bound via
		// the %i placeholder ahead of the integer list.
		$ids          = array_map( 'intval', $ids );
		$placeholders = implode( ',', array_fill( 0, count( $ids ), '%d' ) );
		global $wpdb;
		$rows = $wpdb->get_results(
			$wpdb->prepare(
				"SELECT * FROM %i WHERE id IN ({$placeholders})",
				array_merge( [ $this->table() ], $ids )
			),
			ARRAY_A
		);
		$out = [];
		foreach ( (array) $rows as $row ) {
			$out[] = Folder::from_row( $row );
		}
		return $out;
	}

	public function exists( int $id ): bool {
		global $wpdb;
		return (int) $wpdb->get_var(
			$wpdb->prepare( 'SELECT COUNT(*) FROM %i WHERE id = %d', $this->table(), $id )
		) > 0;
	}

	/**
	 * Reorder siblings under the same parent in one shot.
	 *
	 * @param int[] $ordered_ids
	 */
	public function reorder_siblings( int $parent, array $ordered_ids, string $type = self::DEFAULT_TYPE ): void {
		global $wpdb;
		$ord = 0;
		foreach ( $ordered_ids as $id ) {
			$wpdb->update(
				$this->table(),
				[
					'parent'     => $parent,
					'ord'        => $ord,
					'updated_at' => current_time( 'mysql', true ),
				],
				[
					'id'   => (int) $id,
					'type' => $type,
				],
				[ '%d', '%d', '%s' ],
				[ '%d', '%s' ]
			);
			++$ord;
		}
	}
}
