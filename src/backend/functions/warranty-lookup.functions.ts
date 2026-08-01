import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { PublicWarranty } from "@/backend/services/warranty.server";

export type { PublicWarranty };

export const lookupWarranty = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ term: z.string().trim().min(1).max(64) }).parse(input))
  .handler(async ({ data }): Promise<PublicWarranty[]> => {
    const { findWarranties } = await import("@/backend/services/warranty.server");
    return findWarranties(data.term);
  });
