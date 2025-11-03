declare module "nitropack" {
  export function useStorage(name?: string): {
    getItem<T = unknown>(key: string): Promise<T | null>;
    setItem<T = unknown>(key: string, value: T): Promise<void>;
  };
}
