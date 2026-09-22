import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(_: Request, { params }: { params: Promise<{id:string}> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({error:'Not authenticated'},{status:401});

  const { data: order } = await supabase
    .from('hamper_orders')
    .select('status,fulfilment_method')
    .eq('id',id)
    .single();
  if (!order) return NextResponse.json({error:'Order not found'},{status:404});
  if (order.status !== 'ready' && order.status !== 'delivered') {
    return NextResponse.json({error:'Only Ready or Delivered orders can be marked Done.'},{status:400});
  }

  const now = new Date().toISOString();
  const patch: Record<string,string> = { status:'completed', completed_at:now };
  if (order.fulfilment_method === 'green_acres') patch.delivered_at = now;

  const { error } = await supabase.from('hamper_orders').update(patch).eq('id',id);
  if (error) return NextResponse.json({error:error.message},{status:400});

  await supabase.from('hamper_order_events').insert({
    order_id:id,
    event_type:'completed',
    created_by_user_id:user.id,
    event_data:{source:'manual_ready_button'}
  });
  return NextResponse.json({ok:true});
}
