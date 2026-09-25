#!/usr/bin/env bash
# THE RELAY'S SERVER, SET UP FROM NOTHING (P3.5). Run ON the server, once, and again after a rebuild:
#
#   sudo bash setup.sh <hostname>
#
# Written for Ubuntu 24.04 or later, and first run on Ubuntu 26.04 on Google Cloud's e2-micro in
# Mumbai (brief v1.5). Nothing in it is Google's. Safe to run twice: every step checks before it
# changes anything. What it does, and why, is in deploy/README.md; the short form:
#
#   - India time, so the one restart security updates may need happens at 03:30 IST
#   - a system log that keeps 7 days and then deletes
#   - a 1 GB swap file, because the server has 1 GB of memory and a large update can need more
#   - Node (long-term support) and Caddy, each from its own signed package repository
#   - security updates installed automatically, Node's and Caddy's included
#   - a `relay` user with no login and no home, and a service that runs the bundled relay as it,
#     restarts it on failure and at boot, and fences it off from the rest of the machine
#   - Caddy in front, which gets and renews the certificate, and keeps NO access log: an address is
#     personal data under India's DPDP Act, and nothing here needs one
#   - the machine's own firewall opened for web traffic where it blocks it, and nothing else
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

echo "== a swap file: the free server has 1 GB of memory, and a big package update can want more"
if [[ ! -f /swapfile ]]; then
  fallocate -l 1G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
fi
swapon --show | grep -q '^/swapfile' || swapon /swapfile
grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >>/etc/fstab

echo "== packages the steps below need"
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get install -y -q ca-certificates curl gnupg unattended-upgrades \
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

echo "== the system log keeps 7 days, then deletes (ruled 25 September 2026)"
# Caddy's logs are filtered of addresses (below), and a future Caddy field the filter does not know
# would still age out within a week. MaxFileSec matters as much as MaxRetentionSec: the log is
# trimmed by whole file, and by default one file spans a month.
install -d -m 0755 /etc/systemd/journald.conf.d
cat >/etc/systemd/journald.conf.d/immunity-wars.conf <<'EOF'
[Journal]
MaxRetentionSec=7day
MaxFileSec=1day
EOF
systemctl restart systemd-journald

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

echo "== Caddy in front: the certificate, no access log, and no addresses in its other logs"
# Written beside the live file and validated BEFORE it replaces it: a file that failed validation
# left in place would stop Caddy at the next restart, which the 03:30 update window makes certain.
cat >/etc/caddy/Caddyfile.new <<EOF
# The Immunity Wars relay. Caddy obtains and renews the certificate for this name by itself.
#
# NO ADDRESS OF ANYONE CONNECTING IS WRITTEN DOWN: an address is personal data under the DPDP Act,
# and the players are children. The site has no 'log' directive, so Caddy writes no access log.
# But that is not enough, and was found not to be on 25 September 2026: Caddy's ERROR log records
# the whole request that failed, the client's address, port and headers included, and on the first
# deploy a 502 put one into the system journal. So every log Caddy writes deletes those fields
# before it is written. The error itself, its status and its cause are kept.
{
	log default {
		format filter {
			wrap json
			fields {
				request>remote_ip delete
				request>client_ip delete
				request>remote_port delete
				request>headers delete
			}
		}
	}
}

${HOST_NAME} {
	handle /relay {
		reverse_proxy 127.0.0.1:8787
	}
	handle {
		respond 404
	}
}
EOF
caddy validate --config /etc/caddy/Caddyfile.new --adapter caddyfile
mv /etc/caddy/Caddyfile.new /etc/caddy/Caddyfile
systemctl reload caddy || systemctl restart caddy

echo "== this machine's own firewall: web traffic in, where it rejects by default"
# Some clouds' Ubuntu images (Oracle's) reject everything but SSH in iptables. Google's Ubuntu 26.04
# image has NO host firewall at all (no iptables, nft or ufw, checked on 25 September 2026): the
# cloud's own firewall is the gate, opened in the console (deploy/README.md), and the relay itself
# listens only on this machine. So rules are added only where the host rejects, each just before
# the reject and only if it is not there already, and nothing is installed where nothing blocks.
if command -v iptables >/dev/null 2>&1 && iptables -S INPUT | grep -q -- '-j REJECT'; then
  # iptables-persistent brings the plugin that actually saves the rules across a restart.
  apt-get install -y -q iptables-persistent
  for port in 80 443; do
    if ! iptables -C INPUT -p tcp -m state --state NEW --dport "$port" -j ACCEPT 2>/dev/null; then
      at=$(iptables -L INPUT --line-numbers | awk '/REJECT/ {print $1; exit}')
      iptables -I INPUT "$at" -p tcp -m state --state NEW --dport "$port" -j ACCEPT
    fi
  done
  netfilter-persistent save
else
  echo "no host firewall rejecting traffic here; the cloud's firewall is the gate"
fi

echo "== checks"
sshd -T | grep -E '^(passwordauthentication|permitrootlogin) '
# The origins it will update from: Ubuntu's, NodeSource's and Cloudsmith's (Caddy) should all appear.
unattended-upgrade --dry-run --debug 2>&1 | grep -i 'allowed origins' || true
echo "setup done for ${HOST_NAME}. Next: deploy.sh from the development PC."
