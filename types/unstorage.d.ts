declare module "unstorage/drivers/fs" {
  import type { Driver } from "unstorage";

  export interface FSDriverOptions {
    base?: string;
  }

  export default function fsDriver(options?: FSDriverOptions): Driver;
}

declare module "unstorage/drivers/memory" {
  import type { Driver } from "unstorage";

  export default function memoryDriver(): Driver;
}
