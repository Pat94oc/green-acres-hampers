import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(_: Request, { params }: { params: Promise<{id:string}> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({error:'Not authenticated'},{status:401});
  const { data: order } = await supabase.from('hamper_orders').select('status').eq('id',id).single();
  if (!order) return NextResponse.json({error:'Order not found'},{status:404});
  if (order.status !== 'scheduled') return NextResponse.json({ok:true});
  const { error } = await supabase.from('hamper_orders').update({status:'in_progress',updated_at:new Date().toISOString()}).eq('id',id);
  if (error) return NextResponse.json({error:error.message},{status:400});
  await supabase.from('hamper_order_events').insert({order_id:id,event_type:'production_started',created_by_user_id:user.id,event_data:{}});
  return NextResponse.json({ok:true});
}
