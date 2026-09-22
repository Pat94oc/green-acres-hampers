-- Stage 6 live database change.
-- Safe for the shared green-acres-dockets Supabase project: this only changes hamper_* logic.

create or replace function public.hamper_recalculate_order_status(p_order_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_completed integer;
  v_item_count integer;
  v_all_complete boolean;
  v_current_status text;
  v_new_status text;
begin
  select status into v_current_status
  from public.hamper_orders
  where id = p_order_id;

  if v_current_status is null
     or v_current_status in ('out_for_delivery','delivered','completed','cancelled') then
    return;
  end if;

  select
    count(*)::integer,
    coalesce(sum(p.quantity_completed),0)::integer,
    coalesce(bool_and(p.quantity_completed >= p.quantity_required), false)
  into v_item_count, v_completed, v_all_complete
  from public.hamper_order_item_progress p
  where p.order_id = p_order_id;

  v_new_status := case
    when v_item_count = 0 or v_completed <= 0 then 'scheduled'
    when v_all_complete then 'ready'
    else 'in_progress'
  end;

  update public.hamper_orders
  set
    status = v_new_status,
    ready_at = case
      when v_new_status = 'ready' then coalesce(ready_at, now())
      else null
    end,
    updated_at = now()
  where id = p_order_id;
end;
$$;
