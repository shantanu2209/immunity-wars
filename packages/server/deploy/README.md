# Deploying the relay (P3.5), and the app beside it (P3.6)

The relay runs on a Google Cloud `e2-micro` in Mumbai (paid, about ₹1,000 a month once the trial
credit expires), behind Caddy, at
`wss://immunity-wars.kartikchaudhary.com/relay`. Why Google, what it costs, and why not Oracle, whose
sign-up refused us: [`docs/for-P3.md`](../../../docs/for-P3.md) §5 and
[`docs/PHASE3_BRIEF.md`](../../../docs/PHASE3_BRIEF.md) §6.

**Nothing on the server needs keeping.** Rooms live in memory by design, so a server that is lost or
broken is rebuilt from the steps below, not restored. Nothing in `setup.sh` is Google's: the same
steps work on any Ubuntu server from 24.04 on, which is what keeps the right to move real.

There are two kinds of step. **Shantanu's**, because they need his identity, his card, his domain or
his passphrase, which nobody else may handle. **Claude's**, over SSH from the development PC, each
one asked for before it runs.

---

## Shantanu's steps

Google's and Squarespace's screens change their labels from time to time; if a name below does not
match exactly, the nearest one is the right one, and Claude can follow along on screen.

### 1. The Google Cloud account

1. Sign in to the Google Cloud console with your own Google account and start the free trial. It
   asks for a card; the trial's $300 credit pays for the Mumbai server for the first 90 days.
2. Create a project, for example `immunity-wars`.
3. **Before the 90-day trial ends, upgrade the billing account to a paid account** (Billing, then
   "Activate full account" or "Upgrade"). If it is not upgraded, Google stops the server when the
   trial ends. Once upgraded, only use beyond the free amounts is charged.
4. Create a **budget alert** (Billing, then Budgets and alerts): a monthly budget a little above the
   expected cost, say $15, with alerts sent to your email. The server is expected to cost about $12
   a month; anything well beyond that is a mistake you hear about the same day.

### 2. The key on this PC

In **your own PowerShell window** (not through Claude), once:

```powershell
New-Item -ItemType Directory -Force $HOME\.ssh
ssh-keygen -t ed25519 -f $HOME\.ssh\immunity-wars-relay -C deploy
```

The first line makes the folder keys live in; on a PC that has never had a key it does not exist,
and without it the second line fails with "Saving key … failed: No such file or directory".

It asks for a passphrase. Choose one and keep it to yourself. The `-C deploy` at the end becomes the
name you log in to the server with. Then, once, in a PowerShell window opened with **Run as
administrator**, so the Windows key agent starts with the PC:

```powershell
Get-Service ssh-agent | Set-Service -StartupType Automatic; Start-Service ssh-agent
```

And at the start of any session in which Claude should reach the server, in your own window:

```powershell
ssh-add $HOME\.ssh\immunity-wars-relay
```

That unlocks the key in the agent. Claude's scripts use it through the agent and never see the
passphrase. What you give Google in the next step is the **public** half, the file
`immunity-wars-relay.pub` in the same folder; the other file never leaves this PC.

*If you already made a key with the earlier (Oracle) version of this guide, keep it: the file is
`immunity-wars-oracle` and its login name is `immunity-wars-relay`. Tell Claude which you have.*

### 3. The server

In the console: Compute Engine, VM instances, **Create instance**. It may ask to enable the Compute
Engine API first; say yes.

| Setting | Value |
|---|---|
| Name | `immunity-wars-relay` |
| Region | **`asia-south1` (Mumbai)**, any zone. Ruled for its lag (34 ms from here, against 242 ms to Oregon); it is not in the free tier |
| Machine | Series E2, type **`e2-micro`** |
| Boot disk | Change it: **Ubuntu 26.04 LTS or 24.04 LTS** (x86/64), disk type **Standard persistent disk**, 30 GB or less. The relay's server runs 26.04 |
| Data protection | **No backups and no snapshot schedule.** Snapshots are charged, and nothing on this server needs keeping |
| Observability | **Do not install the Ops Agent** |
| Firewall | Tick **Allow HTTP traffic** and **Allow HTTPS traffic** |
| Security, then SSH keys | Add an item and paste the whole contents of the `.pub` file |
| Networking | The defaults, with an ephemeral external IPv4 address |

