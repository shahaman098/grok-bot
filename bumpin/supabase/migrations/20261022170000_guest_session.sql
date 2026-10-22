-- Guest minting for BumpIn (works when Anonymous Auth is disabled)
create extension if not exists pgcrypto with schema extensions;

create or replace function public.create_bumpin_guest(
  p_email text,
  p_password text
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  v_id uuid := gen_random_uuid();
  v_encrypted text;
begin
  v_encrypted := crypt(p_password, gen_salt('bf'));

  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    is_anonymous,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_id,
    'authenticated',
    'authenticated',
    lower(p_email),
    v_encrypted,
    now(),
    jsonb_build_object('provider','email','providers', jsonb_build_array('email')),
    '{}'::jsonb,
    now(),
    now(),
    false,
    '',
    '',
    '',
    ''
  );

  insert into auth.identities (
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    v_id::text,
    v_id,
    jsonb_build_object('sub', v_id::text, 'email', lower(p_email), 'email_verified', true),
    'email',
    now(),
    now(),
    now()
  );

  return v_id;
end;
$$;

revoke all on function public.create_bumpin_guest(text, text) from public;
