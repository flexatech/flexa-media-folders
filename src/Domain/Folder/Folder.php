<?php

declare(strict_types=1);

namespace Flexa\MediaFolders\Domain\Folder;

defined( 'ABSPATH' ) || exit;

/**
 * Folder value object. Mirrors a single row from the flexa_mf_folder table,
 * with an optional transient `count` populated by the repository when asked.
 */
final class Folder {
	public function __construct(
		public readonly int $id,
		public readonly string $name,
		public readonly int $parent,
		public readonly int $ord,
		public readonly string $type,
		public readonly ?string $color,
		public readonly int $created_by,
		public readonly string $created_at,
		public readonly string $updated_at,
		public int $count = 0,
	) {}

	/**
	 * @param array<string,mixed> $row
	 */
	public static function from_row( array $row ): self {
		return new self(
			id:         (int) ( $row['id'] ?? 0 ),
			name:       (string) ( $row['name'] ?? '' ),
			parent:     (int) ( $row['parent'] ?? 0 ),
			ord:        (int) ( $row['ord'] ?? 0 ),
			type:       (string) ( $row['type'] ?? 'attachment' ),
			color:      isset( $row['color'] ) && $row['color'] !== '' ? (string) $row['color'] : null,
			created_by: (int) ( $row['created_by'] ?? 0 ),
			created_at: (string) ( $row['created_at'] ?? '' ),
			updated_at: (string) ( $row['updated_at'] ?? '' ),
			count:      (int) ( $row['count'] ?? 0 ),
		);
	}

	/**
	 * @return array<string,mixed>
	 */
	public function to_array(): array {
		return [
			'id'        => $this->id,
			'name'      => $this->name,
			'parent'    => $this->parent,
			'ord'       => $this->ord,
			'type'      => $this->type,
			'color'     => $this->color,
			'createdBy' => $this->created_by,
			'createdAt' => $this->created_at,
			'updatedAt' => $this->updated_at,
			'count'     => $this->count,
		];
	}
}
