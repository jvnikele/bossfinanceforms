# Boss Finance | Diagnóstico de Clínicas de Estética

Site responsivo com formulário em quatro etapas, banco Supabase e aviso automático pela **API oficial do WhatsApp Business (Meta)**.

## 1. Banco de dados (Supabase)

1. Crie um projeto em https://supabase.com.
2. Abra **SQL Editor** e execute o arquivo `sql/schema.sql`.
3. Em **Project Settings > API**, copie a URL do projeto e a chave `service_role` (chave secreta). Configure no Vercel como `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`.
4. Os registros ficam em **Table Editor > diagnosticos_estetica**. A coluna `notificacao_whatsapp` mostra se o envio foi aceito pela API.

**Atenção:** a chave `service_role` nunca deve ser colocada no HTML, JS do navegador, GitHub público ou prints. Só nas variáveis de ambiente do servidor.

## 2. WhatsApp automático (Meta Cloud API)

O WhatsApp **não permite envio automático direto a partir de um link `wa.me`**, nem disparos programáticos comuns com número pessoal. É necessário configurar a plataforma oficial em https://developers.facebook.com e usar um número empresarial habilitado como **remetente**.

1. Configure WhatsApp Business Platform/Cloud API no painel Meta e obtenha um token permanente com as permissões adequadas, e o `Phone Number ID` do número remetente.
2. Crie e aprove um modelo de mensagem de **utilidade** com nome `boss_novo_diagnostico`, idioma `pt_BR`, e o texto abaixo. A aprovação é feita pela Meta.
3. Defina `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TEMPLATE_NAME`, `WHATSAPP_TEMPLATE_LANGUAGE` e `WHATSAPP_TO` nas variáveis de ambiente do Vercel.
4. O destinatário deve ter consentido em receber notificações pelo WhatsApp, conforme as regras aplicáveis da Meta. Se o número não for elegível, o envio poderá falhar.

### Modelo de mensagem (12 variáveis, exatamente nesta ordem)

```text
Novo diagnóstico recebido pela Boss Finance.

Nome: {{1}}
WhatsApp: {{2}}
Clínica: {{3}}
Cidade: {{4}}
Segmentos: {{5}}
Estrutura: {{6}}
Clientes por dia: {{7}}
Faturamento mensal: {{8}}
Pagamentos: {{9}}
Parcelamento: {{10}}
Despesas mensais: {{11}}
Meta de vendas 2027: {{12}}
```

Ao criar o modelo, preencha exemplos para as variáveis. A Meta pode solicitar ajustes ou reclassificar o modelo. Se a aprovação de um modelo longo não for possível, altere tanto o texto aprovado quanto a função `getWhatsAppParts` em `api/submit.js` para corresponderem.

**Confirme o telefone de destino:** você informou **45 9153-7745**, que tem 8 dígitos depois do DDD. No Brasil, celulares atuais normalmente usam **9 dígitos** depois do DDD. O exemplo em `.env.example` reproduz exatamente os algarismos informados (`554591537745`), mas pode estar incorreto. Corrija no Vercel antes de ativar.

### Como funciona

A API salva o diagnóstico primeiro. Em seguida solicita o disparo ao WhatsApp e atualiza a coluna de status. O retorno `enviada` significa que a Meta **aceitou a solicitação**, não que houve confirmação de entrega ao aparelho. Em caso de falha, os dados permanecem salvos e a coluna fica como `erro`; a pessoa que preencheu verá sucesso porque a resposta foi armazenada.

## 3. Publicar no Vercel

1. Envie a pasta para um repositório no GitHub.
2. Importe o repositório no https://vercel.com/new e escolha **Framework Preset: Other**.
3. Configure todas as variáveis descritas em `.env.example` no Vercel.
4. Clique em Deploy. A página será servida na URL do Vercel e o envio usará `/api/submit`.
5. Teste um formulário e confira o Supabase e o status da notificação.

Para testar localmente, instale a Vercel CLI (`npm i -g vercel`), crie `.env.local` com as variáveis e execute `vercel dev`.

## Segurança e privacidade

- O navegador não acessa o banco diretamente. A credencial fica somente no backend.
- RLS fica ativada sem acesso público à tabela. Um checkbox solicita autorização para análise e contato.
- Como os formulários armazenam dados pessoais e financeiros, recomenda-se criar uma política de privacidade com contato do responsável, prazo de retenção, base legal, procedimento de exclusão, e instruções sobre o tratamento pela Meta.
- Para produção com grande volume, adicione CAPTCHA/Turnstile, limite de requisições persistente e retentativa agendada de notificações (o código já inclui um campo honeypot básico, mas isso não substitui proteção robusta).
- Não publique o repositório com `.env.local`. O arquivo `.gitignore` já protege envs locais.
