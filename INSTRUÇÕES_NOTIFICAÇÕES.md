# Instruções para Ativar Sistema de Notificações

## 1. Executar Migrations no Supabase

Execute estes arquivos SQL no Supabase **nesta ordem**:

### Passo 1: Criar tabela de configurações
```sql
-- Arquivo: migrations/create_bill_notification_settings.sql
```
Copie e execute todo o conteúdo deste arquivo no SQL Editor do Supabase.

### Passo 2: Criar função RPC para n8n
```sql
-- Arquivo: migrations/create_bill_notifications_rpc.sql
```
Copie e execute todo o conteúdo deste arquivo no SQL Editor do Supabase.

## 2. Verificar se funcionou

Execute esta query para testar:
```sql
SELECT * FROM bill_notification_settings;
```

Se não der erro, está funcionando!

## 3. Testar a funcionalidade

1. Acesse **Financeiro** → Botão **"Notificações"**  
2. Selecione sua instância WhatsApp (agora deve mostrar apenas o nome, ex: "Kona")
3. Digite seu número (ex: 5573988770446)
4. Ative os toggles de notificação
5. Clique em "Salvar Configurações"

Se salvar sem erros, está tudo pronto! ✅

## 4. Workflow n8n

O workflow já está configurado e vai rodar automaticamente às 8h da manhã, buscando contas pendentes e enviando notificações.
