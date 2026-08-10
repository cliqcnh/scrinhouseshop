-- Insert default delivery settings
insert into public.store_settings (key, value)
values (
  'delivery_config',
  '{"phones_accra": 35.00, "phones_outside": 70.00, "consoles_accra": 50.00, "consoles_outside": 100.00, "others_accra": 25.00, "others_outside": 50.00}'::jsonb
)
on conflict (key) do nothing;
