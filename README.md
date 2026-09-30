
# Zabbix/GLPI MCP Server

Node.js/TypeScript MCP server for querying, monitoring, and administering:

- **Zabbix**
- **GLPI**
<img width="1659" height="734" alt="ai_ask_zbbx_glpi" src="https://github.com/user-attachments/assets/24081c01-d36f-4bff-b826-3bc4622989a3" />

## MCP Tools

The server uses MCP transport via `stdio` and exposes generic tools for reading and writing to the Zabbix and GLPI APIs.

### Monitoring

- **check-zabbix**: checks the Web UI, JSON-RPC API, and TCP port `10051`.
- **check-glpi**: checks the GLPI Web UI/API and configured TCP ports.
- **check-all**: runs both Zabbix and GLPI checks.
- **check-host**: checks arbitrary TCP ports on any host.
- **check-lpi**: compatibility alias for `check-glpi`.

### Zabbix

- **zabbix-api-version**: returns the API version.
- **zabbix-api-call**: calls any Zabbix JSON-RPC method.

For Zabbix 7.2 or later, authentication is sent in the HTTP header `Authorization: ******`. The server does not send the `auth` field in the JSON-RPC body.

Example Zabbix methods:

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

- **glpi-request**: calls any GLPI REST API path using `GET`, `POST`, `PUT`, `PATCH`, or `DELETE`.
- **glpi-search**: searches any GLPI item type.
- **glpi-get-item**: reads an item by type and ID.
- **glpi-create-item**: creates an item.
- **glpi-update-item**: updates an item.
- **glpi-delete-item**: removes an item.

Example GLPI types:

- `Ticket`
- `Computer`
- `User`
- `Entity`
- `NetworkEquipment`
- `Software`
- `Peripheral`
- `Monitor`
- `Printer`

## Configuration

The default settings already point to the provided IPs. For authenticated queries and create/update operations, configure credentials through environment variables.

| Variable | Default | Description |
| --- | --- | --- |
| `ZABBIX_HOST` | `ip_zabbix` | Host used for Zabbix TCP checks |
| `ZABBIX_URL` | `http://ip_zabbix` | Base URL of the web interface/API |
| `ZABBIX_API_URL` | empty | Exact JSON-RPC API URL |
| `ZABBIX_AUTH_TOKEN` | empty | Zabbix API token |
| `ZABBIX_USERNAME` | empty | Zabbix user, used if no token exists |
| `ZABBIX_PASSWORD` | empty | Zabbix password, used if no token exists |
| `ZABBIX_SERVER_PORT` | `10051` | Zabbix Server TCP port |
| `GLPI_HOST` | `ip_glpi` | Host used for GLPI TCP checks |
| `GLPI_URL` | `http://ip_glpi` | GLPI base URL |
| `GLPI_API_URL` | `http://ip_glpi/apirest.php` | GLPI REST API base URL |
| `GLPI_PORTS` | `80` | Comma-separated list of TCP ports |
| `GLPI_APP_TOKEN` | empty | GLPI app token, if configured |
| `GLPI_USER_TOKEN` | empty | GLPI user token |
| `GLPI_SESSION_TOKEN` | empty | Existing session token, if you want to avoid `initSession` |
| `GLPI_USERNAME` | empty | GLPI user, used if no user/session token exists |
| `GLPI_PASSWORD` | empty | GLPI password, used if no user/session token exists |
| `MONITOR_TIMEOUT_MS` | `3000` | Timeout per check/call in milliseconds |

The old variables `LPI_HOST`, `LPI_URL`, and `LPI_PORTS` are still accepted as a fallback for GLPI.

## Ubuntu Dependencies

Install on the Ubuntu server:

- Node.js 18 or later. Recommended: Node.js 20 LTS or 22 LTS.
- npm.
- git, if cloning the repository directly on the server.
- ca-certificates and curl.
- Network access from the MCP server to `ip_zabbix` and `ip_glpi`.

Commands for Ubuntu 22.04/24.04 using NodeSource Node.js 20:

```bash
sudo apt-get update && sudo apt-get install -y ca-certificates curl git
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version
npm --version
```

## Installation on the Ubuntu Server

Clone or copy this project to Ubuntu. Example using `/opt/zabbix-glpi-mcp`:

```bash
sudo mkdir -p /opt/zabbix-glpi-mcp && sudo chown "$USER":"$USER" /opt/zabbix-glpi-mcp
git clone https://github.com/braieralves/MCP-Server-ZBBX-GLPI.git /opt/zabbix-glpi-mcp
cd /opt/zabbix-glpi-mcp
npm ci
npm run build
```

