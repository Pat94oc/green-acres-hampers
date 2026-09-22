import { notFound } from 'next/navigation';
import { Shell } from '@/components/shell';
import { requireHamperUser } from '@/lib/auth';
import { EditOrderForm } from './edit-order-form';

export default async function Page({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const {supabase}=await requireHamperUser();
  const [{data:order},{data:items},{data:hampers},{data:staff},{count:productionCount}]=await Promise.all([
    supabase.from('hamper_orders').select('*,hamper_customers(name)').eq('id',id).single(),
    supabase.from('hamper_order_items').select('hamper_type_id,quantity_required,special_requirements').eq('order_id',id).order('created_at'),
    supabase.from('hamper_types').select('id,code,name').eq('active',true).order('sort_order'),
    supabase.from('hamper_app_users').select('user_id,display_name').eq('active',true).order('display_name'),
    supabase.from('hamper_production_log').select('id',{count:'exact',head:true}).eq('order_id',id),
  ]);
  if(!order) notFound();
  const initial={
    customerName:order.hamper_customers?.name??'',contactName:order.contact_name??'',phone:order.contact_phone??'',email:order.contact_email??'',customerReference:order.customer_order_reference??'',
    fulfilmentMethod:order.fulfilment_method,deliveryDate:order.delivery_date??'',productionDueDate:order.production_due_date??'',address1:order.delivery_address_1??'',address2:order.delivery_address_2??'',town:order.delivery_town??'',county:order.delivery_county??'',eircode:order.delivery_eircode??'',notes:order.delivery_notes??'',priority:Boolean(order.priority),takenByUserId:order.taken_by_user_id??'',
    lines:(items??[]).map((i:any)=>({hamper_type_id:i.hamper_type_id,quantity:Number(i.quantity_required),special_requirements:i.special_requirements??''})),
  };
  return <Shell><div className="eyebrow">Edit order</div><h1>{order.order_number}</h1><EditOrderForm orderId={id} hampers={(hampers??[]) as any} staff={(staff??[]) as any} initial={initial} hasProduction={(productionCount??0)>0}/></Shell>;
}
