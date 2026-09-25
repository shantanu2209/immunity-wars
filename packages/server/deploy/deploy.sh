#!/usr/bin/env bash
# PUTS THE RELAY ON THE SERVER (P3.5). Run on the development PC, from the repository root:
#
#   SERVER=ubuntu@<server address> HOST_NAME=<the relay's hostname> bash packages/server/deploy/deploy.sh
#
# 1. Tests the relay, including the bundle test, which builds the production file and plays
#    against it as its own process. Nothing is deployed that has not passed.
# 2. Builds the bundle, copies it to the server into a new version folder, and points `current` at
#    it. The last three versions are kept; going back is pointing `current` at the one before.
# 3. Restarts the relay ONLY IF NOBODY IS CONNECTED, because rooms live in memory and a restart ends
#    every game in progress. `FORCE=1` overrides that, deliberately.
# 4. Checks the relay answers through Caddy, over the internet, at wss://<hostname>/relay.
#
# It uses Windows' own ssh and scp when they are there, so that a key unlocked once in the Windows
# ssh-agent (deploy/README.md) is used without its passphrase ever passing through a script.
set -euo pipefail

SERVER="${SERVER:?set SERVER=ubuntu@<server address>}"
HOST_NAME="${HOST_NAME:?set HOST_NAME=<the relay hostname>}"
WIN_SSH=/c/Windows/System32/OpenSSH
if [[ -x "$WIN_SSH/ssh.exe" ]]; then
  SSH="$WIN_SSH/ssh.exe"
  SCP="$WIN_SSH/scp.exe"
else
  SSH=ssh
  SCP=scp
fi

echo "== tests, including the bundle as production runs it"
pnpm --filter @immunity-wars/server test

echo "== the bundle"
pnpm --filter @immunity-wars/server bundle
VERSION="$(date +%Y%m%d-%H%M%S)-$(git rev-parse --short HEAD)"
if [[ -n "$(git status --porcelain)" ]]; then VERSION="${VERSION}-dirty"; fi
DIST=packages/server/dist

echo "== copy to the server as version ${VERSION}"
"$SCP" "$DIST/relay.mjs" "$DIST/relay.mjs.map" "${SERVER}:/tmp/"
"$SSH" "$SERVER" "sudo install -d -m 0755 /opt/immunity-wars/relay/${VERSION} &&
  sudo install -m 0644 /tmp/relay.mjs /tmp/relay.mjs.map /opt/immunity-wars/relay/${VERSION}/ &&
  rm -f /tmp/relay.mjs /tmp/relay.mjs.map &&
  sudo ln -sfn /opt/immunity-wars/relay/${VERSION} /opt/immunity-wars/relay/current"

echo "== restart, only if nobody is connected"
CONNECTED="$("$SSH" "$SERVER" "ss -Htn state established '( sport = :8787 )' | wc -l" | tr -d '[:space:]')"
if [[ "$CONNECTED" != "0" && "${FORCE:-0}" != "1" ]]; then
  echo "NOT restarted: ${CONNECTED} connection(s) open, and a restart would end their games."
  echo "The new version is in place and runs at the next restart; FORCE=1 restarts now anyway."
  exit 0
fi
"$SSH" "$SERVER" "sudo systemctl restart immunity-wars-relay && sleep 2 && systemctl is-active immunity-wars-relay"

echo "== keep the last three versions"
"$SSH" "$SERVER" "cd /opt/immunity-wars/relay && ls -1d 20*/ | sort | head -n -3 | xargs -r sudo rm -rf"

echo "== answering through Caddy, from here"
# A plain request to a WebSocket endpoint is answered 426 (Upgrade Required) by the relay itself,
# so 426 means: DNS, the certificate, Caddy and the relay are all in place.
#
# ASKED UNTIL IT ANSWERS, for up to 30 seconds. The first deploy (25 September 2026) checked once,
# two seconds after the restart, and got 502: Caddy had asked before the relay was listening. The
# relay was fine; the check was early. A 502 that lasts 30 seconds is not early.
STATUS=000
for _ in $(seq 1 30); do
  STATUS="$(curl -s -o /dev/null -w '%{http_code}' "https://${HOST_NAME}/relay")"
  [[ "$STATUS" == "426" ]] && break
  sleep 1
done
if [[ "$STATUS" != "426" ]]; then
  echo "expected 426 from https://${HOST_NAME}/relay, got ${STATUS} for 30 seconds" >&2
  exit 1
fi
echo "deployed ${VERSION}: https://${HOST_NAME}/relay answers ${STATUS}"
