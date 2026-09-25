# P3.6 — the session on two phones

**What it is for:** Gate A of [`PHASE3_BRIEF.md`](PHASE3_BRIEF.md) §1, verified on two real devices
on two networks, as §8 asks. Everything here has passed in headless browsers on the development
PC ([`for-P3.md`](for-P3.md) §6); this is where it meets real phones, real networks, and real hands.

**Who and how long:** two people, two phones, about an hour for a game on Training played to its
end, plus the optional last step (11 minutes of waiting). Note what each step shows; a photo of
anything that looks wrong is worth more than a description of it.

## Before

Claude, with Shantanu's go-ahead:

- the app deployed at **https://immunity-wars.kartikchaudhary.com/**, beside the relay;
- the version-check build at **https://immunity-wars.kartikchaudhary.com/old/**, for step 10 only,
  taken away after the session.

On the day:

- **Phone A on home Wi-Fi. Phone B on mobile data, with its Wi-Fi turned off.** Two networks is the
  point: a phone on the same Wi-Fi would test less.
- Both open **https://immunity-wars.kartikchaudhary.com/** in Chrome. Write down each phone's model
  and Android version.

## The session

Phone A is the captain unless a step says otherwise.

| # | Do | Expect | Gate A |
|---|---|---|---|
| 1 | A: **Play together**, a name, **Create a room**. **Share the code** to B by WhatsApp. B: **Play together**, a name, the code, **Join**. | Both in the lobby, both names listed, A marked captain. | two devices, different networks, one room by code |
| 2 | Take seats: A the Monocyte, Neutrophil and B-Cell; B the rest of the cells. A: **Training**, **Start the game**. | Both reach the game; the goal says *Together you command…* | |
| 3 | Turn 1. A: *Plan your turn*, *Command your cells*, give B **3** points with +1, **Confirm the plan**. | B's bar shows **AP 3**, A's the rest. On B, A's Monocyte says *(A's name) plays this piece.* and offers nothing. B's bottom button says who they wait for. | |
| 4 | Play two or three turns normally. | Both screens agree after every move; the spread plays on both. | every action once, one order, every view agrees |
| 5 | B: **aeroplane mode** for about a minute, then off. | Within about 40 seconds A sees *(B's name) is away.* (the relay notices a silent phone by its missed pings). B shows *The connection to the game was lost* as soon as its browser notices, which is for this step to measure, and nothing rejoins by itself. B: **Reconnect**. B's seats are back. | drop and rejoin, seats back |
| 6 | B: **swipe Chrome away** entirely, then open the link again. | The title offers **Rejoin room ……**. B types the name again and is back in the game, seats and all. | rejoin after the app closes |
| 7 | A (the captain): **aeroplane mode**, and leave it on for a minute. | Both screens (A's when it returns) agree that **B is the captain now**. B's buttons are the captain's. A turns aeroplane mode off, **Reconnect**: A is back, and **not** captain (ruled). | the captain drops; a new captain, deterministically, agreed |
| 8 | A: menu, **Back to the title**, and stay away. B (captain now): **the Table** (people icon, top right). | B sees A's pieces waiting, with *Give to (B's name)*. B gives them, and B's screen says *You now play …* for each. A rejoins from the title: A holds no pieces now, and A's Table shows that B plays them. | a player who does not come back does not block the table; the choice is visible to everyone |
| 9 | Play on to the end: a win, or the body falls. | **Both** reach the Result, which offers *Play together again*. | a full game to a Result |
| 10 | On either phone, in a **private (incognito) tab**: **https://immunity-wars.kartikchaudhary.com/old/**, *Play together*, a name, *Create a room*. | Refused: *This app and the game server are on different versions. Update the app, then try again.* No lobby. | an old client is refused with a message a player can act on |
| 11 | Turn **aeroplane mode on**, open the app from the tab or the home screen, **New game**, play a turn. | Single player works with no network at all. | single player unchanged, offline |
| 12 | *Optional, 11 minutes.* Both in a new room; both swipe Chrome away. Wait **11 minutes**, then reopen and **Rejoin**. | *No room has that code.* (or *That game has ended.*), and the title stops offering it. | the last player leaving; a room discarded after the grace period cannot be rejoined |

## What is not on this list, and why

- **"Every client's view agrees … asserted by a check, not by watching":** the check is automated,
  over real sockets (`packages/server/src/relay.test.ts`, and the room's own tests). Step 4 is the
  watching, which the brief says is not enough on its own, and does not claim to be.
- **The 20 deferred coverage arms:** engine branches covered by automated tests, not on a phone.
- **Gate B, the cost:** read from Google's billing report by SKU, after the session, with the relay's
  own numbers from the server.

## After

Claude takes `/old/` away, reads the relay's side of the session from the server, and records
the result, item by item, in [`for-P3.md`](for-P3.md).
