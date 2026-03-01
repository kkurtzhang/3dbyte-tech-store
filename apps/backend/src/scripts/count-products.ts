import { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

export default async function ({ container }: ExecArgs) {
  const productModule = container.resolve(Modules.PRODUCT);
  const products = await productModule.listProducts({}, { select: ['id'] });
  console.log('Total products in Medusa:', products.length);
  return { count: products.length };
}
