# Zabbix/GLPI MCP Server

Servidor MCP em Node.js/TypeScript para consultar, monitorar e administrar:

- **Zabbix** em `ip_zabbix`
- **GLPI** em `ip_glpi`
<img width="1182" height="404" alt="zbbx_glpi" src="https://github.com/user-attachments/assets/6f390ff1-405f-46ee-98a2-1be02b17d8cf" />

O servidor usa transporte MCP via `stdio` e expõe ferramentas genéricas para leitura e escrita nas APIs do Zabbix e do GLPI.

## Ferramentas MCP

### Monitoramento

- **check-zabbix**: verifica Web UI, API JSON-RPC e porta TCP `10051`.
- **check-glpi**: verifica Web UI/API GLPI e portas TCP configuradas.
- **check-all**: executa os checks de Zabbix e GLPI.
- **check-host**: verifica portas TCP arbitrárias em qualquer host.
- **check-lpi**: alias de compatibilidade para `check-glpi`.

### Zabbix

- **zabbix-api-version**: retorna a versão da API.
- **zabbix-api-call**: chama qualquer método JSON-RPC do Zabbix.

Para Zabbix 7.2 ou superior, a autenticação é enviada no header HTTP `Authorization: Bearer <token>`. O servidor não envia o campo `auth` no corpo JSON-RPC.

Exemplos de métodos Zabbix:

- `host.get`
- `item.get`
- `trigger.get`
- `problem.get`
- `event.get`
- `host.create`
- `item.create`
- `maintenance.create`
- `action.create`

### GLPI

- **glpi-request**: chama qualquer path da API REST do GLPI com `GET`, `POST`, `PUT`, `PATCH` ou `DELETE`.
- **glpi-search**: pesquisa qualquer tipo de item GLPI.
- **glpi-get-item**: lê um item por tipo e ID.
- **glpi-create-item**: cria um item.
- **glpi-update-item**: atualiza um item.
- **glpi-delete-item**: remove um item.

Exemplos de tipos GLPI:

- `Ticket`
- `Computer`
- `User`
- `Entity`
- `NetworkEquipment`
- `Software`
- `Peripheral`
- `Monitor`
- `Printer`

## Configuração

As configurações padrão já apontam para os IPs informados. Para consultas autenticadas e operações de criação/alteração, configure credenciais via variáveis de ambiente.

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `ZABBIX_HOST` | `ip_zabbix` | Host usado para checks TCP do Zabbix |
| `ZABBIX_URL` | `http://ip_zabbix` | URL base da interface web/API |
| `ZABBIX_API_URL` | vazio | URL exata da API JSON-RPC |
| `ZABBIX_AUTH_TOKEN` | vazio | Token de API do Zabbix |
| `ZABBIX_USERNAME` | vazio | Usuário Zabbix, usado se não houver token |
| `ZABBIX_PASSWORD` | vazio | Senha Zabbix, usada se não houver token |
| `ZABBIX_SERVER_PORT` | `10051` | Porta TCP do Zabbix Server |
| `GLPI_HOST` | `ip_glpi` | Host usado para checks TCP do GLPI |
| `GLPI_URL` | `http://ip_glpi` | URL base do GLPI |
| `GLPI_API_URL` | `http://ip_glpi/apirest.php` | URL base da API REST do GLPI |
| `GLPI_PORTS` | `80` | Lista de portas TCP separadas por vírgula |
| `GLPI_APP_TOKEN` | vazio | App token do GLPI, se configurado |
| `GLPI_USER_TOKEN` | vazio | User token do GLPI |
| `GLPI_SESSION_TOKEN` | vazio | Session token já criado, se quiser evitar `initSession` |
| `GLPI_USERNAME` | vazio | Usuário GLPI, usado se não houver user/session token |
| `GLPI_PASSWORD` | vazio | Senha GLPI, usada se não houver user/session token |
| `MONITOR_TIMEOUT_MS` | `3000` | Timeout por check/chamada em milissegundos |

As variáveis antigas `LPI_HOST`, `LPI_URL` e `LPI_PORTS` ainda são aceitas como fallback para GLPI.

## Dependências no Ubuntu

Instale no servidor Ubuntu:

- Node.js 18 ou superior. Recomendado: Node.js 20 LTS ou 22 LTS.
- npm.
- git, se for clonar o repositório direto no servidor.
- ca-certificates e curl.
- Acesso de rede do servidor MCP para `ip_zabbix` e `ip_glpi`.

Comandos para Ubuntu 22.04/24.04 usando NodeSource Node.js 20:

```bash
sudo apt-get update && sudo apt-get install -y ca-certificates curl git
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version
npm --version
```

## Instalação no servidor Ubuntu

Clone ou copie este projeto para o Ubuntu. Exemplo usando `/opt/zabbix-glpi-mcp`:

```bash
sudo mkdir -p /opt/zabbix-glpi-mcp && sudo chown "$USER":"$USER" /opt/zabbix-glpi-mcp
git clone https://github.com/braieralves/MCP-Server-ZBBX-GLPI.git /opt/zabbix-glpi-mcp
cd /opt/zabbix-glpi-mcp
npm ci
npm run build
```

Se você copiar a pasta manualmente em vez de clonar, rode dentro dela:

```bash
npm ci && npm run build
```

Se usar o wrapper incluído no repositório:

