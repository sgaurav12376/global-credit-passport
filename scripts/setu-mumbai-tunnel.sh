#!/usr/bin/env bash
set -euo pipefail
host=${1:-}
mode=${2:-browser}
key=${SETU_SSH_KEY:-"$HOME/Downloads/setu-sandbox-mumbai.pem"}
if [[ ! "$host" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ || ! -r "$key" ]]; then
  echo "Usage: bash scripts/setu-mumbai-tunnel.sh CURRENT_PUBLIC_IPV4 [browser|backend]; check SETU_SSH_KEY." >&2
  exit 2
fi
args=(-D 127.0.0.1:1080)
case "$mode" in
  browser) ;;
  backend) args+=(-L 127.0.0.1:18087:127.0.0.1:8087) ;;
  *) echo "Expected browser or backend" >&2; exit 2 ;;
esac
echo "Opening tunnel. Leave this terminal open. Ctrl+C ends the tunnel and automatically terminates EC2 when launched through setu-demo-session.sh."
exec ssh -o StrictHostKeyChecking=accept-new -o BatchMode=yes -N -T -i "$key" -o IdentitiesOnly=yes -o ExitOnForwardFailure=yes \
  -o ConnectTimeout=12 -o ServerAliveInterval=30 -o ServerAliveCountMax=3 \
  "${args[@]}" "ec2-user@$host"
