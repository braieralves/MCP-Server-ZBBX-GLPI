#!/usr/bin/env bash
set -euo pipefail

cd /opt/zabbix-glpi-mcp

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

exec node build/main.js
