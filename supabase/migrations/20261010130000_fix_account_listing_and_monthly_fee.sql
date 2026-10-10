-- Rückgabefelder von PL/pgSQL dürfen nicht mit unqualifizierten Spalten
-- verwechselt werden. Die Admin-Kontenübersicht verwendet eindeutige Aliase.
create or replace function public.list_admin_accounts()
returns table (
  profile_id bigint,
  display_name text,
  email text,
  account_role text,
  profile_created_at timestamp without time zone,
  age_group_id bigint,
  portrait_path text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.has_account_role('admin') then
    raise exception 'Admin role required' using errcode = '42501';
  end if;

  return query
  select
    account_profile.id,
    account_profile.display_name,
    auth_account.email::text,
    case
      when exists (
        select 1 from public.user_roles as admin_role
        where admin_role.profile_id = account_profile.id
          and admin_role.role = 'admin'
      ) then 'admin'
      when exists (
        select 1 from public.user_roles as teacher_role
        where teacher_role.profile_id = account_profile.id
          and teacher_role.role = 'teacher'
      ) then 'teacher'
      else 'parent'
    end,
    account_profile.created_at,
    staff_profile.age_group_id,
    staff_profile.portrait_path
  from public.profiles as account_profile
  join auth.users as auth_account on auth_account.id = account_profile.auth_user_id
  left join public.staff_profiles as staff_profile on staff_profile.profile_id = account_profile.id
  order by account_profile.created_at desc, account_profile.id desc;
end;
$$;

revoke all on function public.list_admin_accounts() from public, anon;
grant execute on function public.list_admin_accounts() to authenticated;

-- Der bei der Registrierung zugesagte Monatsbeitrag beträgt 15,00 Euro.
alter table public.payment_agreements alter column monthly_amount_cents set default 1500;
alter table public.monthly_payments alter column amount_cents set default 1500;

update public.payment_agreements
set monthly_amount_cents = 1500, updated_at = now()
where agreement_status = 'active' and monthly_amount_cents = 1499;

-- Offene Sollbeträge ab dem aktuellen Monat werden an den Beitrag angepasst.
-- Frühere Monate, verbuchte Zahlungen und beendete Vereinbarungen bleiben historisch erhalten.
update public.monthly_payments as payment
set amount_cents = 1500, updated_at = now()
from public.payment_agreements as agreement
where payment.payment_agreement_id = agreement.id
  and agreement.agreement_status = 'active'
  and agreement.monthly_amount_cents = 1500
  and payment.amount_cents = 1499
  and payment.status = 'pending'
  and payment.paid_at is null
  and payment.billing_month >= date_trunc('month', now() at time zone 'Europe/Berlin')::date;

create or replace function public.create_new_user_payment_agreement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_payment_method text;
  selected_payer_name text;
begin
  selected_payment_method :=
    nullif(trim(new.raw_user_meta_data ->> 'payment_method'), '');
  selected_payer_name :=
    nullif(trim(new.raw_user_meta_data ->> 'payment_payer_name'), '');

  if selected_payment_method is null
    or selected_payment_method not in ('paypal', 'bank_transfer') then
    raise exception 'A valid payment method is required' using errcode = '22023';
  end if;
  if coalesce(new.raw_user_meta_data ->> 'payment_accepted', 'false') <> 'true' then
    raise exception 'Payment consent is required' using errcode = '22023';
  end if;
  if selected_payer_name is null
    or char_length(selected_payer_name) < 2
    or char_length(selected_payer_name) > 120 then
    raise exception 'A valid payment payer name is required' using errcode = '22023';
  end if;

  insert into public.payment_agreements (
    auth_user_id, payment_method, payer_name, monthly_amount_cents,
    payment_accepted, agreement_status, consent_version
  ) values (
    new.id, selected_payment_method, selected_payer_name, 1500, true, 'active', 1
  )
  on conflict (auth_user_id) do update
  set payment_method = excluded.payment_method,
      payer_name = excluded.payer_name,
      monthly_amount_cents = excluded.monthly_amount_cents,
      payment_accepted = excluded.payment_accepted,
      agreement_status = excluded.agreement_status,
      consent_version = excluded.consent_version,
      updated_at = now();

  return new;
end;
$$;

revoke all on function public.create_new_user_payment_agreement() from public;
