#!/usr/bin/env bash
# A BUILD ON AN OLDER PROTOCOL, for checking Gate A's version refusal on a real phone (P3.6; ruled
# 25 September 2026: "R2. a"). Gate A asks that a client on an old protocol version is refused with a
# message a player can act on, verified on real devices; the relay's tests already hold the refusal,
# and this is how a phone meets it. Run on the development PC, from the repository root:
#
#   SERVER=deploy@<address> HOST_NAME=<hostname> bash packages/server/deploy/old-build.sh put
#   SERVER=deploy@<address> HOST_NAME=<hostname> bash packages/server/deploy/old-build.sh remove
#   bash packages/server/deploy/old-build.sh build        (builds it into packages/app/dist-old only)
#
# `put` builds the app from HEAD in a temporary worktree, so the working copy is never patched,
# with two changes and nothing else: it claims the protocol version BEFORE the current one, and it
# registers no service worker, so it cannot take the place of the real app on a phone. It is built
# to live under /old/ and copied to the server's /old/ slot (setup.sh), and checked there.
#
# Opened in a PRIVATE tab at https://<hostname>/old/, joining or creating a room must be refused
# with the words "This app and the game server are on different versions. Update the app, then try
# again." A private tab, because the real app's service worker answers every page under / in a tab
# that has the app, /old/ included.
#
# `remove` deletes it, and /old/ answers 404 again. It is for the check, not for keeping.
set -euo pipefail

ACTION="${1:?usage: old-build.sh put|remove|build}"
WIN_SSH=/c/Windows/System32/OpenSSH
if [[ -x "$WIN_SSH/ssh.exe" ]]; then
  SSH="$WIN_SSH/ssh.exe"
  SCP="$WIN_SSH/scp.exe"
else
  SSH=ssh
  SCP=scp
fi

if [[ "$ACTION" == "remove" ]]; then
  SERVER="${SERVER:?set SERVER=deploy@<server address>}"
  HOST_NAME="${HOST_NAME:?set HOST_NAME=<the relay hostname>}"
  "$SSH" "$SERVER" "sudo rm -rf /opt/immunity-wars/app/old"
  STATUS="$(curl -s -o /dev/null -w '%{http_code}' "https://${HOST_NAME}/old/")"
  echo "removed: https://${HOST_NAME}/old/ answers ${STATUS}"
  [[ "$STATUS" == "404" ]]
  exit $?
fi

ROOT="$(pwd)"
WT="$(mktemp -d)/iw-old"
# Git on Windows can fail to delete a worktree whose paths are too long (node_modules), and then
# leaves its folder behind, unregistered: a quarter of a gigabyte, found on 25 September 2026. So the
# folder is removed by rm, which can, and the record pruned.
cleanup() {
  git -C "$ROOT" worktree remove --force "$WT" >/dev/null 2>&1 || true
  rm -rf "$(dirname "$WT")"
  git -C "$ROOT" worktree prune
}
trap cleanup EXIT

echo "== a worktree of HEAD, so the working copy is never patched"
git worktree add --detach "$WT" HEAD >/dev/null

echo "== claim the protocol version before this one, and register no service worker"
VOCAB="$WT/packages/protocol/src/vocabulary.ts"
CURRENT="$(sed -n 's/^export const PROTOCOL_VERSION = \([0-9]*\);$/\1/p' "$VOCAB")"
[[ -n "$CURRENT" && "$CURRENT" -gt 1 ]] || { echo "could not read PROTOCOL_VERSION" >&2; exit 1; }
OLD=$((CURRENT - 1))
sed -i "s/^export const PROTOCOL_VERSION = ${CURRENT};$/export const PROTOCOL_VERSION = ${OLD};/" "$VOCAB"
grep -q "^export const PROTOCOL_VERSION = ${OLD};$" "$VOCAB" || { echo "the version was not changed" >&2; exit 1; }
SHELL_SRC="$WT/packages/app/src/main.tsx"
sed -i 's/^startServiceWorker(import\.meta\.env\.PROD);$/startServiceWorker(false);/' "$SHELL_SRC"
grep -q '^startServiceWorker(false);$' "$SHELL_SRC" || { echo "the service worker was not turned off" >&2; exit 1; }

echo "== build it for /old/, talking to the deployed relay (the build's default)"
(
  cd "$WT"
  unset VITE_RELAY_URL
  pnpm install --offline --frozen-lockfile >/dev/null
  # MSYS_NO_PATHCONV: Git Bash on Windows rewrites an argument that starts with / into a Windows
  # path, and did: the first build of this script loaded its code from /Git/old/assets/.
  MSYS_NO_PATHCONV=1 pnpm --filter @immunity-wars/app exec vite build --base /old/ --outDir dist-old >/dev/null
)
rm -rf "$ROOT/packages/app/dist-old"
cp -r "$WT/packages/app/dist-old" "$ROOT/packages/app/dist-old"
grep -q 'src="/old/assets/' "$ROOT/packages/app/dist-old/index.html" || { echo 'the build does not load from /old/' >&2; exit 1; }
# It must START, served at /old/ (FINDINGS #92: the first /old/ of the P3.6 session was built from a
# main whose React was split, and would have been a blank page where the refusal should be).
MSYS_NO_PATHCONV=1 pnpm -s start:check packages/app/dist-old /old/ || { echo 'the build does not start' >&2; exit 1; }
echo "built: protocol version ${OLD} (the relay speaks ${CURRENT}), in packages/app/dist-old"
[[ "$ACTION" == "build" ]] && exit 0

SERVER="${SERVER:?set SERVER=deploy@<server address>}"
HOST_NAME="${HOST_NAME:?set HOST_NAME=<the relay hostname>}"
TARBALL="app-old.tgz"
tar -C "$ROOT/packages/app/dist-old" -czf "$TARBALL" .
"$SCP" "$TARBALL" "${SERVER}:/tmp/"
rm -f "$TARBALL"
"$SSH" "$SERVER" "sudo rm -rf /opt/immunity-wars/app/old &&
  sudo install -d -m 0755 /opt/immunity-wars/app/old &&
  sudo tar -xzf /tmp/${TARBALL} -C /opt/immunity-wars/app/old --no-same-owner &&
  sudo chmod -R u=rwX,go=rX /opt/immunity-wars/app/old &&
  rm -f /tmp/${TARBALL}"
if ! curl -fsS "https://${HOST_NAME}/old/" | grep -q '/old/assets/'; then
  echo "https://${HOST_NAME}/old/ does not serve the old build" >&2
  exit 1
fi
echo "in place: https://${HOST_NAME}/old/ (open it in a private tab); 'remove' takes it away"
