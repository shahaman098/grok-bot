London
Grok Bot Hackathon
Submit
Judge Portal
London
Grok Bot Community Engineering London Hackathon

Build open-source tools that London community leads will actually use.

Thursday, 22nd October · 6:00 PM – 11:00 PM · Expedite London HQ — London

An evening hackathon for community engineers, DevRels, organisers and builders. Every track comes from a problem a London community lead sent us, and everything you build is open source.

Register on Luma →
See tracks









Francisco Terpolilli profile photo
Search
Search


Supabase

18:12
Postgres, auth + realtime for members


Cognee

18:10
Memory for your community bot


Zero

18:08
CRM data via MCP + API


Notion

18:07
Docs + databases via MCP + API


Grok Bot

18:05
Agent


Cursor

18:05
Code editor


Expedite

18:00
Venue · 7 Lyric Square


Organisers

17:55
Teams, demos & judging

Francisco Terpolilli profile photo
Marketplace
Cursor


18:05

What's new in Cursor I should know for the hackathon?
Cursor

cursor.com
Open

Latest from cursor.com/changelog (good for a one-night community build):

• Cloud Agent Canvases and Environment Improvements — Cloud agents can now build and share interactive canvases. The Environments API is available in beta, environments support up to 300 repos, and large environments load 5x faster.
• Origin App Marketplace — Origin integrates with over 20 apps for deployments, CI, code review, security, monitoring, and project management, and the marketplace is now open to public submissions.
• Remote control for local agents — See and reply to the local agents running on your computer from the Cursor iOS app.
• Rollouts and Security Review — Two bots for the last mile of shipping code: Rollouts watches every change as it deploys, and Security Review reports exploitable bugs on every pull request.
• Cursor Projects — Projects lets you take on larger bodies of work, maintain context over months, and delegate tasks to thousands of subagents.
• Self-hosted machines — Cursor supports self-hosted machines, which let you keep tool execution entirely in your own network.

Prizes: podium teams win Cursor Ultra: 3, 2 or 1 months per person.

CLI →
SDK →
changelog →
Find the Cursor connection below on the night. Podium teams win Cursor Ultra. Updates and day-of blasts go out on Luma.

Latest on X

@cursor_ai
Cloud agents can now build interactive canvases. Ask for a dashboard or report while the agent works, then share the finished canvas with your team as a link.
@cursor_ai
The Environments API is now available in beta. Create and manage cloud agent environments programmatically.
Francisco Terpolilli 🤌
Francisco Terpolilli 🤌

EU Ambassador · Cursor

CLI, IDE, or SDK?
👍
✓
CLI → curl https://cursor.com/install -fsS | bash, then run agent
✓
Headless → agent -p "…" for scripts and CI
✓
SDK → npm install @cursor/sdk with CURSOR_API_KEY, local or cloud agents
Run an agent from your own app with the TypeScript SDK:

ts

Copy
import { Agent } from '@cursor/sdk'

const agent = await Agent.create({
  apiKey: process.env.CURSOR_API_KEY!,
  model: { id: 'composer-2.5' },
  local: { cwd: process.cwd() },
})

const run = await agent.send('Add an RSVP export endpoint')
for await (const event of run.stream()) {
  console.log(event)
}
Cursor: pin your stack in .cursor/rules, plan with Plan mode, then let Agent write the glue so you can focus on the demo.

CLI →
SDK →
changelog →
Find the Cursor connection below on the night. Podium teams win Cursor Ultra. Updates and day-of blasts go out on Luma.

Latest on X

@cursor_ai
Cloud agents can now build interactive canvases. Ask for a dashboard or report while the agent works, then share the finished canvas with your team as a link.
@cursor_ai
The Environments API is now available in beta. Create and manage cloud agent environments programmatically.
Francisco Terpolilli 🤌
Francisco Terpolilli 🤌

EU Ambassador · Cursor


Message Cursor…






Tracks
Five problems London community leads sent us, plus a wildcard for your own community idea. Every project must be open source. Click a track for the brief, starters and integrations.



Track 1 · Vetting & moderation

Gatekeeper
Review applications, keep scammers out, and share a blocklist across groups.

Read the full brief →


Track 2 · Members, intros & speakers

Know Your Members
Find out who your members are, introduce them to each other, and find speakers among them.

Read the full brief →


Track 3 · Run sheet, promo & newsletter

Event Autopilot
Turn one event into a run sheet, posts, visuals and a newsletter that a lead approves with one click.

Read the full brief →


Track 4 · Venues, communities, events

Open Venue & Events DB
An open database of London venues, communities and events that approved organisers keep up to date together.

Read the full brief →


Track 5 · Inbound, pricing, sponsors

Front Desk & Revenue
Answer inbound in chat, price bookings fairly, and find sponsors.

Read the full brief →


Wildcard · Your own community idea

Weird Stuff
You already run or know a community and have an idea that doesn't fit the other tracks. Build that.

Read the full brief →
Schedule
6:00 PM – 11:00 PM · Thursday, 22nd October

18:00
Doors open & setup @ Expedite London HQ
18:05
Kickoff & tracks
18:10
Hacking begins
18:15
🍕 Dinner
21:50
Code freeze, submissions & initial judging
22:20
Live demos of Top 5 (3 mins each)
22:45
Final judging & awards
23:00
Close
Partners & Sponsors
Host & co-organisers
Francisco Terpolilli
Francisco Terpolilli

