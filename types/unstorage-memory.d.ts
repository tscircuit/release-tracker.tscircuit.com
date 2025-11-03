declare module "unstorage/drivers/memory" {
  import type { Driver } from "unstorage";

  const createDriver: () => Driver;
  export default createDriver;
}
