# Deploying the relay (P3.5)

The relay runs on Google Cloud's free server (one `e2-micro`) in Oregon, behind Caddy, at
`wss://immunity-wars.kartikchaudhary.com/relay`. Why Google, what it costs, and why not Oracle, whose
sign-up refused us: [`docs/for-P3.md`](../../../docs/for-P3.md) §5 and
[`docs/PHASE3_BRIEF.md`](../../../docs/PHASE3_BRIEF.md) §6.

**Nothing on the server needs keeping.** Rooms live in memory by design, so a server that is lost or
broken is rebuilt from the steps below, not restored. Nothing in `setup.sh` is Google's: the same
steps work on any Ubuntu 24.04 server, which is what keeps the right to move real.

There are two kinds of step. **Shantanu's**, because they need his identity, his card, his domain or
his passphrase, which nobody else may handle. **Claude's**, over SSH from the development PC, each
one asked for before it runs.

---

## Shantanu's steps

Google's and Squarespace's screens change their labels from time to time; if a name below does not
match exactly, the nearest one is the right one, and Claude can follow along on screen.

### 1. The Google Cloud account

1. Sign in to the Google Cloud console with your own Google account and start the free trial. It
   asks for a card; the trial does not charge it.
2. Create a project, for example `immunity-wars`.
3. **Before the 90-day trial ends, upgrade the billing account to a paid account** (Billing, then
   "Activate full account" or "Upgrade"). If it is not upgraded, Google stops the server when the
   trial ends. Once upgraded, only use beyond the free amounts is charged.
4. Create a **budget alert** (Billing, then Budgets and alerts): a monthly budget of a small amount,
   with alerts sent to your email. The one thing expected to cost anything is data beyond the free
   1 GB a month, a few paise a game; anything else on the bill is a mistake you hear about the same
   day.

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
| Region | **`us-west1` (Oregon)**, any zone. Only Oregon, Iowa and South Carolina are free; Oregon measured fastest from here |
| Machine | Series E2, type **`e2-micro`** |
| Boot disk | Change it: **Ubuntu 24.04 LTS** (x86/64), disk type **Standard persistent disk**, 30 GB or less |
| Data protection | **No backups and no snapshot schedule.** Snapshots are charged, and nothing on this server needs keeping |
| Observability | **Do not install the Ops Agent** |
| Firewall | Tick **Allow HTTP traffic** and **Allow HTTPS traffic** |
| Security, then SSH keys | Add an item and paste the whole contents of the `.pub` file |
| Networking | The defaults, with an ephemeral external IPv4 address |

**Settings that cost money if they are missed:** the boot disk must be **Standard** (the default,
"Balanced", is charged), the region must be one of the three free ones, and backups must be off.

**The monthly estimate beside the form does not subtract the free tier.** It showed $7.11 on 25
September 2026: $6.11 for the `e2-micro`, which is exactly what the free tier covers, and $1.00 for
the default Balanced disk, which it does not. With the settings above, the free usage appears on the
bill with a matching free-tier discount. To check that it does, a day after creating the server: Billing,
Reports, grouped by SKU, **costs before credits** (the trial's credits hide everything else). One
line is not confirmed free on Google's own pages: the public IP address, which costs $0.005 an hour
(about $3.65 a month) on servers outside the free tier. That report is where it will show.

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

## Going back a version

The last three versions are kept on the server. To return to the one before:

```bash
ssh deploy@<ip> "ls /opt/immunity-wars/relay"
ssh deploy@<ip> "sudo ln -sfn /opt/immunity-wars/relay/<version> /opt/immunity-wars/relay/current && sudo systemctl restart immunity-wars-relay"
```

## Rebuilding a lost server

Step 3 again, then step 4 with the new address, then Claude's steps 1 and 2. Nothing is restored,
because nothing needed keeping.
