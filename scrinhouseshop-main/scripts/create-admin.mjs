// One-off script to provision the first staff (super_admin) account.
// Usage: node --env-file=.env.local scripts/create-admin.mjs <email> <password>
import { createClient } from "@supabase/supabase-js";

const [, , email, password] = process.argv;

if (!email || !password) {
  console.error("Usage: node --env-file=.env.local scripts/create-admin.mjs <email> <password>");
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the environment.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: created, error: createError } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: "Admin" },
});

if (createError) {
  console.error(`Failed to create user: ${createError.message}`);
  process.exit(1);
}

const { data: role, error: roleError } = await supabase
  .from("roles")
  .select("id")
  .eq("name", "super_admin")
  .single();

if (roleError || !role) {
  console.error(`Failed to look up the super_admin role: ${roleError?.message}`);
  process.exit(1);
}

const { error: updateError } = await supabase
  .from("profiles")
  .update({ role_id: role.id, full_name: "Admin" })
  .eq("id", created.user.id);

if (updateError) {
  console.error(`Failed to grant super_admin role: ${updateError.message}`);
  process.exit(1);
}

console.log(`Created super_admin account: ${email}`);
console.log("Sign in at /admin/login");
