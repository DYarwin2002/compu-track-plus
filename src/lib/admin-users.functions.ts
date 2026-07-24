import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Admin-only server functions for managing seller accounts.
 * Every function verifies the caller has the `admin` role BEFORE
 * loading the service-role client — never trust `supabaseAdmin` as
 * proof of authorization.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertAdmin(context: any) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (!data) throw new Error("Forbidden: admin role required");
}

export const listSellers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data: profiles, error } = await context.supabase
      .from("profiles")
      .select("id, email, full_name, active, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const { data: roles } = await context.supabase
      .from("user_roles")
      .select("user_id, role");
    const roleMap = new Map<string, string>();
    (roles ?? []).forEach((r) => roleMap.set(r.user_id, r.role));
    return (profiles ?? []).map((p) => ({ ...p, role: roleMap.get(p.id) ?? "vendedor" }));
  });

export const createSeller = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        email: z.string().trim().email().max(255),
        password: z.string().min(8).max(128),
        full_name: z.string().trim().min(2).max(120),
        role: z.string().trim().min(2).max(32).default("vendedor"),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Validate role exists
    const { data: role } = await supabaseAdmin
      .from("roles").select("key").eq("key", data.role).maybeSingle();
    if (!role) throw new Error("El rol seleccionado no existe.");

    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (error || !created.user) throw new Error(error?.message ?? "No se pudo crear el usuario");

    // Trigger handle_new_user assigned a default role; force the picked role.
    await supabaseAdmin.from("user_roles").delete().eq("user_id", created.user.id);
    await supabaseAdmin.from("user_roles").insert({ user_id: created.user.id, role: data.role });

    await context.supabase.from("audit_log").insert({
      user_id: context.userId,
      user_email: (context.claims?.email as string | undefined) ?? null,
      action: "user.create",
      entity: "user",
      entity_id: created.user.id,
      meta: { email: data.email, role: data.role } as never,
    });

    return { id: created.user.id };
  });

export const updateSellerRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ user_id: z.string().uuid(), role: z.string().trim().min(2).max(32) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.user_id === context.userId && data.role !== "admin") {
      throw new Error("No puedes quitarte a ti mismo el rol de administrador.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: role } = await supabaseAdmin
      .from("roles").select("key").eq("key", data.role).maybeSingle();
    if (!role) throw new Error("El rol seleccionado no existe.");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.user_id);
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.user_id, role: data.role });
    if (error) throw new Error(error.message);
    await context.supabase.from("audit_log").insert({
      user_id: context.userId,
      user_email: (context.claims?.email as string | undefined) ?? null,
      action: "user.role_change",
      entity: "user",
      entity_id: data.user_id,
      meta: { role: data.role } as never,
    });
    return { ok: true };
  });

export const setSellerActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ user_id: z.string().uuid(), active: z.boolean() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.user_id === context.userId && !data.active) {
      throw new Error("No puedes desactivar tu propia cuenta.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Ban in auth so the token is rejected on next refresh.
    await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      ban_duration: data.active ? "none" : "876000h", // ~100 years
    });
    // Reflect in profile so the UI can show it and the app can gate.
    await supabaseAdmin.from("profiles").update({ active: data.active }).eq("id", data.user_id);
    await context.supabase.from("audit_log").insert({
      user_id: context.userId,
      user_email: (context.claims?.email as string | undefined) ?? null,
      action: data.active ? "user.activate" : "user.deactivate",
      entity: "user",
      entity_id: data.user_id,
    });
    return { ok: true };
  });

export const resetSellerPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ user_id: z.string().uuid(), password: z.string().min(8).max(128) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.user_id, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    await context.supabase.from("audit_log").insert({
      user_id: context.userId,
      user_email: (context.claims?.email as string | undefined) ?? null,
      action: "user.password_reset",
      entity: "user",
      entity_id: data.user_id,
    });
    return { ok: true };
  });