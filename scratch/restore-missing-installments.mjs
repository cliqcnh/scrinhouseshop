import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE env vars.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const missingApps = [
  {
    order_id: "ad005ecd-e86a-4cd2-b74b-fc10ff468ce7",
    user_id: "67462f8b-0736-4085-b4c4-83d3e6b3a8fd",
    product_id: "a80becb0-cc4f-4be2-a44a-b003734c9035",
    variant_id: "b907e8df-30a7-41da-bfa0-4fa3724b7367",
    base_price: 8200,
    total_price: 9020,
    deposit_amount: 3608,
    remaining_balance: 5412,
    ghana_card_number: "GHA-000000000-0",
    ghana_card_front_url: "N/A",
    ghana_card_back_url: "N/A",
    status: "pending_review",
    installment_frequency: "monthly"
  },
  {
    order_id: "52280d83-adba-4567-8354-eabb001dc0c1",
    user_id: "67462f8b-0736-4085-b4c4-83d3e6b3a8fd",
    product_id: "106b953a-b883-4480-b07e-0ad95a51dad0",
    variant_id: "c036f790-70b1-4903-9697-bd3aaca9d10e",
    base_price: 15500,
    total_price: 17050,
    deposit_amount: 6820,
    remaining_balance: 10230,
    ghana_card_number: "GHA-000000000-0",
    ghana_card_front_url: "N/A",
    ghana_card_back_url: "N/A",
    status: "pending_review",
    installment_frequency: "monthly"
  }
];

console.log("Restoring missing installment applications...");
for (const app of missingApps) {
  // Check if it already exists to avoid duplication
  const { data: existing } = await supabase
    .from("installment_applications")
    .select("id")
    .eq("order_id", app.order_id)
    .maybeSingle();

  if (existing) {
    console.log(`Application for order ${app.order_id} already exists (ID: ${existing.id}). Skipping.`);
    continue;
  }

  const { data: inserted, error } = await supabase
    .from("installment_applications")
    .insert(app)
    .select();

  if (error) {
    console.error(`Failed to insert application for order ${app.order_id}:`, error);
  } else {
    console.log(`Successfully restored application for order ${app.order_id}:`, inserted[0].id);
  }
}
