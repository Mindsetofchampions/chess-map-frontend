// set-master-admin-password.ts
import { createClient } from '@supabase/supabase-js';

const VITE_SUPABASE_URL="https://cpfcnauiuceialwdbzms.supabase.co"
const VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNwZmNuYXVpdWNlaWFsd2Riem1zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzY1Nzk0MCwiZXhwIjoyMDY5MjMzOTQwfQ.XXuOInGkGEx4W3vW5I92o5sVqdBbAuu7mKCDUHmtXvs"

const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY);

await supabase.auth.admin.updateUserById(
  '2291731a-6c86-4b1b-afe5-d70fac981481', // masteradmin UUID
  { password: 'Temp!Admin#2025' }         // pick a strong temp password
).then(({ data, error }) => {
  if (error) throw error;
  console.log('Password updated for', data.user?.email);
});