**Settings that cost more if they are missed:** the boot disk should be **Standard**, the cheapest,
and backups must be off. *(In Mumbai nothing is free: the server, disk, public address and data are
all charged, about $12 a month, paid by the trial credit until it expires 90 days after sign-up,
whether or not the account is upgraded.)*

**The monthly estimate beside the form** is the list price, and in Mumbai the list price is what is
paid (in Oregon it would have been covered by the free tier, which the estimate never subtracts). It
does not include the public address, about $3.65 a month, or data. To see the real cost, a day after
creating the server: Billing, Reports, grouped by SKU, **costs before credits** (the trial's credits
hide everything else).

After it is created, tell Claude its **External IP**.

**Restart it if you ever need to, but do not Stop it.** Stopping gives up its public address, and a new
one means changing the DNS record in step 4.

### 4. The DNS record at Squarespace

In Squarespace: Domains, `kartikchaudhary.com`, **DNS** (DNS Settings), then under **Custom records**,
add one record:

| Host | Type | Data |
|---|---|---|
| `immunity-wars` | A | the server's External IP |

Nothing else changes: the competitions dashboard's records are left exactly as they are.

---

## Claude's steps

With the key unlocked (step 2), from the development PC, as `deploy@<ip>` (or the login name of the
key you have):

1. **Set the server up**: copy `setup.sh` there and run it once.

   ```bash
   scp packages/server/deploy/setup.sh deploy@<ip>:/tmp/
   ssh deploy@<ip> "sudo bash /tmp/setup.sh immunity-wars.kartikchaudhary.com"
   ```

   It sets India time, adds a 1 GB swap file, installs Node and Caddy from their signed
   repositories, turns on automatic security updates with a restart at 03:30 IST only when one
   needs it, creates the `relay` user and service, puts Caddy in front with no access log, and opens
   ports 80 and 443. Every step checks before it changes anything, so running it twice is safe.

2. **Deploy**:

   ```bash
   SERVER=deploy@<ip> HOST_NAME=immunity-wars.kartikchaudhary.com bash packages/server/deploy/deploy.sh
   ```

   It runs the relay's tests, including the one that plays against the bundle itself, builds the
   bundle, installs it as a new version, restarts the relay **only if nobody is connected**, and
   checks that `https://immunity-wars.kartikchaudhary.com/relay` answers.

3. **Measure, for Gate B**: the lag from a phone, the relay's time per action on the server itself,
   the data a game uses, and Google's free allowance re-read that day.

4. **The app** (P3.6, ruled 25 September 2026: served from this server, beside the relay, at
   `https://immunity-wars.kartikchaudhary.com/`). Needs `setup.sh` from P3.6 or later on the server
   (step 1 again), which serves it; then:

   ```bash
   SERVER=deploy@<ip> HOST_NAME=immunity-wars.kartikchaudhary.com bash packages/server/deploy/deploy-app.sh
   ```

   It builds the app as players get it and **refuses a build that does not talk to this server's
   relay** (one made for the Gate 1 audit talks to a relay on the development PC), installs it as a
   new version, and checks the page served is this build's. Nothing restarts, and no game in
   progress is touched.

5. **The version check, for P3.6 only** (ruled the same day): a build that claims the protocol
   version before the current one, at `https://immunity-wars.kartikchaudhary.com/old/`, to be
   opened in a **private tab** and refused with the words *"Update the app"*. Put it for the check,
   and take it away after:

   ```bash
   SERVER=deploy@<ip> HOST_NAME=immunity-wars.kartikchaudhary.com bash packages/server/deploy/old-build.sh put
   SERVER=deploy@<ip> HOST_NAME=immunity-wars.kartikchaudhary.com bash packages/server/deploy/old-build.sh remove
   ```

## Going back a version

The last three versions of each are kept on the server. To return to the one before:

```bash
ssh deploy@<ip> "ls /opt/immunity-wars/relay"
ssh deploy@<ip> "sudo ln -sfn /opt/immunity-wars/relay/<version> /opt/immunity-wars/relay/current && sudo systemctl restart immunity-wars-relay"
ssh deploy@<ip> "ls /opt/immunity-wars/app"
ssh deploy@<ip> "sudo ln -sfn /opt/immunity-wars/app/<version> /opt/immunity-wars/app/current"
```

## Rebuilding a lost server

Step 3 again, then step 4 with the new address, then Claude's steps 1 and 2. Nothing is restored,
because nothing needed keeping.