```bash
sudo cp deploy/run-mcp.sh /usr/local/bin/zabbix-glpi-mcp && sudo chmod +x /usr/local/bin/zabbix-glpi-mcp
```

## Variáveis de ambiente no Ubuntu

Crie um arquivo `/opt/zabbix-glpi-mcp/.env` com as credenciais reais:

```bash
ZABBIX_HOST=ip_zabbix
ZABBIX_URL=http://ip_zabbix
ZABBIX_API_URL=http://ip_zabbix/api_jsonrpc.php
ZABBIX_AUTH_TOKEN=coloque-o-token-aqui
GLPI_HOST=ip_glpi
GLPI_URL=http://ip_glpi
GLPI_API_URL=http://ip_glpi/apirest.php
GLPI_APP_TOKEN=coloque-o-app-token-aqui
GLPI_USER_TOKEN=coloque-o-user-token-aqui
GLPI_PORTS=80
MONITOR_TIMEOUT_MS=5000
```

Alternativa sem token Zabbix:

```bash
ZABBIX_USERNAME=Admin
ZABBIX_PASSWORD=sua-senha
```

Alternativa sem user token GLPI:

```bash
GLPI_USERNAME=glpi
GLPI_PASSWORD=sua-senha
```

## Teste local no Ubuntu

```bash
cd /opt/zabbix-glpi-mcp && set -a && . ./.env && set +a && npm start
```

O processo fica aguardando chamadas MCP via `stdio`; isso é esperado. O cliente MCP normalmente inicia esse comando automaticamente.

## Configuração no cliente MCP

Exemplo para um cliente MCP que roda no mesmo servidor Ubuntu:

```json
{
  "mcpServers": {
    "zabbix-glpi": {
      "command": "bash",
      "args": [
        "-lc",
        "/usr/local/bin/zabbix-glpi-mcp"
      ],
      "env": {
        "ZABBIX_HOST": "ip_zabbix",
        "ZABBIX_URL": "http://ip_zabbix",
        "GLPI_HOST": "ip_glpi",
        "GLPI_URL": "http://ip_glpi",
        "GLPI_PORTS": "80"
      }
    }
  }
}
```

Se o AI client estiver em outra máquina, lembre que este servidor MCP usa `stdio`; o cliente precisa conseguir iniciar o processo no Ubuntu, por exemplo via SSH. O SSH precisa funcionar sem prompt interativo de senha.

## Acesso SSH do Windows para Ubuntu

Use este fluxo quando o Claude Desktop roda no Windows e o MCP server roda no Ubuntu.

### 1. Criar chave SSH no Windows

No PowerShell do Windows:

```powershell
ssh-keygen -t ed25519 -f "$env:USERPROFILE\.ssh\id_ed25519" -C "windows-claude-mcp"
```

Quando pedir passphrase, pressione Enter para deixar vazio. Isso evita prompt interativo quando o Claude Desktop iniciar o MCP.

### 2. Copiar a chave publica

No PowerShell:

```powershell
type "$env:USERPROFILE\.ssh\id_ed25519.pub"
```

Copie a linha inteira exibida. Ela começa com `ssh-ed25519`.

### 3. Importar a chave no Ubuntu

No Ubuntu, com o usuario que o Claude vai usar via SSH:

```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
nano ~/.ssh/authorized_keys
```

Cole a chave publica em uma nova linha, salve o arquivo e ajuste as permissoes:

```bash
chmod 600 ~/.ssh/authorized_keys
```

### 4. Testar SSH sem senha

No PowerShell do Windows:

```powershell
ssh usuario@IP_DO_UBUNTU "echo OK"
```

O resultado esperado e:

```text
OK
```

Se pedir senha, o Claude Desktop tambem nao vai conseguir iniciar o MCP. Verifique usuario, IP e permissoes de `~/.ssh` e `~/.ssh/authorized_keys` no Ubuntu.

### 5. Testar o wrapper do MCP via SSH

No PowerShell:

```powershell
ssh -T usuario@IP_DO_UBUNTU "test -x /opt/zabbix-glpi-mcp/deploy/run-mcp.sh && echo OK"
```

Se nao retornar `OK`, corrija no Ubuntu:

```bash
chmod +x /opt/zabbix-glpi-mcp/deploy/run-mcp.sh
```

Se aparecer erro `bash\r`, o arquivo esta com final de linha Windows. Corrija:

```bash
cd /opt/zabbix-glpi-mcp && sed -i 's/\r$//' deploy/run-mcp.sh && chmod +x deploy/run-mcp.sh
```

### 6. Configurar Claude Desktop no Windows

Edite ou crie:

```text
%APPDATA%\Claude\claude_desktop_config.json
```

Exemplo:

```json
{
  "mcpServers": {
    "zabbix-glpi": {
      "command": "C:\\Windows\\System32\\OpenSSH\\ssh.exe",
      "args": [
        "-T",
        "usuario@IP_DO_UBUNTU",
        "bash -lc '/opt/zabbix-glpi-mcp/deploy/run-mcp.sh'"
      ]
    }
  }
}
```

Depois feche totalmente o Claude Desktop e abra novamente.

### 7. Validar no Claude

Peça ao Claude:

```text
Use o MCP zabbix-glpi e chame check-all.
```

Se o Claude disser que nao encontra o servidor, veja os logs do Claude Desktop na maquina onde ele roda:

```text
%APPDATA%\Claude\logs
```
