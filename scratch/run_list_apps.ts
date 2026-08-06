import { createClient } from "@supabase/supabase-js";

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  );

  const { data, error } = await supabase
    .from("installment_applications")
    .select(`
      id,
      order_id,
      user_id,
      base_price,
      total_price,
      deposit_amount,
      remaining_balance,
      ghana_card_number,
      ghana_card_front_url,
      ghana_card_back_url,
      status,
      notes,
      created_at,
      profiles (full_name, phone),
      products (name)
    `);

  console.log("RUNNING listInstallmentApplications QUERY MANUALLY:");
  if (error) {
    console.error("Query Error:", error);
  } else {
    console.log(JSON.stringify(data, null, 2));
  }
}

main().catch(console.error);
