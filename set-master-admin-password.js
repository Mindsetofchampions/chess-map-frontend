// set-master-admin-password.ts
import { createClient } from '@supabase/supabase-js';

const VITE_SUPABASE_URL="https://cpfcnauiuceialwdbzms.supabase.co"
const VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwZmNuYXVpdWNlaWFsd2Riem1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2NTc5NDAsImV4cCI6MjA2OTIzMzk0MH0.NnE8X9Din3b-ZQMSDvap_r9FJdhn2q7sgQAhc93-vwQ"

const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY);

await supabase.auth.admin.updateUserById(
  '2291731a-6c86-4b1b-afe5-d70fac981481', // masteradmin UUID
  { password: 'Temp!Admin#2025' }         // pick a strong temp password
).then(({ data, error }) => {
  if (error) throw error;
  console.log('Password updated for', data.user?.email);
});
