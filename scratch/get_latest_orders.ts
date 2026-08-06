import { createClient } from "@supabase/supabase-js";

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  );

  const { data: orders } = await supabase
    .from("orders")
    .select("id, created_at, status, total, is_installment, installment_deposit, installment_balance, delivery_address")
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: apps } = await supabase
    .from("installment_applications")
    .select("id, order_id, user_id, product_id, base_price, total_price, deposit_amount, status, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  console.log("=== LATEST ORDERS ===");
  console.log(JSON.stringify(orders, null, 2));

  console.log("\n=== LATEST INSTALLMENT APPLICATIONS ===");
  console.log(JSON.stringify(apps, null, 2));
}

main().catch(console.error);
