import { Shell } from '@/components/shell';
import { requireHamperUser } from '@/lib/auth';
import { OrderForm } from './order-form';

export default async function Page(){
  const { supabase, user }=await requireHamperUser();
  const [{data:hampers},{data:staff}]=await Promise.all([
    supabase.from('hamper_types').select('id,code,name').eq('active',true).order('sort_order'),
    supabase.from('hamper_app_users').select('user_id,display_name').eq('active',true).order('display_name')
  ]);
  return <Shell><div className="eyebrow">Order entry</div><h1>New Hamper Order</h1><div className="card"><OrderForm hampers={hampers??[]} staff={staff??[]} currentUserId={user.id}/></div></Shell>
}
