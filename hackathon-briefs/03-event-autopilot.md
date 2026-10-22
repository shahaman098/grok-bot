Close ✕
Track 3 · Run sheet, promo & newsletter

Event Autopilot
Turn one event into a run sheet, posts, visuals and a newsletter that a lead approves with one click.

The problem
Every week someone writes the event page, makes the visuals, posts everywhere, sends the newsletter and chases volunteers. All by hand.

What community leads told us
Venues, food, suppliers, pages, money and volunteers all live in different places. Leads want one place to dump it all and have it sorted.
The post and visuals for each event take hours, and AI design tools aren't good enough to ship yet.
Someone writes the newsletter, group messages and social posts every single week.
Volunteers burn out on admin a machine could do. Time saved per volunteer is the number that matters.
What to build
An event workspace in Notion: drop in notes, quotes and receipts, and it builds the run sheet, budget and volunteer rota.
A promo pipeline: event page copy, on-brand visuals from code templates rather than image models, a Ghost newsletter and posts for WhatsApp, LinkedIn and Discord. The lead approves each one.
A weekly digest that pulls this week's events from Luma and drafts the newsletter and group message.
A helper for the night: check-in, timings and last-minute changes pushed to the group.
What a winning demo looks like
One event goes from a one-line idea to a run sheet, visuals, a newsletter draft and posts. Show the volunteer hours saved.

Suggested partner stack
Notion as the workspace, Supabase for event data, Zero to turn Luma guests into follow-ups, Grok Bot for copy, Cursor for templates.

Click a partner for docs and who to find on the night.

Open-source starters to fork
listmonk AGPL-3.0
Self-hosted newsletter and mailing-list manager with an API.
Postiz AGPL-3.0
Schedules posts to LinkedIn, X, Discord and more.
Ghost MIT
Newsletter and site with an Admin API for sending.
fabric.js MIT
Canvas templates for event visuals that always match the brand.
Puppeteer Apache-2.0
Render an HTML template to a PNG for each event.
ical-generator MIT
Calendar invites and feeds for the run sheet.
Integrations: where community leads live
Ghost newsletter
Ghost · MIT: Open-source newsletter and site. Self-host free, or Ghost(Pro) paid.
Admin API: Create posts, send newsletters and manage members. JS client in TryGhost/SDK (MIT): https://github.com/TryGhost/SDK
Content API: Read-only public posts.
Substack
RSS feed: No official API. Every publication has <name>.substack.com/feed for posts, and writers can export subscribers as CSV from the dashboard. Posting has to stay manual.
LinkedIn
Share on LinkedIn (official): Self-serve, but only posts as the signed-in member. Reading other people, groups or company pages needs partner approval you won't get tonight. Scraping is against their terms. Use a lead's own data export or manual paste.
WhatsApp
Cloud API (official): Free to start. Talks 1:1 with people who message a business number. Outbound needs approved templates; group support is limited.
Baileys · MIT: Unofficial. Logs in as a linked device and can read and post in groups. Against WhatsApp's terms, so use a spare test number.
whatsapp-web.js · Apache-2.0: Unofficial, drives WhatsApp Web. Same caveat as Baileys.
Notion
Notion API + JS SDK · MIT: Free. Read and write databases and pages your integration is shared with.
Notion MCP server · MIT: Lets Grok Bot or Cursor read and write a Notion workspace.
Luma
Luma API (official): Needs Luma Plus (paid) and covers your own calendar. Public pages and the discover feed are in the Data starter kit.
Zero Luma sync: Zero pulls Luma guests into its pipeline, so attendees become contacts you can enrich and follow up.
Data community leads offered
Outpost: past event data and channel history, anonymised CSVs on request. Ask on the night.
AI Pilled: Luma history and LinkedIn posts (public) to learn a community's voice and visual style.
Free data
Sources you can scrape today

Luma single event JSON tested 22 Oct
You get: Full event: description, hosts[] (name, linkedin_handle, twitter_handle, website), sessions, ticket_info, categories, guest_count, calendar. The event id is in the discover feed (api_id).

Access: No key. Same courtesy limits as above.

curl -s 'https://api.lu.ma/event/get?event_api_id=evt-Yz7RR89Zlv56tya' | jq '{name: .event.name, start: .event.start_at, going: .guest_count}'
Luma calendar .ics feed tested 22 Oct
You get: Standard iCalendar: DTSTART, DTEND, SUMMARY, LOCATION, URL per event, past and future. Calendar ids come from calendar_api_id in the discover feed.

Access: No key. Feed says refresh every 12h.

curl -s 'https://api.lu.ma/ics/get?entity=calendar&id=cal-wUKLVX9VWOdVkpg' | grep -E '^(DTSTART|SUMMARY)' | head
Eventbrite listing (schema.org JSON-LD) tested 22 Oct
You get: ld+json ItemList of Event: name, description, startDate, endDate, location (venue name, address), url. About 20 per page; add ?page=2.

Access: No key for pages. Official API needs a free OAuth token and only covers your own events.

curl -s -A 'Mozilla/5.0' 'https://www.eventbrite.co.uk/d/united-kingdom--london/tech-events/' | python3 -c "import sys,re,json;[print(i['item']['startDate'],i['item']['name']) for m in re.findall(r'ld\+json\">(.*?)</script>',sys.stdin.read(),re.S) for d in [json.loads(m)] if isinstance(d,dict) and d.get('@type')=='ItemList' for i in d['itemListElement']]"
All sources and working snippets: Data starter kit.

Luma event JSON (api.lu.ma/event/get) and .ics feeds give real event text, dates and venues to test the pipeline on. Make up budgets and rotas.

How it’s judged
How much of the weekly work really runs itself. Quality of the copy and visuals. Hours saved. Whether a lead would trust it with a real event.

Every project must be open source (public repo, MIT, Apache-2.0 or AGPL-3.0). All tracks also use the six shared judging criteria below, each scored 1–5.