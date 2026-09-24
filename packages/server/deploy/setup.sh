#!/usr/bin/env bash
# THE RELAY'S SERVER, SET UP FROM NOTHING (P3.5). Run ON the server, once, and again after a rebuild:
#
#   sudo bash setup.sh <hostname>
#
# Written for Ubuntu 24.04 on Oracle Cloud's Always Free Arm server. Safe to run twice: every step
# checks before it changes anything. What it does, and why, is in deploy/README.md; the short form:
#
#   - India time, so the one restart security updates may need happens at 03:30 IST
#   - Node (long-term support) and Caddy, each from its own signed package repository
#   - security updates installed automatically, Node's and Caddy's included
#   - a `relay` user with no login and no home, and a service that runs the bundled relay as it,
#     restarts it on failure and at boot, and fences it off from the rest of the machine
#   - Caddy in front, which gets and renews the certificate, and keeps NO access log: an address is
#     personal data under India's DPDP Act, and nothing here needs one
#   - the machine's own firewall opened for web traffic, and nothing else
#
# It does not deploy the relay itself: deploy.sh does, from the development PC.
set -euo pipefail

HOST_NAME="${1:?usage: sudo bash setup.sh <hostname>}"
if [[ $EUID -ne 0 ]]; then
  echo "run with sudo" >&2
  exit 1
fi

echo "== India time, for the 03:30 restart window"
timedatectl set-timezone Asia/Kolkata

echo "== packages the steps below need"
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get install -y -q ca-certificates curl gnupg unattended-upgrades netfilter-persistent \
  debian-keyring debian-archive-keyring apt-transport-https
install -d -m 0755 /etc/apt/keyrings

echo "== Node, long-term support, from NodeSource's signed repository"
if [[ ! -f /etc/apt/keyrings/nodesource.gpg ]]; then
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key |
    gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
fi
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_24.x nodistro main" \
  >/etc/apt/sources.list.d/nodesource.list

echo "== Caddy, from its signed repository"
if [[ ! -f /usr/share/keyrings/caddy-stable-archive-keyring.gpg ]]; then
  curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/gpg.key |
    gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
fi
curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt \
  >/etc/apt/sources.list.d/caddy-stable.list

apt-get update -q
apt-get install -y -q nodejs caddy
node --version

echo "== security updates, installed automatically, restarting at 03:30 IST only when one needs it"
cat >/etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF
cat >/etc/apt/apt.conf.d/52immunity-wars <<'EOF'
// Node and Caddy come from their own repositories, which Ubuntu's defaults do not update. The relay
// is a process on the open internet, so their security releases matter as much as Ubuntu's.
Unattended-Upgrade::Origins-Pattern {
  "site=deb.nodesource.com";
  "site=dl.cloudsmith.io";
};
// A restart ends every game in progress, because games live in memory: so only when an update
// needs one, and at the quietest hour.
Unattended-Upgrade::Automatic-Reboot "true";
Unattended-Upgrade::Automatic-Reboot-Time "03:30";
EOF
systemctl enable --now unattended-upgrades

echo "== the relay's user and its place on disk"
if ! id relay >/dev/null 2>&1; then
  useradd --system --no-create-home --shell /usr/sbin/nologin relay
fi
install -d -o root -g root -m 0755 /opt/immunity-wars/relay

echo "== the relay's service"
cat >/etc/systemd/system/immunity-wars-relay.service <<'EOF'
[Unit]
Description=The Immunity Wars relay
After=network-online.target
Wants=network-online.target

[Service]
User=relay
Group=relay
# This machine only: Caddy is what the internet reaches, and it is the one front trusted to say
# who is connecting (TRUST_PROXY; see packages/server/src/node.ts).
Environment=PORT=8787 HOST=127.0.0.1 TRUST_PROXY=1 NODE_ENV=production
ExecStart=/usr/bin/node /opt/immunity-wars/relay/current/relay.mjs
Restart=always
RestartSec=2
# Fenced off: the relay needs a network socket and nothing else on this machine.
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
PrivateTmp=yes
PrivateDevices=yes
ProtectKernelTunables=yes
ProtectKernelModules=yes
ProtectControlGroups=yes
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX
RestrictNamespaces=yes
LockPersonality=yes
CapabilityBoundingSet=
MemoryMax=512M

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable immunity-wars-relay

echo "== Caddy in front: the certificate, and no access log"
cat >/etc/caddy/Caddyfile <<EOF
# The Immunity Wars relay. Caddy obtains and renews the certificate for this name by itself.
# There is deliberately no 'log' directive: without one Caddy writes no access log, and an
# address is personal data under the DPDP Act.
${HOST_NAME} {
	handle /relay {
		reverse_proxy 127.0.0.1:8787
	}
	handle {
		respond 404
	}
}
EOF
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy || systemctl restart caddy

echo "== this machine's firewall: web traffic in, nothing else new"
# Oracle's Ubuntu images reject everything but SSH in iptables, as well as in the cloud's own
# security list, which is opened in the console (deploy/README.md). Each rule goes in just before
# that reject, and only if it is not there already.
for port in 80 443; do
  if ! iptables -C INPUT -p tcp -m state --state NEW --dport "$port" -j ACCEPT 2>/dev/null; then
    at=$(iptables -L INPUT --line-numbers | awk '/REJECT/ {print $1; exit}')
    iptables -I INPUT "${at:-1}" -p tcp -m state --state NEW --dport "$port" -j ACCEPT
  fi
done
netfilter-persistent save

echo "== checks"
sshd -T | grep -E '^(passwordauthentication|permitrootlogin) '
# The origins it will update from: Ubuntu's, NodeSource's and Cloudsmith's (Caddy) should all appear.
unattended-upgrade --dry-run --debug 2>&1 | grep -i 'allowed origins' || true
echo "setup done for ${HOST_NAME}. Next: deploy.sh from the development PC."
