# The Immunity Wars — running the multiplayer build

Everything below happens on **one laptop (the host)** plus **one or more phones**, all on the **same Wi-Fi**.

## One-time setup (host laptop)
1. Make sure **Node.js** is installed (v18+). Check with `node -v`.
2. In the project folder, install the two dependencies:
   ```
   npm install
   ```
   (This pulls `ws` and `qrcode`.)

## Start a game
1. On the host laptop, run:
   ```
   npm start
   ```
   (This runs `node server.js` for you — either command works, they're the same thing.)
   The terminal prints a URL like `http://192.168.1.20:3000`.
2. **On the host laptop**, open that URL (or `http://localhost:3000`) in a browser. You'll see a **Single player / Multiplayer** chooser (this only appears on the laptop):
   - Tap **Multiplayer** → this laptop becomes the **shared board** and shows a **QR code** to join. Put it on a TV if you have one.
   - (Tap **Single player** instead to play solo on the laptop — see below.)
3. **Phones (players):** point the camera at the QR code and open the link (it ends in `?join=1`). Each phone goes straight to **enter a name and colour → Join** — phones never see the mode chooser.
4. In the **lobby**, each player **claims** the cells / organ stations they'll control, and someone is made **captain** (★). **Only the captain** sees the **difficulty** buttons; everyone else sees "the captain chooses the difficulty." When all seats are claimed and difficulty is set, the **captain taps Start**.

## Playing (each turn)
- The **captain** drives the turn from their phone: **Draw the infection → Begin command**.
- **Allocation (situation room):** everyone sees the threat picture; the captain hands out Action Points per player; players can give some back; captain **Confirms**.
- **Command:** each player taps their cells on the right rail (or a pathogen / organ on the body) to open the zoomed panel and act, spending their own AP.
- The **captain** taps **End the turn** to resolve the spread.

## Single player (laptop, solo)
On the laptop's first screen tap **Single player** — this opens the full board with mouse control (`solo.html`). No phones or network needed. Difficulty is on that screen.

## Reporting a bug (the capture tool)
- **Multiplayer:** on the **table-display laptop**, tap the **📸** button (bottom-right), write what went wrong / what you expected, and **Save**. A JSON file lands in the `captures/` folder next to `server.js`. Upload that file to the chat.
- **Single player:** tap **📸 Capture** in the lab bar, type a description — the JSON downloads via the browser. Upload it to the chat.
Each capture holds the last 5 actions with the exact game state **before and after** each, plus your note — enough to see precisely what an action did versus what it should have done.

## If a phone can't connect
- Confirm it's on the **same Wi-Fi** as the laptop.
- Some networks block device-to-device traffic ("client isolation"). A phone hotspot that the laptop also joins is a reliable fallback.
- The exact URL/IP is the one printed by `node server.js` (not always `localhost`).

## Handy checks (host laptop, optional)
- `node parity_check.js` — confirms the two builds share one engine.
- `node e2e_server_test.js` — plays a networked turn against a throwaway server.