Host · EU Ambassador @ Cursor

Keanu Czirjak
Keanu Czirjak

Co-organiser · Hackradar

Louis Le
Louis Le

Co-organiser · The Hack Collective

Venue partner
Expedite London HQ — 7 Lyric Square, London

William Schulz
William Schulz

Made it possible · Expedite

Technology Partners
Supabase
Cognee
Zero
Notion
Cursor
Community Partners
Charlie Cheesman
Unicorn Mafia

Lead · Charlie Cheesman

Fatema Al Khalifa
basedcollective

Lead · Fatema Al Khalifa


Ilya Vencjuns
Peter Ashiagbor
Kickstart Global

Leads · 
Ilya Vencjuns
Peter Ashiagbor
Ilya Vencjuns +1

Keanu Czirjak
Hackradar

Lead · Keanu Czirjak


May Yu
Minghan Xiao
AI Agents Lab

Leads · 
May Yu
Minghan Xiao
May Yu +1

Claudia Maggi
Corgi Community

Lead · Claudia Maggi


Oli Kingshott
Shreyas Raghu
Night Office

Leads · 
Oli Kingshott
Shreyas Raghu
Oli Kingshott +1

Louis Le
The Hack Collective

Lead · Louis Le

Umberto Belluzzo
United Italian Societies

Lead · Umberto Belluzzo


Andy Tyler
Oscar Falemara
Outpost

Leads · 
Andy Tyler
Oscar Falemara
Andy Tyler +1


Nuan Zhang
Yiran Qin
AI Pilled

Leads · 
Nuan Zhang
Yiran Qin
Nuan Zhang +1

Hela Hałas
Imperial Entrepreneurs

Lead · Hela Hałas

Zakee Abdi
Zakee Abdi

Community lead

Judges
Every judge leads a partner community, so the people judging your build are the people who'd actually use it.

Charlie Cheesman
Charlie Cheesman

Judge · Unicorn Mafia

Unicorn Mafia logo
Fatema Al Khalifa
Fatema Al Khalifa

Judge · basedcollective

basedcollective logo
Ilya Vencjuns
Ilya Vencjuns

Judge · Kickstart Global

Kickstart Global logo
Keanu Czirjak
Keanu Czirjak

Judge · Hackradar

Hackradar logo
May Yu
May Yu

Judge · AI Agents Lab

AI Agents Lab logo
Claudia Maggi
Claudia Maggi

Judge · Corgi Community

Corgi Community logo
Oli Kingshott
Oli Kingshott

Judge · Night Office

Night Office logo
Louis Le
Louis Le

Judge · The Hack Collective

The Hack Collective logo
Umberto Belluzzo
Umberto Belluzzo

Judge · United Italian Societies

United Italian Societies logo
Andy Tyler
Andy Tyler

Judge · Outpost

Outpost logo
Nuan Zhang
Nuan Zhang

Judge · AI Pilled

AI Pilled logo
Hela Hałas
Hela Hałas

Judge · Imperial Entrepreneurs

Imperial Entrepreneurs logo
Luca Stromann
Luca Stromann

Judge · cognee

cognee logo
William Schulz
William Schulz

Judge · Expedite

Expedite logo
Demo Format & Criteria
Demo format
Work solo or in teams of up to 5.
Every team submits a working demo at code freeze (21:50).
The Top 5 teams present live, 3 minutes each.
From those finalists, judges award 1st, 2nd and 3rd place.
Judging criteria
Technical execution
Is it open source, and could another community run it next week?
Use of community context
Better than what leads use today
Real-world usefulness
Demo quality
Open source is required: a public GitHub repo with an MIT, Apache-2.0 or AGPL-3.0 licence file.

Tech Partners
Primary tools for builders, and who to find on the night

Supabase →
Postgres database, auth, storage and realtime for your community tooling.

Docs →
Auth guide →
Database →
Isabelle Roser
Isabelle Roser

Connection · Supabase

Cognee →
Open-source memory for AI agents: turn docs, chats and data into one recallable memory layer.

Docs →
Quickstart →
MCP →
GitHub →
Luca Stromann
Luca Stromann

Product · cognee

Zero →
The GTM OS: pipeline, lead search, enrichment, warm intros and sequences, with agents handling the admin.

Docs →
MCP →
API →
Luma sync →
Mariia Nedelkina
Mariia Nedelkina

Connection · Zero

Notion →
Docs, wikis and databases for your community, with an official API and a hosted MCP server your agents can use.

API docs →
Notion MCP →
JS SDK →
Create an integration →
Templates →
Waseef Mohammad Khan
Waseef Mohammad Khan

Campus Leader · Notion

Grok Bot →
An agent that reads your community's context, plans the build with you and does the research. Use the skill to point it at your repo.

Skill →
Francisco Terpolilli 🤌
Francisco Terpolilli 🤌

EU Ambassador · SpaceXAI

Cursor →
The code editor and agent you build with. Plan, write and ship before code freeze.

CLI →
IDE →
SDK →
Francisco Terpolilli 🤌
Francisco Terpolilli 🤌

EU Ambassador · Cursor

Prizes
Rewards for top performers

🥇 1st place
3 months Cursor Ultra per person + Supabase credits

🥈 2nd place
2 months Cursor Ultra per person + Supabase credits

🥉 3rd place
1 month Cursor Ultra per person + Supabase credits

Registration is subject to host approval · Register on Luma →