If you manually copy the folder instead of cloning it, run inside it:

```bash
npm ci && npm run build
```

If using the wrapper included in the repository:

```bash
sudo cp deploy/run-mcp.sh /usr/local/bin/zabbix-glpi-mcp && sudo chmod +x /usr/local/bin/zabbix-glpi-mcp
```

## Environment Variables on Ubuntu

Create a `/opt/zabbix-glpi-mcp/.env` file with the real credentials:

```bash
ZABBIX_HOST=ip_zabbix
ZABBIX_URL=http://ip_zabbix
ZABBIX_API_URL=http://ip_zabbix/api_jsonrpc.php
ZABBIX_AUTH_TOKEN=put-the-token-here
GLPI_HOST=ip_glpi
GLPI_URL=http://ip_glpi
GLPI_API_URL=http://ip_glpi/apirest.php
GLPI_APP_TOKEN=put-the-app-token-here
GLPI_USER_TOKEN=put-the-user-token-here
GLPI_PORTS=80
MONITOR_TIMEOUT_MS=5000
```

Alternative without a Zabbix token:

```bash
ZABBIX_USERNAME=Admin
ZABBIX_PASSWORD=your-password
```

Alternative without a GLPI user token:

```bash
GLPI_USERNAME=glpi
GLPI_PASSWORD=your-password
```

## Local Test on Ubuntu

```bash
cd /opt/zabbix-glpi-mcp && set -a && . ./.env && set +a && npm start
```

The process waits for MCP calls via `stdio`; this is expected. The MCP client normally starts this command automatically.

## MCP Client Configuration

Example for an MCP client running on the same Ubuntu server:

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

If the AI client is on another machine, remember that this MCP server uses `stdio`; the client must be able to start the process on Ubuntu, for example via SSH. SSH must work without an interactive password prompt.

## SSH Access from Windows to Ubuntu

Use this flow when Claude Desktop runs on Windows and the MCP server runs on Ubuntu.

### 1. Create SSH Key on Windows

In Windows PowerShell:

```powershell
ssh-keygen -t ed25519 -f "$env:USERPROFILE\.ssh\id_ed25519" -C "windows-claude-mcp"
```

When asked for a passphrase, press Enter to leave it empty. This avoids an interactive prompt when Claude Desktop starts the MCP.

### 2. Copy the Public Key

In PowerShell:

```powershell
type "$env:USERPROFILE\.ssh\id_ed25519.pub"
```

Copy the full displayed line. It starts with `ssh-ed25519`.

### 3. Import the Key on Ubuntu

On Ubuntu, using the user Claude will use via SSH:

```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh
nano ~/.ssh/authorized_keys
```

Paste the public key on a new line, save the file, and adjust permissions:

```bash
chmod 600 ~/.ssh/authorized_keys
```

### 4. Test Passwordless SSH

In Windows PowerShell:

```powershell
ssh user@UBUNTU_IP "echo OK"
```

The expected result is:

```text
OK
```

If it asks for a password, Claude Desktop will also be unable to start the MCP. Check the user, IP, and permissions for `~/.ssh` and `~/.ssh/authorized_keys` on Ubuntu.

### 5. Test the MCP Wrapper via SSH

In PowerShell:

```powershell
ssh -T user@UBUNTU_IP "test -x /opt/zabbix-glpi-mcp/deploy/run-mcp.sh && echo OK"
```

If it does not return `OK`, fix it on Ubuntu:

```bash
chmod +x /opt/zabbix-glpi-mcp/deploy/run-mcp.sh
```

If a `bash\r` error appears, the file has Windows line endings. Fix it:

```bash
cd /opt/zabbix-glpi-mcp && sed -i 's/\r$//' deploy/run-mcp.sh && chmod +x deploy/run-mcp.sh
```

### 6. Configure Claude Desktop on Windows

Edit or create:

```text
%APPDATA%\Claude\claude_desktop_config.json
```

Example:

```json
{
  "mcpServers": {
    "zabbix-glpi": {
      "command": "C:\\Windows\\System32\\OpenSSH\\ssh.exe",
      "args": [
        "-T",
        "user@UBUNTU_IP",
        "bash -lc '/opt/zabbix-glpi-mcp/deploy/run-mcp.sh'"
      ]
    }
  }
}
```

Then fully close Claude Desktop and open it again.

### 7. Validate in Claude

Ask Claude:

```text
Use the zabbix-glpi MCP and call check-all.
```

If Claude says it cannot find the server, check the Claude Desktop logs on the machine where it runs:

```text
%APPDATA%\Claude\logs
```
