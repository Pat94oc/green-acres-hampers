import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
export async function POST(_: Request, { params }: { params: Promise<{id:string}> }) {
  const { id } = await params; const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser(); if (!user) return NextResponse.json({error:'Not authenticated'},{status:401});
  const { data: progress } = await supabase.from('hamper_order_progress').select('quantity_remaining').eq('order_id',id).single();
  if (!progress || progress.quantity_remaining > 0) return NextResponse.json({error:'Production is not complete'},{status:400});
  const { error } = await supabase.from('hamper_orders').update({status:'ready',ready_at:new Date().toISOString()}).eq('id',id);
  if (error) return NextResponse.json({error:error.message},{status:400});
  await supabase.from('hamper_order_events').insert({order_id:id,event_type:'marked_ready',created_by_user_id:user.id,event_data:{}});
  return NextResponse.json({ok:true});
}
