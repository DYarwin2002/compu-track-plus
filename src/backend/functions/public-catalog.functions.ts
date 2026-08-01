import { createServerFn } from "@tanstack/react-start";
import type { PublicProduct } from "@/backend/services/catalog.server";

export type { PublicProduct };

export const getPublicCatalog = createServerFn({ method: "GET" }).handler(async (): Promise<PublicProduct[]> => {
  const { fetchPublicCatalog } = await import("@/backend/services/catalog.server");
  return fetchPublicCatalog();
});
