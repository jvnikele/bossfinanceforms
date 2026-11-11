create extension if not exists pgcrypto;

create table if not exists public.diagnosticos_estetica (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nome text not null,
  telefone text not null,
  clinica text not null,
  cidade text not null,
  segmentos text[] not null default '{}',
  salas integer not null,
  profissionais integer not null,
  funcionarios integer not null,
  clientes_dia integer not null,
  faturamento_mensal numeric(14,2) not null,
  percentual_cartao integer not null,
  percentual_pix integer not null,
  percentual_dinheiro integer not null,
  percentual_boleto integer not null,
  parcelamento text not null,
  despesas_mensais numeric(14,2) not null,
  meta_2027 numeric(14,2) not null,
  consentimento boolean not null check(consentimento = true),
  notificacao_whatsapp text not null default 'pendente' check (notificacao_whatsapp in ('pendente', 'enviada', 'erro', 'nao_configurado')),
  whatsapp_message_id text,
  notificacao_erro text
);

create index if not exists diagnosticos_created_at_idx on public.diagnosticos_estetica (created_at desc);
alter table public.diagnosticos_estetica enable row level security;
-- Não criar policies públicas. O site só grava com SERVICE_ROLE_KEY no servidor.
revoke all on table public.diagnosticos_estetica from anon, authenticated;
