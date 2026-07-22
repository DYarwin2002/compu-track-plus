import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Role = "admin" | "vendedor" | null;

interface AuthCtx {
  session: Session | null;
  user: User | null;
  role: Role;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  session: null,
  user: null,
  role: null,
  loading: true,
  isAdmin: false,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);

  const loadContextFor = async (userId: string) => {
    const [{ data: roleRow }, { data: profile }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
      supabase.from("profiles").select("active").eq("id", userId).maybeSingle(),
    ]);
    if (profile && profile.active === false) {
      toast.error("Tu cuenta ha sido desactivada. Contacta al administrador.");
      await supabase.auth.signOut();
      setRole(null);
      return;
    }
    setRole((roleRow?.role as Role) ?? "vendedor");
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) {
        setTimeout(() => { loadContextFor(s.user.id); }, 0);
      } else {
        setRole(null);
      }
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setLoading(false);
      if (s?.user) loadContextFor(s.user.id);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
  };

  return (
    <Ctx.Provider value={{ session, user: session?.user ?? null, role, loading, isAdmin: role === "admin", signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);