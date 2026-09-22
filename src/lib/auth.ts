import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export async function requireHamperUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: member } = await supabase
    .from('hamper_app_users')
    .select('display_name, role, active')
    .eq('user_id', user.id)
    .single();

  if (!member?.active) redirect('/login?error=not-authorised');
  return { supabase, user, member };
}
