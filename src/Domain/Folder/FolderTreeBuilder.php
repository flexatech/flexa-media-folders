<?php

declare(strict_types=1);

namespace Flexa\MediaFolders\Domain\Folder;

defined( 'ABSPATH' ) || exit;

/**
 * Turns a flat list of Folder rows into a nested tree of arrays.
 * Tree shape: same as Folder::to_array() plus a `children` array.
 */
final class FolderTreeBuilder {
	/**
	 * @param Folder[] $folders
	 * @return array<int,array<string,mixed>>
	 */
	public function build( array $folders ): array {
		$by_parent = [];
		foreach ( $folders as $folder ) {
			$by_parent[ $folder->parent ][] = $folder;
		}
		return $this->children_of( 0, $by_parent );
	}

	/**
	 * @param array<int,Folder[]> $by_parent
	 * @return array<int,array<string,mixed>>
	 */
	private function children_of( int $parent, array $by_parent ): array {
		if ( empty( $by_parent[ $parent ] ) ) {
			return [];
		}
		$nodes = [];
		foreach ( $by_parent[ $parent ] as $folder ) {
			$node             = $folder->to_array();
			$node['children'] = $this->children_of( $folder->id, $by_parent );
			$nodes[]          = $node;
		}
		return $nodes;
	}
}
