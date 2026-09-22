import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await request.json();
  const { data, error } = await supabase.rpc('hamper_create_order', {
    p_customer_name: body.customerName,
    p_contact_name: body.contactName || '',
    p_contact_phone: body.phone || '',
    p_contact_email: body.email || '',
    p_customer_order_reference: body.customerReference || '',
    p_fulfilment_method: body.fulfilmentMethod,
    p_delivery_date: body.deliveryDate,
    p_production_due_date: body.productionDueDate || null,
    p_delivery_address_1: body.address1 || '',
    p_delivery_address_2: body.address2 || '',
    p_delivery_town: body.town || '',
    p_delivery_county: body.county || '',
    p_delivery_eircode: body.eircode || '',
    p_delivery_notes: body.notes || '',
    p_priority: Boolean(body.priority),
    p_taken_by_user_id: body.takenByUserId || user.id,
    p_items: body.items,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ id: data });
}
