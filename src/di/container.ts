/**
 * Simple Dependency Injection Container
 * Provides a lightweight DI pattern for better testability and dependency management
 */

type Factory<T> = () => T;
type ServiceDefinition<T = unknown> = {
	factory: Factory<T>;
	singleton?: boolean;
};

class DIContainer {
	private services = new Map<string, ServiceDefinition>();
	private instances = new Map<string, unknown>();

	/**
	 * Register a service in the container
	 * @param name - Service identifier
	 * @param factory - Factory function to create the service
	 * @param singleton - Whether to create a singleton instance (default: true)
	 */
	register<T>(name: string, factory: Factory<T>, singleton = true): void {
		this.services.set(name, { factory, singleton });
	}

	/**
	 * Resolve a service from the container
	 * @param name - Service identifier
	 * @returns Service instance
	 */
	resolve<T>(name: string): T {
		const definition = this.services.get(name);

		if (!definition) {
			throw new Error(`Service "${name}" not found in container`);
		}

		// Return singleton instance if exists
		if (definition.singleton) {
			const existing = this.instances.get(name);
			if (existing !== undefined) {
				return existing as T;
			}

			// Create and cache singleton
			const instance = definition.factory() as T;
			this.instances.set(name, instance);
			return instance;
		}

		// Create new instance for non-singleton
		return definition.factory() as T;
	}

	/**
	 * Check if a service is registered
	 */
	has(name: string): boolean {
		return this.services.has(name);
	}

	/**
	 * Clear all services and instances (useful for testing)
	 */
	clear(): void {
		this.services.clear();
		this.instances.clear();
	}

	/**
	 * Remove a specific service
	 */
	remove(name: string): void {
		this.services.delete(name);
		this.instances.delete(name);
	}

	/**
	 * Get all registered service names
	 */
	getServiceNames(): string[] {
		return Array.from(this.services.keys());
	}
}

// Create a default container instance
export const container = new DIContainer();

// Export the container class for custom instances
export { DIContainer };

// Type helper for service registration
export type ServiceRegistry<T> = {
	[K in keyof T]: Factory<T[K]>;
};

/**
 * Create a typed service registry
 * This allows for type-safe service registration and resolution
 */
export function createServiceRegistry<T extends Record<string, unknown>>(
	services: ServiceRegistry<T>
): {
	resolve: <K extends keyof T>(name: K) => T[K];
	register: <K extends keyof T>(
		name: K,
		factory: Factory<T[K]>,
		singleton?: boolean
	) => void;
	has: (name: keyof T) => boolean;
} {
	const localContainer = new DIContainer();

	// Register all services
	for (const [name, factory] of Object.entries(services)) {
		localContainer.register(name, factory as Factory<unknown>, true);
	}

	return {
		resolve: <K extends keyof T>(name: K) =>
			localContainer.resolve<T[K]>(String(name)),
		register: <K extends keyof T>(
			name: K,
			factory: Factory<T[K]>,
			singleton = true
		) => {
			localContainer.register(String(name), factory, singleton);
		},
		has: (name: keyof T) => localContainer.has(String(name)),
	};
}
