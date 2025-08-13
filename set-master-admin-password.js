// set-master-admin-password.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

await supabase.auth.admin.updateUserById(
  '2291731a-6c86-4b1b-afe5-d70fac981481', // masteradmin UUID
  { password: 'Temp!Admin#2025' }         // pick a strong temp password
).then(({ data, error }) => {
  if (error) throw error;
  console.log('Password updated for', data.user?.email);
});
