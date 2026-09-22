import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const body = await request.json();
  const quantity = Number(body.quantity);
  if (!body.orderId || !body.orderItemId || !Number.isInteger(quantity) || quantity === 0) {
    return NextResponse.json({ error: 'Invalid production entry' }, { status: 400 });
  }
  const { data: item } = await supabase.from('hamper_order_items').select('hamper_type_id').eq('id', body.orderItemId).single();
  const { error } = await supabase.from('hamper_production_log').insert({
    order_id: body.orderId,
    order_item_id: body.orderItemId,
    hamper_type_id: item?.hamper_type_id ?? null,
    quantity_delta: quantity,
    note: body.note || null,
    created_by_user_id: user.id,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
