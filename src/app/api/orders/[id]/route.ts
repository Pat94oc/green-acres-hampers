import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export async function PUT(request: Request, { params }: { params: Promise<{id:string}> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();
  const customerName = clean(body.customerName);
  if (!customerName) return NextResponse.json({ error: 'Customer / company name is required.' }, { status: 400 });
  if (!body.deliveryDate || !body.productionDueDate) {
    return NextResponse.json({ error: 'Delivery date and Ready By date are required.' }, { status: 400 });
  }

  const { data: existingOrder, error: existingError } = await supabase
    .from('hamper_orders')
    .select('id,status')
    .eq('id', id)
    .single();
  if (existingError || !existingOrder) return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
  if (['completed','cancelled'].includes(existingOrder.status)) {
    return NextResponse.json({ error: 'Completed or deleted orders cannot be edited.' }, { status: 400 });
  }

  const { count: productionCount, error: productionCountError } = await supabase
    .from('hamper_production_log')
    .select('id', { count: 'exact', head: true })
    .eq('order_id', id);
  if (productionCountError) return NextResponse.json({ error: productionCountError.message }, { status: 400 });
  const hasProduction = (productionCount ?? 0) > 0;

  let customerId: string | null = null;
  const { data: existingCustomer } = await supabase
    .from('hamper_customers')
    .select('id')
    .ilike('name', customerName)
    .limit(1)
    .maybeSingle();
  if (existingCustomer?.id) {
    customerId = existingCustomer.id;
  } else {
    const { data: newCustomer, error: customerError } = await supabase
      .from('hamper_customers')
      .insert({ name: customerName })
      .select('id')
      .single();
    if (customerError) return NextResponse.json({ error: customerError.message }, { status: 400 });
    customerId = newCustomer.id;
  }

  const orderPatch = {
    customer_id: customerId,
    customer_order_reference: clean(body.customerReference) || null,
    contact_name: clean(body.contactName) || null,
    contact_phone: clean(body.phone) || null,
    contact_email: clean(body.email) || null,
    fulfilment_method: body.fulfilmentMethod,
    delivery_date: body.deliveryDate,
    production_due_date: body.productionDueDate,
    delivery_address_1: clean(body.address1) || null,
    delivery_address_2: clean(body.address2) || null,
    delivery_town: clean(body.town) || null,
    delivery_county: clean(body.county) || null,
    delivery_eircode: clean(body.eircode) || null,
    delivery_notes: clean(body.notes) || null,
    priority: Boolean(body.priority),
    taken_by_user_id: body.takenByUserId || user.id,
    updated_at: new Date().toISOString(),
  };

  const { error: orderError } = await supabase.from('hamper_orders').update(orderPatch).eq('id', id);
  if (orderError) return NextResponse.json({ error: orderError.message }, { status: 400 });

  if (!hasProduction) {
    const items = Array.isArray(body.items) ? body.items : [];
    if (!items.length) return NextResponse.json({ error: 'At least one hamper line is required.' }, { status: 400 });

    const hamperIds = items.map((item: any) => item.hamper_type_id).filter(Boolean);
    const { data: hamperTypes, error: hamperTypeError } = await supabase
      .from('hamper_types')
      .select('id,code,name,standard_price')
      .in('id', hamperIds);
    if (hamperTypeError) return NextResponse.json({ error: hamperTypeError.message }, { status: 400 });
    const hamperMap = new Map((hamperTypes ?? []).map((h: any) => [h.id, h]));

    const rows = items.map((item: any) => {
      const hamper = hamperMap.get(item.hamper_type_id) as any;
      const qty = Number(item.quantity);
      if (!hamper || !Number.isFinite(qty) || qty <= 0) throw new Error('Every hamper line needs a valid hamper and quantity.');
      return {
        order_id: id,
        hamper_type_id: hamper.id,
        hamper_code_snapshot: hamper.code,
        description_snapshot: hamper.name,
        unit_price_snapshot: hamper.standard_price,
        quantity_required: Math.floor(qty),
        special_requirements: clean(item.special_requirements) || null,
      };
    });

    const { error: deleteItemsError } = await supabase.from('hamper_order_items').delete().eq('order_id', id);
    if (deleteItemsError) return NextResponse.json({ error: deleteItemsError.message }, { status: 400 });
    const { error: insertItemsError } = await supabase.from('hamper_order_items').insert(rows);
    if (insertItemsError) return NextResponse.json({ error: insertItemsError.message }, { status: 400 });
  }

  await supabase.from('hamper_order_events').insert({
    order_id: id,
    event_type: 'order_edited',
    created_by_user_id: user.id,
    event_data: { production_lines_locked: hasProduction },
  });

  return NextResponse.json({ ok: true, hasProduction });
}

export async function DELETE(_: Request, { params }: { params: Promise<{id:string}> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const [{ count: productionCount, error: productionError }, { count: podCount, error: podError }] = await Promise.all([
    supabase.from('hamper_production_log').select('id', { count: 'exact', head: true }).eq('order_id', id),
    supabase.from('hamper_pods').select('id', { count: 'exact', head: true }).eq('order_id', id),
  ]);
  if (productionError) return NextResponse.json({ error: productionError.message }, { status: 400 });
  if (podError) return NextResponse.json({ error: podError.message }, { status: 400 });

  if ((productionCount ?? 0) > 0 || (podCount ?? 0) > 0) {
    return NextResponse.json({
      error: 'This order already has production history or a signed docket, so it cannot be permanently deleted.'
    }, { status: 400 });
  }

  const { error } = await supabase.from('hamper_orders').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
