import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { WebOrderView } from "@/backend/services/web-orders.server";

export type { WebOrderView };

const createSchema = z.object({
  customer_name: z.string().trim().min(3).max(100),
  customer_document: z.string().trim().min(6).max(20),
  customer_phone: z.string().trim().min(6).max(20),
  customer_address: z.string().trim().max(200).optional().nullable(),
  notes: z.string().trim().max(400).optional().nullable(),
  items: z
    .array(z.object({ product_id: z.string().uuid(), quantity: z.number().int().min(1).max(20) }))
    .min(1)
    .max(30),
});

const trackSchema = z.object({
  track_code: z.string().trim().min(4).max(16),
  document: z.string().trim().min(6).max(20),
});

export const placeWebOrder = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => createSchema.parse(i))
  .handler(async ({ data }): Promise<WebOrderView> => {
    const { createWebOrder } = await import("@/backend/services/web-orders.server");
    return createWebOrder(data);
  });

export const lookupWebOrder = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => trackSchema.parse(i))
  .handler(async ({ data }): Promise<WebOrderView | null> => {
    const { trackWebOrder } = await import("@/backend/services/web-orders.server");
    return trackWebOrder(data.track_code, data.document);
  });
