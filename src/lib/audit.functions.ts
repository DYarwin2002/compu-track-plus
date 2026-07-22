import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { getRequestHeader, getRequestIP } from "@tanstack/react-start/server";

/**
 * Record an auditable action performed by the current signed-in user.
 * Called from server code and from client event handlers via `useServerFn`.
 * IP is captured server-side; the client cannot spoof it.
 */
const auditSchema = z.object({
  action: z.string().min(1).max(120),
  entity: z.string().max(80).optional().nullable(),
  entity_id: z.string().max(120).optional().nullable(),
  meta: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const logAudit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => auditSchema.parse(data))
  .handler(async ({ data, context }) => {
    const ip =
      getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim() ||
      getRequestIP({ xForwardedFor: true }) ||
      null;
    const email = (context.claims?.email as string | undefined) ?? null;
    await context.supabase.from("audit_log").insert({
      user_id: context.userId,
      user_email: email,
      action: data.action,
      entity: data.entity ?? null,
      entity_id: data.entity_id ?? null,
      meta: (data.meta ?? null) as never,
      ip,
    });
    return { ok: true };
  });

/** Admin-only list of audit entries. RLS enforces the admin check. */
export const listAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        limit: z.number().int().min(1).max(500).optional(),
        search: z.string().max(120).optional(),
      })
      .parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("audit_log")
      .select("id, user_id, user_email, action, entity, entity_id, ip, created_at, meta")
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 200);
    if (data.search) {
      const s = data.search;
      q = q.or(
        `action.ilike.%${s}%,entity.ilike.%${s}%,user_email.ilike.%${s}%,ip.ilike.%${s}%`,
      );
    }
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });