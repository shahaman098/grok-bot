# Live demo walkthrough — tap by tap

Companion to [DEMO-SCRIPT.md](DEMO-SCRIPT.md) (the story). This is the **exact sequence of taps, screens and lines** for the 3-minute slot. Everything below uses text that is currently on screen. Rehearse it twice on the real devices before 22:20.

## Cast and kit

| Role | Device | Signed in as |
| --- | --- | --- |
| **Presenter** (talks, drives the laptop) | Laptop on the projector, plus **Phone A** in hand | Phone A = guest, offers **Build apps**, looking for **Design** |
| **Partner** (a real attendee, ideally a designer) | **Phone B** | Phone B = guest, offers **Design**, looking for **Build apps** |

- Both phones: real mobile browsers, **not** two tabs. Preview mode only syncs tabs in one browser, so it can't stand in for two phones.
- Laptop: browser logged into nothing. The stage page is public once both people approve.
- Brightness up, auto-lock off, Do Not Disturb on, Wi-Fi **and** a phone hotspot as a backup network.
- Guests appear as **“Guest XXXX”** (LinkedIn sign-in isn't configured). Say so up front; don't hide it. Both phones will have different Guest codes, so tell the room which is which.

## Links

- Event: `https://bumpin-silk.vercel.app/e/grok-bot-london`
- QR page (show on laptop): `https://bumpin-silk.vercel.app/qr`
- Backup: a screen recording of the full run on the laptop desktop, clearly labelled **“backup recording”**.

## Pre-flight (do all of this before you walk up)

**T-30 min**
1. Open the event URL on both phones. If either already shows “You're in the room”, tap the **Leave** icon (top right) then **Leave event** so you start from the join screen.
2. Laptop: open `/qr` full-screen. Confirm the QR renders (it's generated locally, no internet dependency).
3. Laptop: open a second tab on the event URL and **leave it on the join screen**. Don't join from the laptop.
4. Run `curl -s https://bumpin-silk.vercel.app/e/grok-bot-london | grep -o "<title>[^<]*"`. Expect `BumpIn — Love at First Bot`.

**T-5 min**
5. Partner and Presenter stand next to each other so the room can see both phones if you hold them up.
6. Close every other tab and app on the laptop. Notifications off.
7. Both phones on the join screen, **not yet joined**. The first tap of the demo is the join.

## The run (3:00)

Timings are targets. If you're behind, drop the optional personal joke (step 6), never the two-yeses moment.

### 0:00 – 0:20 · The problem
- **Screen:** laptop on `/qr` (“Find your people.” + QR).
- **Say:** “Developers need designers. Designers need developers. They spend the whole evening asking where the pizza is. This is Love at First Bot, built on BumpIn, for Track 2, Know Your Members.”
- **Say, one line on honesty:** “Profiles are self-declared and opt-in. Nobody's location is collected or shared, and there's no scraping.”

### 0:20 – 0:50 · Two people join, no forms
1. **Phone A:** scan the QR, or open the event URL. Screen: *“Your people. One hello away.”*
2. **Tap the lime “Continue as guest →” button.** (The LinkedIn button underneath is greyed: “LinkedIn is being set up. Guest entry is ready.” Say that out loud.)
3. **Phone B:** same, **Continue as guest**.
4. **Phone A shows:** “YOU'RE IN THE ROOM”, the event name, **Visible** pill, People list. The header should read **1 on map** within a few seconds (each phone counts the other).
5. **Tap the Map tab on Phone A.** The venue marker plus both avatars appear around the venue.
- **Say:** “Joining puts you on the map automatically. Hide or leave any time. Markers are arranged around the venue, not at anyone's real position. **Locate me** is optional, and your dot is private to you.”
- **If a phone doesn't appear:** pull to refresh by reloading the page; membership persists.

### 0:50 – 1:25 · Evidence, then an invitation
1. **Phone A:** tap **Introductions** (sparkle, far right of the bottom bar).
2. Sheet “Love at First Bot” opens on the profile editor. Under **I can help with**, tap **Build apps**. Under **I'm looking for**, tap **Design**. Tap **Save matchmaking profile**.
3. **Phone B:** **Introductions** → **I can help with: Design**, **I'm looking for: Build apps** → **Save matchmaking profile**. (Do this in parallel while the Presenter narrates.)
4. **Phone A:** tap **Find my collaborator**. The result shows Phone B's Guest name with the **exact profile excerpts** that matched, both directions (their offer ↔ your need, your offer ↔ their need).
5. Tap **Request introduction**. The Introductions list shows **Waiting for reply**.
- **Say:** “No compatibility percentage. Every suggestion shows the exact words from each profile that caused it.”
6. **Phone B:** the bottom-bar **Introductions** button now shows a red **1** badge. Open it: **Needs your reply**, with the same evidence. Tap **Let's connect**.

### 1:25 – 1:50 · Something useful happens
- **Both phones:** the card flips to **Connected** and shows “It's a match. Go say hello.”, an **opening line** and a **suggested ten-minute collaboration task**.
- **Presenter:** read the opener aloud, then ask Partner: “Is that actually relevant to you?” Take their real answer.
- **Say (careful):** “Accepting isn't proof they'll collaborate. It's a warm, explained starting point.”

### 1:50 – 2:35 · The show (both consent, exact preview)
1. **Both phones:** on the Connected card, tap **Take this match to the big screen**.
2. *(Optional, skip if short on time)* **Phone A:** pick one curated joke, for example “My superpower? Turning one good idea into 47 open tabs.”
3. Each phone shows the **exact stage preview** and “not approved · not approved”. **Phone A:** **Approve this exact stage preview**. **Phone B:** same. Status reads “approved · approved”.
4. **Phone A:** the **Open big-screen reveal →** link appears. Send that link to the laptop (AirDrop / Messages / copy-paste via Notes — **rehearse which**). Open it on the laptop.
5. **Laptop:** “Both people approved. Cue the dramatic pause.” Click **Reveal the match**.
- **Say:** “One useful introduction. Two yeses. Finally, a relationship with a next step.”

### 2:35 – 3:00 · Privacy and close
1. **Phone B:** reopen the card → **Revoke stage permission**.
2. **Laptop:** within a few seconds the stage clears (it re-checks every 2 s). Say: “Either person can pull it at any time.”
3. **Phone A:** the private introduction is still there; only the stage link stopped working.
- **Close:** “Less small talk. More shipping. It's MIT-licensed, open source, and another community can run it next week.” Only mention the repo URL if it has been published and you've opened it in a browser.

## What not to say
- Don't call anything “AI-matched” or quote a score. Matching is rules-based with visible evidence.
- Don't say LinkedIn import works: it's not configured. “Guest entry” only.
- Don't claim the Grok Bot connector or voice **Concierge** tab work unless you have just verified them end to end. Concierge is off by default; skip it.
- Don't say attendees “collaborated”. Say “were introduced”.
- Don't describe browser tabs as phones.

## If something breaks (decide in 5 seconds, narrate calmly)

| Symptom | Do this |
| --- | --- |
| Phone B doesn't show up / “0 on map” | Reload Phone B, tap **People** tab; membership is restored. Still nothing: switch Phone B to the hotspot. |
| “Find my collaborator” is disabled | Phone isn't **Visible**: tap the **Hidden** pill in the header so it reads **Visible**. |
| Request button errors | The red banner explains it; tap again. Pending state is kept after refresh. |
| Stage link won't open on the laptop | Type the path manually: `/e/grok-bot-london/show/<connection-id>` (the id is in the link), or play the **backup recording** from 1:50. |
| Map is blank or slow | Say “the map is a visual extra”, switch to **People**: matching doesn't depend on it. |
| Venue network dead | Phone hotspot for both phones and the laptop; if still dead, play the backup recording and narrate the same lines. |

## Rehearsal checklist (tick before 22:15)
- [ ] Run the full 3:00 twice with the real Partner and both real phones.
- [ ] Decided and tested the phone → laptop link transfer method.
- [ ] Both phones start from the **join screen**; Leave → **Leave event** resets them.
- [ ] Backup recording saved on the laptop desktop and plays with sound off.
- [ ] Hotspot tested with all three devices.
- [ ] Time check: you can reach “Reveal the match” by 2:15 without the optional joke.
