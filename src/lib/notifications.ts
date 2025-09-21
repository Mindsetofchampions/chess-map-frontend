import { supabase } from './supabase';

/**
 * Insert a system-wide notification into `system_notifications`.
 * Table schema assumed: id, title, body, created_by, target_role (nullable), created_at
 */
export async function createSystemNotification(payload: {
  title: string;
  body: string;
  created_by?: string;
  target_role?: string | null;
}) {
  try {
    const { data, error } = await supabase.from('system_notifications').insert([{ ...payload }]);
    if (error) throw error;
    return data;
  } catch (err: any) {
    throw err;
  }
}

export default { createSystemNotification };
