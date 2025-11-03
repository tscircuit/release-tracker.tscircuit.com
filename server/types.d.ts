/// <reference types="@cloudflare/workers-types" />

// Cloudflare Workers types (available at runtime)
declare global {
	interface DurableObjectState {
		storage: DurableObjectStorage;
	}

	interface DurableObjectStorage {
		get<T = unknown>(key: string): Promise<T | undefined>;
		put<T = unknown>(key: string, value: T): Promise<void>;
		delete(key: string): Promise<boolean>;
	}

	interface DurableObjectNamespace {
		idFromName(name: string): DurableObjectId;
		get(id: DurableObjectId): DurableObjectStub;
	}

	interface DurableObjectId {
		toString(): string;
	}

	interface DurableObjectStub {
		fetch(
			request: Request | RequestInfo,
			init?: RequestInit,
		): Promise<Response>;
	}
}
