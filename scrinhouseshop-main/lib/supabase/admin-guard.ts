import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface StaffUser {
  id: string;
  email: string | null;
  fullName: string | null;
  roleName: string;
  isStaff: boolean;
}

/**
 * Loads the current session's profile + role. Redirects to /admin/login if
 * there is no session or the account isn't staff. Call this at the top of
 * every admin server component / server action that touches admin data —
 * RLS also enforces this at the database level, but this gives a clean
 * redirect instead of a bare permission error.
 */
export async function requireStaffUser(): Promise<StaffUser> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select<string, { full_name: string | null; roles: { name: string; is_staff: boolean } | null }>(
      "full_name, roles ( name, is_staff )",
    )
    .eq("id", user.id)
    .single();

  const role = profile?.roles ?? null;

  if (!role?.is_staff) redirect("/admin/login");

  return {
    id: user.id,
    email: user.email ?? null,
    fullName: profile?.full_name ?? null,
    roleName: role.name,
    isStaff: role.is_staff,
  };
}
