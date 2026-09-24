# Deploying the relay (P3.5)

The relay runs on one Oracle Cloud Always Free server in Mumbai, behind Caddy, at
`wss://immunity-wars.kartikchaudhary.com/relay`. Why Oracle, and what it costs to own a server:
[`docs/for-P3.md`](../../../docs/for-P3.md) §5 and [`docs/PHASE3_BRIEF.md`](../../../docs/PHASE3_BRIEF.md) §6.

**Nothing on the server needs keeping.** Rooms live in memory by design, so a server that is lost,
reclaimed or broken is rebuilt from the steps below, not restored.

There are two kinds of step. **Shantanu's**, because they need his identity, his card, his domain or
his passphrase, which nobody else may handle. **Claude's**, over SSH from the development PC, each
one asked for before it runs.

---

## Shantanu's steps

Oracle's and Squarespace's screens change their labels from time to time; if a name below does not
match exactly, the nearest one is the right one, and Claude can follow along on screen.

### 1. The Oracle account

1. Sign up for Oracle Cloud Free Tier. It asks for a phone number and a credit card, which is not
   charged.
2. **Home region: India West (Mumbai).** This is chosen once and cannot be changed later, and free
   servers can only be created there.
3. Once the account is active, upgrade it to **Pay As You Go** (Billing, then "Upgrade and manage
   payment"). You are charged only for use beyond the Always Free limits, and it keeps the free
   server from being reclaimed as idle.
4. Create a **budget alert** (Billing, then Budgets): a monthly budget with an alert at the smallest
   amount it accepts, sent to your email. Any charge at all is then a mistake you hear about the
   same day.

### 2. The key on this PC

In **your own PowerShell window** (not through Claude), once:

```powershell
ssh-keygen -t ed25519 -f $HOME\.ssh\immunity-wars-oracle -C immunity-wars-relay
```

It asks for a passphrase. Choose one and keep it to yourself. Then, once, in a PowerShell window
opened with **Run as administrator**, so the Windows key agent starts with the PC:

```powershell
Get-Service ssh-agent | Set-Service -StartupType Automatic; Start-Service ssh-agent
```

And at the start of any session in which Claude should reach the server, in your own window:

```powershell
ssh-add $HOME\.ssh\immunity-wars-oracle
```

That unlocks the key in the agent. Claude's scripts use it through the agent and never see the
passphrase. The file to give Oracle in the next step is the **public** half,
`immunity-wars-oracle.pub` in the same folder; the other file never leaves this PC.

### 3. The server

In Oracle's console: Compute, Instances, **Create instance**.

| Setting | Value |
|---|---|
| Name | `immunity-wars-relay` |
| Image | Canonical Ubuntu 24.04 |
| Shape | Ampere, `VM.Standard.A1.Flex`, **1 OCPU and 6 GB**. The other half of the free allowance is kept for the second server (ruling 3) |
| If Ampere says "out of capacity" | `VM.Standard.E2.1.Micro` (marked Always Free-eligible) is enough for the relay |
| Networking | A new virtual cloud network with a public subnet, and **assign a public IPv4 address** |
| SSH keys | Paste or upload `immunity-wars-oracle.pub` |
| Boot volume | The default |

Then open the web ports in the cloud's own firewall. From the instance page: its subnet, then the
**Default Security List**, then **Add Ingress Rules**, twice:

| Source CIDR | IP protocol | Destination port |
|---|---|---|
| `0.0.0.0/0` | TCP | 80 |
| `0.0.0.0/0` | TCP | 443 |

Then tell Claude the server's **public IP address**.

### 4. The DNS record at Squarespace

In Squarespace: Domains, `kartikchaudhary.com`, **DNS** (DNS Settings), then under **Custom records**,
add one record:

| Host | Type | Data |
|---|---|---|
| `immunity-wars` | A | the server's public IP address |

Nothing else changes: the competitions dashboard's records are left exactly as they are.

---

## Claude's steps

With the key unlocked (step 2), from the development PC:

1. **Set the server up**: copy `setup.sh` there and run it once.

   ```bash
   scp packages/server/deploy/setup.sh ubuntu@<ip>:/tmp/
   ssh ubuntu@<ip> "sudo bash /tmp/setup.sh immunity-wars.kartikchaudhary.com"
   ```

   It sets India time, installs Node and Caddy from their signed repositories, turns on automatic
   security updates with a restart at 03:30 IST only when one needs it, creates the `relay` user and
   service, puts Caddy in front with no access log, and opens ports 80 and 443 in the server's own
   firewall. Every step checks before it changes anything, so running it twice is safe.

2. **Deploy**:

   ```bash
   SERVER=ubuntu@<ip> HOST_NAME=immunity-wars.kartikchaudhary.com bash packages/server/deploy/deploy.sh
   ```

   It runs the relay's tests, including the one that plays against the bundle itself, builds the
   bundle, installs it as a new version, restarts the relay **only if nobody is connected**, and
   checks that `https://immunity-wars.kartikchaudhary.com/relay` answers.

3. **Measure, for Gate B**: the lag from a phone in India, the relay's time per action on the server
   itself, the data a game uses, and Oracle's free allowance re-read that day.

## Going back a version

The last three versions are kept on the server. To return to the one before:

```bash
ssh ubuntu@<ip> "ls /opt/immunity-wars/relay"
ssh ubuntu@<ip> "sudo ln -sfn /opt/immunity-wars/relay/<version> /opt/immunity-wars/relay/current && sudo systemctl restart immunity-wars-relay"
```

## Rebuilding a lost server

Step 3 again, then step 4 with the new address, then Claude's steps 1 and 2. Nothing is restored,
because nothing needed keeping.
