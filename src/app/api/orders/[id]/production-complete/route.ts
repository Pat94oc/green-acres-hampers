import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(_: Request, { params }: { params: Promise<{id:string}> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({error:'Not authenticated'},{status:401});
  const { data: items, error: itemError } = await supabase.from('hamper_order_item_progress').select('order_item_id,hamper_type_id,quantity_remaining').eq('order_id',id);
  if (itemError) return NextResponse.json({error:itemError.message},{status:400});
  for (const item of items ?? []) {
    const remaining = Number(item.quantity_remaining ?? 0);
    if (remaining <= 0) continue;
    const { error } = await supabase.from('hamper_production_log').insert({
      order_id:id,
      order_item_id:item.order_item_id,
      hamper_type_id:item.hamper_type_id ?? null,
      quantity_delta:remaining,
      note:'Production completed using Complete Production action',
      created_by_user_id:user.id,
    });
    if (error) return NextResponse.json({error:error.message},{status:400});
  }
  await supabase.from('hamper_order_events').insert({order_id:id,event_type:'production_completed',created_by_user_id:user.id,event_data:{}});
  return NextResponse.json({ok:true});
}
