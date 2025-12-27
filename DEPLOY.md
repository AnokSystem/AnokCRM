# Guia de Instalação e Deploy - AnokCRM

Este guia explica como instalar o AnokCRM (Frontend e Backend) no seu servidor Proxmox, rodando lado a lado com o Supabase via Docker.

## Pré-requisitos

*   **Docker** e **Docker Compose** instalados no servidor.
*   **Git** instalado.
*   Acesso ao terminal do servidor via SSH.

## Passos para Instalação

### 1. Transferir os Arquivos
No seu servidor, clone este repositório ou copie os arquivos para uma pasta, por exemplo `/opt/anokcrm`.

```bash
git clone <seu_repo> /opt/anokcrm
cd /opt/anokcrm
```

### 2. Configurar o Ambiente
Certifique-se de que as chaves do Supabase estão corretas nos arquivos:
*   `src/lib/supabase.ts` (Usado pelo Frontend)
*   `server/webhook.js` (Usado pelo Backend)

> **Nota:** Como você já configurou hardcoded nos arquivos durante o desenvolvimento, eles já devem estar funcionando. Em produção real, recomenda-se usar variáveis de ambiente, mas para seu uso "setup-eficaz", isso funcionará.

### 3. Subir os Containers
Execute o comando abaixo para construir e iniciar os serviços:

```bash
docker compose up -d --build
```

Este comando irá:
1.  Criar a imagem do **Frontend** (build do Vite + Nginx).
2.  Criar a imagem do **Backend** (Node.js).
3.  Iniciar ambos em background.

### 4. Verificar Status
```bash
docker compose ps
```
Você deve ver dois containers rodando (`frontend` e `backend`) com status "Up".

*   **Frontend:** Acessível em `http://localhost:8080`
*   **Backend:** Acessível em `http://localhost:3000`

## Configuração do Cloudflare Tunnel

No seu painel do Cloudflare Zero Trust (ou via arquivo `config.yml` se usar CLI), você deve apontar os subdomínios para as portas locais:

1.  **Frontend (O CRM em si):**
    *   **Public Hostname:** `crm.anok.com.br` (exemplo)
    *   **Service:** `http://localhost:8080`

2.  **Backend (Webhook para n8n):**
    *   **Public Hostname:** `webhook.anok.com.br` (exemplo)
    *   **Service:** `http://localhost:3000`

## Atualização Futura

Sempre que fizer alterações no código e quiser atualizar o servidor:

1.  Baixe as mudanças (`git pull`).
2.  Recrie os containers:
    ```bash
    docker compose up -d --build
    ```
