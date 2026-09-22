import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
export async function POST(_: Request, { params }: { params: Promise<{id:string}> }) {
  const { id } = await params; const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser(); if (!user) return NextResponse.json({error:'Not authenticated'},{status:401});
  const { data: order } = await supabase.from('hamper_orders').select('fulfilment_method').eq('id',id).single();
  const nextStatus = order?.fulfilment_method === 'green_acres' ? 'delivered' : 'completed';
  const patch = nextStatus === 'completed' ? {status:nextStatus,completed_at:new Date().toISOString()} : {status:nextStatus,delivered_at:new Date().toISOString()};
  const { error } = await supabase.from('hamper_orders').update(patch).eq('id',id);
  if (error) return NextResponse.json({error:error.message},{status:400});
  await supabase.from('hamper_order_events').insert({order_id:id,event_type:nextStatus==='completed'?'completed':'delivered',created_by_user_id:user.id,event_data:{}});
  return NextResponse.json({ok:true});
}
