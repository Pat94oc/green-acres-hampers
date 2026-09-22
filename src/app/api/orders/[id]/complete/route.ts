import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(_: Request, { params }: { params: Promise<{id:string}> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({error:'Not authenticated'},{status:401});

  const { data: order } = await supabase
    .from('hamper_orders')
    .select('fulfilment_method,status,hamper_pods(id)')
    .eq('id',id)
    .single();

  if (!order) return NextResponse.json({error:'Order not found'},{status:404});
  if (order.fulfilment_method === 'green_acres' && !(order.hamper_pods?.length)) {
    return NextResponse.json({error:'Upload the signed POD before completing a Green Acres delivery.'},{status:400});
  }

  const { error } = await supabase
    .from('hamper_orders')
    .update({status:'completed',completed_at:new Date().toISOString()})
    .eq('id',id);
  if (error) return NextResponse.json({error:error.message},{status:400});

  await supabase.from('hamper_order_events').insert({
    order_id:id,
    event_type:'completed',
    created_by_user_id:user.id,
    event_data:{}
  });
  return NextResponse.json({ok:true});
}
