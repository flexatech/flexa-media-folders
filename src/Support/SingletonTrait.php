<?php

declare(strict_types=1);

namespace Flexa\MediaFolders\Support;

defined( 'ABSPATH' ) || exit;

trait SingletonTrait {
	/**
	 * @var array<class-string, static>
	 */
	private static array $instances = [];

	public static function instance(): static {
		$class = static::class;
		if ( ! isset( self::$instances[ $class ] ) ) {
			self::$instances[ $class ] = new static();
		}
		return self::$instances[ $class ];
	}

	final public function __clone(): void {}

	public function __wakeup(): void {
		throw new \RuntimeException( 'Cannot unserialize a singleton.' );
	}
}
