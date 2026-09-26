#!/usr/bin/env bash
# PUTS THE APP ON THE SERVER (P3.6; ruled 25 September 2026: the built web app is served from the
# relay's own server, beside the relay, so that two phones on two networks can open it). Run on the
# development PC, from the repository root:
#
#   SERVER=deploy@<server address> HOST_NAME=<the relay's hostname> bash packages/server/deploy/deploy-app.sh
#
# 1. Builds the app as players get it, and REFUSES a build that does not talk to this server's own
#    relay. A build made for the Gate 1 audit talks to a relay on the development PC; shipped, it
#    would reach no relay at all, and nothing else would notice until a player did. It also REFUSES
#    a build that does not start (FINDINGS #92): opened in headless Chrome, the title must appear
#    with no uncaught error. Every other check here passed a blank app.
# 2. Copies it to the server into a new version folder and points `current` at it. The last three
#    versions are kept; going back is pointing `current` at the one before. Nothing restarts: Caddy
#    serves the files as they are, and no game in progress is touched.
# 3. Checks, over the internet, that the page served is this build's and the service worker is there.
#
# The build is deployed exactly as the audit measures it, the development page (`dev.html`) with it:
# the service worker precaches it, and leaving it out would stop the app installing for offline play.
set -euo pipefail

SERVER="${SERVER:?set SERVER=deploy@<server address>}"
HOST_NAME="${HOST_NAME:?set HOST_NAME=<the relay hostname>}"
WIN_SSH=/c/Windows/System32/OpenSSH
if [[ -x "$WIN_SSH/ssh.exe" ]]; then
  SSH="$WIN_SSH/ssh.exe"
  SCP="$WIN_SSH/scp.exe"
else
  SSH=ssh
  SCP=scp
fi

echo "== the app, built as players get it"
# A relay named for the audit must not leak into this build from the environment.
unset VITE_RELAY_URL
pnpm --filter @immunity-wars/app build:web
DIST=packages/app/dist
MAIN="$(ls "$DIST"/assets/main-*.js)"
if ! grep -q "wss://${HOST_NAME}/relay" "$MAIN"; then
  echo "REFUSED: the build does not talk to wss://${HOST_NAME}/relay" >&2
  exit 1
fi
if grep -qE "wss?://(127\.0\.0\.1|localhost)" "$MAIN"; then
  echo "REFUSED: the build names a relay on a development machine" >&2
  exit 1
fi
if ! pnpm -s start:check "$DIST"; then
  echo "REFUSED: the build does not start" >&2
  exit 1
fi

VERSION="$(date +%Y%m%d-%H%M%S)-$(git rev-parse --short HEAD)"
if [[ -n "$(git status --porcelain)" ]]; then VERSION="${VERSION}-dirty"; fi
TARBALL="app-${VERSION}.tgz"
tar -C "$DIST" -czf "$TARBALL" .

echo "== copy to the server as version ${VERSION}"
"$SCP" "$TARBALL" "${SERVER}:/tmp/"
rm -f "$TARBALL"
"$SSH" "$SERVER" "sudo install -d -m 0755 /opt/immunity-wars/app/${VERSION} &&
  sudo tar -xzf /tmp/${TARBALL} -C /opt/immunity-wars/app/${VERSION} --no-same-owner &&
  sudo chmod -R u=rwX,go=rX /opt/immunity-wars/app/${VERSION} &&
  rm -f /tmp/${TARBALL} &&
  sudo ln -sfn /opt/immunity-wars/app/${VERSION} /opt/immunity-wars/app/current"

echo "== keep the last three versions"
"$SSH" "$SERVER" "cd /opt/immunity-wars/app && ls -1d 20*/ | sort | head -n -3 | xargs -r sudo rm -rf"

echo "== served, from here"
ASSET="$(basename "$MAIN")"
if ! curl -fsS "https://${HOST_NAME}/" | grep -q "$ASSET"; then
  echo "https://${HOST_NAME}/ does not serve this build (${ASSET})" >&2
  exit 1
fi
SW="$(curl -fsSI "https://${HOST_NAME}/sw.js" | tr -d '\r' | grep -i '^cache-control:' || true)"
if [[ "$SW" != *no-cache* ]]; then
  echo "https://${HOST_NAME}/sw.js is not served with Cache-Control: no-cache (got '${SW}')" >&2
  exit 1
fi
echo "deployed ${VERSION}: https://${HOST_NAME}/ serves ${ASSET}"
