# BumpIn: dramatic demo media and script

Prepared 22 October 2026. Assumes the existing three-minute demo slot.

Creative idea: **“Your next teammate is in this room. You just haven't met.”**

Acceptance criteria: specific source links; a recommended sequence; exact captions and spoken lines; a three-minute run of show; source-aware matching language; a short version if the slot changes.

## Clips and memes

Lengths below are suggested time ON SCREEN in our edit, not verified source timestamps. Sources were found through web search and page metadata; playback, exact in/out points and reuse permissions have not been verified. Movie and meme links are references, not a reuse licence.

| ID | Source | Suggested use | Caption | Selection |
| --- | --- | --- | --- | --- |
| A | [Crowded urban scene with blurred motion — Pexels / La Doncella Audiovisual](https://www.pexels.com/video/crowded-urban-scene-with-blurred-motion-31741796/) | 4 seconds of crowd footage, darkened slightly under large text. Establish the problem. This is city footage; don't present it as footage of this hackathon. | **“Your next teammate could be right here.”** | Recommended opener. Footage of our own event would fit even better. |
| B | [Confused Travolta — Tenor](https://tenor.com/view/confused-travolta-green-gif-7954354) | 3 seconds immediately after the crowd. Use the green-screen version over a room photo if convenient. Hard cut the dramatic music to silence. | **“Me trying to work out who's building AI agents.”** | Recommended meme. |
| C | [Mission: Impossible – Fallout: Manhunt through London's rooftops — Binge Society](https://www.youtube.com/watch?v=M9XZ07XlsEw) | 3 seconds of Ethan running, as an alternative opener. Choose a running shot rather than dialogue so the joke works muted. | **“Me trying to find a teammate before the deadline.”** | More chaotic alternative to A. London setting fits the event. |
| D | [Interstellar: Docking Scene — official Paramount Movies upload](https://www.youtube.com/watch?v=v2H1s9gj5DA) | 3 seconds of the docking attempt, then cut to an actual matching result already visible. Use as a punchline after the product has worked. | **“When you finally find someone building the same thing.”** | Recommended dramatic payoff. |
| E | [Mr Bean waiting — Tenor](https://tenor.com/view/mr-bean-waiting-still-waiting-gif-13052487) | 3 seconds as an alternative to B, before showing the app. | **“Waiting for someone to reply to ‘anyone need a teammate?’”** | Alternative meme. Don't put it over our loading state: that makes the app seem slow. |
| F | [Avengers: Endgame — Alan Silvestri's official film page, Video Clips: “Portals 4 - Assemble”](https://www.alansilvestri.com/filmography-marvels-avengers-endgame-92.htm) | 3-second team-assembly reaction, as an alternative to D after the second attendee appears. This link is a clip collection, not a direct standalone video. | **“The team after scanning one QR code.”** | Optional ensemble payoff. |

**Recommended cut: A → B → BumpIn reveal → live product → D → QR close.**

That uses 10 seconds of external footage across the whole three minutes. C replaces A, E replaces B, and F replaces D; keep the alternatives out of the main cut.

## Three-minute run of show

Stage roles: presenter narrates and controls the projected screen; teammate operates Phone B. Phone A is the main demo device. Times include interaction and audience reaction, so leave space between lines.

| Demo time | What the audience sees | Exact presenter line / audio |
| --- | --- | --- |
| 0:00–0:04 | A: crowd clip. Large caption: “Your next teammate could be right here.” | Low cinematic pulse. “Your next teammate could be in this room.” |
| 0:04–0:07 | B: Confused Travolta. Caption: “Me trying to work out who's building AI agents.” | Music cuts. Brief silence for the joke. |
| 0:07–0:18 | Black slide: “Same room. Missed connection.” Then BumpIn name. | “But you don't know their name, what they're building, or whether they're looking for you. That's the problem BumpIn solves.” |
| 0:18–0:30 | Show QR and the event page. | “Scan one QR code. Join the event. Tell people what you're building and who you'd like to meet.” |
| 0:30–0:55 | Phone A joins with prepared demo details and explicitly enables map visibility. | “I'll join as myself and choose to appear on the attendee map. Location sharing is optional. I can join without GPS.” |
| 0:55–1:18 | Teammate joins on Phone B. Project Phone A; let the second avatar appear before speaking the final sentence. | “Now my teammate joins on another phone.” Pause. “There they are. We're both in the same event, and now we can actually find each other's profiles.” |
| 1:18–1:40 | Tap the teammate's avatar; show the profile and user-entered LinkedIn link if present. | “Tap an avatar to see their profile and the LinkedIn link they've chosen to share. Now I have a person to introduce myself to.” |
| 1:40–2:08 | Tap **Find people to meet**. Choose **Who is building AI agents?** Show a result, its reason and source label. | “And if I know what I'm looking for, I can ask: ‘Who is building AI agents?’ Here's a match, with the reason it was suggested.” Then use the source-specific sentence below. |
| 2:08–2:11 | D: three-second Interstellar payoff. Caption: “When you finally find someone building the same thing.” | Brief dramatic swell; no voiceover. Use only after the matching result has appeared. |
| 2:11–2:34 | Return to app. Toggle visibility off; confirm disappearance on the other device. | “And being visible is my choice. I can hide myself again.” Pause for the update. “I control whether I appear on the map.” |
| 2:34–2:47 | Tap venue pin and show the event's Luma link. | “The venue pin also links back to the event, keeping the people and the event together.” |
| 2:47–3:00 | Big QR, BumpIn name, final line. Keep QR visible through the end. | “Your next teammate might be three metres away. BumpIn helps you make the introduction. Scan the code. Find your people.” |

### Matching line: choose what the running app actually shows

- **Source: Rules-based matching:** “This demo is using the labelled rules-based matcher, based on what attendees have shared.”
- **Source: Grok Bot**, only after verifying the integration works: “This result comes from Grok Bot, using the attendee information shared for this event.”

The repository has a configurable Grok adapter with a rules-based fallback. Source inspection does not establish which backend the deployed app is using. Don't promise Grok-powered results before checking the running demo.

## Rehearsal and edit notes

- Use two clearly introduced demo participants. Phone B's real demo profile can say **Building: AI agents for event networking** so the suggested query has relevant profile text to match.
- Verify cross-phone updates before rehearsing this script. The documented local demo mode uses localStorage and BroadcastChannel on the same machine; it does not establish cross-phone realtime behaviour.
- If cross-phone realtime is unavailable, use a previously recorded successful two-phone run labelled **Recorded demo**. If none exists, demonstrate the available local mode and state its limits.
- If there is no matching result, skip D and say: “Matches depend on what attendees have shared; this event doesn't have a matching profile yet.”
- Keep music in the opening and payoff only. Fade it out before the live app so the presenter is easy to hear.
- For a recording intended for upload, use event footage you have permission to use or appropriately licensed stock. The same captions can work over teammates acting out confusion, running and a dramatic handshake.
- Rehearse playback and audio on the actual presentation setup. Export any media you have permission to reuse into the deck or one local intro file, so delivery doesn't depend on opening streaming sites on stage.
- Keep the original demo script available as the fallback if media playback fails.

## If the slot is only 90 seconds

| Time | Beat |
| --- | --- |
| 0:00–0:07 | A → B, same hook. |
| 0:07–0:15 | “Same room. Missed connection. BumpIn helps you find your people.” |
| 0:15–0:35 | QR → Phone A joins with visibility enabled. |
| 0:35–0:50 | Phone B joins → second avatar appears. |
| 0:50–1:05 | Open profile → show matching result and its actual source. |
| 1:05–1:15 | Show visibility control. |
| 1:15–1:30 | QR close: “Your next teammate might be three metres away. Make the introduction.” |

Skip the movie payoff and venue-link detour in this version.

## Preparation evidence

Reviewed README, product requirements, existing demo scripts, rehearsal checklist, matching adapter, matching rules and current matching-panel labels. Located the sources above through web search and page reads. This document adds research and a rehearsal script only; no clips have been downloaded, edited or playback-tested, and the live app has not been tested as part of this task. Code checks are not applicable to this documentation-only addition.
