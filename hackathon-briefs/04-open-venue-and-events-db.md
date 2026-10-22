Close ✕
Track 4 · Venues, communities, events

Open Venue & Events DB
An open database of London venues, communities and events that approved organisers keep up to date together.

The problem
Finding a free venue for an evening or weekend event is one of the hardest jobs organisers have. The knowledge sits in people's heads. The same goes for which communities exist and which events are worth going to.

What community leads told us
Finding a venue that will host evening and weekend events for free is the hardest job one organiser told us about.
No one has an up-to-date list of a city's communities: size, audience, what they run and who to contact.
A volunteer adds events to a shared community calendar by hand.
Builders want a ranked list of the best events and hackathons in their city, not filler.
Communities shouldn't compete. Organisers want one shared agent they can all ask.
What to build
The venue database: capacity, AV, evening and weekend hours, free or paid terms, the contact, and which communities hosted there. Only approved organisers can post, and they vouch for each other. Built on Supabase with PostGIS for "near me" search.
A communities directory in the same database: size, audience, what they run and how to reach the lead, kept fresh from Luma calendars.
An events layer: pull Luma, Devpost, BuilderBase and Meetup into one London calendar, rank events with the reasons shown, and publish an .ics feed other calendars can subscribe to.
Organiser outreach: scrape the hosts of London Luma events (name, LinkedIn, X, website), match them to venues and communities, and draft the intro. Track replies in Zero or Supabase.
A shared agent on top: any approved organiser asks in WhatsApp or Discord "free space for 80 people next Thursday near Old Street?" and gets venues, past hosts and a drafted request. Use Cognee for memory and Grok Bot for the agent.
What a winning demo looks like
Two organisers add real venues. A third finds one by asking in chat and sends the request. The ranked events feed and .ics calendar update from live data.

Suggested partner stack
Supabase for the database and PostGIS, Cognee and Grok Bot for the shared agent, Zero for organiser outreach, Notion as a public view.

Click a partner for docs and who to find on the night.

Open-source starters to fork
Supabase Apache-2.0
Postgres, auth, row-level security and storage. PostGIS is one click: https://supabase.com/docs/guides/database/extensions/postgis
Overture Maps places MIT (repo) · open data
Free global places data to seed halls, co-working spaces and bars. Guide: https://docs.overturemaps.org/guides/places/
OpenStreetMap via Overpass Turbo ODbL data · free
Query community centres, co-working spaces and event venues in London.
Meilisearch MIT core
Fast typo-tolerant search over venues and communities.
ical-generator MIT
Publish the shared calendar as an .ics feed.
Hack Club hackathons MIT
An open-source hackathon listing site to fork for the events layer.
Cognee Apache-2.0
Memory for the shared organiser agent.
Integrations: where community leads live
Luma
Luma API (official): Needs Luma Plus (paid) and covers your own calendar. Public pages and the discover feed are in the Data starter kit.
Zero Luma sync: Zero pulls Luma guests into its pipeline, so attendees become contacts you can enrich and follow up.
WhatsApp
Cloud API (official): Free to start. Talks 1:1 with people who message a business number. Outbound needs approved templates; group support is limited.
Baileys · MIT: Unofficial. Logs in as a linked device and can read and post in groups. Against WhatsApp's terms, so use a spare test number.
whatsapp-web.js · Apache-2.0: Unofficial, drives WhatsApp Web. Same caveat as Baileys.
Discord
Discord API (official): Free. Full bot access to the servers that add your bot.
discord.js · Apache-2.0: Node library.
discord.py · MIT: Python library.
Notion
Notion API + JS SDK · MIT: Free. Read and write databases and pages your integration is shared with.
Notion MCP server · MIT: Lets Grok Bot or Cursor read and write a Notion workspace.
Slack
Bolt for JavaScript · MIT: Official framework for Slack apps. Free workspaces work.
Data community leads offered
Hack Radar: its database of scraped events, for seeding and labelling the ranking. Ask on the night.
The Hack Collective: its public Luma calendar of London hackathons, to compare your auto-calendar against.
Free data
Sources you can scrape today

Luma discover API (London) tested 22 Oct
You get: entries[].event: name, start_at, end_at, url, location_type, geo_address_info (venue, address, lat/lng); guest_count; calendar. Page with pagination_cursor=next_cursor.

Access: No key. Undocumented, so cache results and keep it to a few calls a minute.

curl -s 'https://api.lu.ma/discover/get-paginated-events?discover_place_api_id=discplace-QCcNk3HXowOR97j&pagination_limit=50' | jq -r '.entries[].event | [.start_at, .name, .geo_address_info.address] | @tsv'
Luma single event JSON tested 22 Oct
You get: Full event: description, hosts[] (name, linkedin_handle, twitter_handle, website), sessions, ticket_info, categories, guest_count, calendar. The event id is in the discover feed (api_id).

Access: No key. Same courtesy limits as above.

curl -s 'https://api.lu.ma/event/get?event_api_id=evt-Yz7RR89Zlv56tya' | jq '{name: .event.name, start: .event.start_at, going: .guest_count}'
Luma calendar .ics feed tested 22 Oct
You get: Standard iCalendar: DTSTART, DTEND, SUMMARY, LOCATION, URL per event, past and future. Calendar ids come from calendar_api_id in the discover feed.

Access: No key. Feed says refresh every 12h.

curl -s 'https://api.lu.ma/ics/get?entity=calendar&id=cal-wUKLVX9VWOdVkpg' | grep -E '^(DTSTART|SUMMARY)' | head
Devpost hackathons API tested 22 Oct
You get: title, url, submission_period_dates, displayed_location, themes, prize_amount (HTML), registrations_count, organization_name. 9 per page; meta.total_count. Filters: status[]=upcoming|open|ended, search=london.

Access: No key. Send a browser User-Agent; plain bots get 403 on hackathon subdomains.

curl -s -g 'https://devpost.com/api/hackathons?status[]=ended&search=london' | jq -r '.hackathons[] | [.title, .submission_period_dates, .registrations_count, .organization_name] | @tsv'
BuilderBase public discovery API tested 22 Oct
You get: data.events[]: name, slug, start_at, end_at, format, event_type, location (city, country, lat, lng), participant_count, track_count, organization.name, theme_tags; data.next_cursor.

Access: No key for discovery. The full API (registrations, submissions, judging) needs a key: developers.builderbase.com.

curl -s 'https://edge.builderbase.com/super-events/public/discovery?status=active&limit=100' | jq -r '.data.events[] | [.start_at, .name, .location.city, .participant_count] | @tsv'
Meetup search page (embedded JSON) tested 22 Oct
You get: __NEXT_DATA__ → __APOLLO_STATE__ "Event:*" objects: title, dateTime, eventUrl, eventType, rsvps.totalCount, group ref. About 25 per page.

Access: No key for the page. The official GraphQL API needs a paid Pro plan, so parse the page.

python3 -c "import re,json,urllib.request as u;h=u.urlopen(u.Request('https://www.meetup.com/find/?location=gb--17--London&source=EVENTS&keywords=tech',headers={'User-Agent':'Mozilla/5.0'})).read().decode();a=json.loads(re.search(r'__NEXT_DATA__[^>]*>(.*?)</script>',h,re.S)[1])['props']['pageProps']['__APOLLO_STATE__'];[print(v['dateTime'],v['title']) for k,v in a.items() if k.startswith('Event:')]"
MLH season page (embedded JSON) tested 22 Oct
You get: <script data-page="app"> JSON: props.upcomingEvents and props.pastEvents with name, startsAt, endsAt, location, formatType, url, logoUrl.

Access: No key.

curl -sL 'https://mlh.io/seasons/2027/events' | python3 -c "import sys,re,json;p=json.loads(re.search(r'data-page=\"app\" type=\"application/json\">(.*?)</script>',sys.stdin.read(),re.S)[1])['props'];[print(e['startsAt'][:10],e['name'],e['location']) for e in p['upcomingEvents']]"
All sources and working snippets: Data starter kit.

Every source is free with no key: Luma's London discover feed and event JSON (each event lists its hosts with LinkedIn, X and website), Luma .ics calendars, Devpost, BuilderBase, MLH, Meetup and dev.events. Hand-label 30 events to test your ranking. Respect each site's terms and cache what you fetch.

How it’s judged
Real venues and data entered tonight. A trust model that stops junk. How fast a venue is found. Whether three leads would post their venues tomorrow.

Every project must be open source (public repo, MIT, Apache-2.0 or AGPL-3.0). All tracks also use the six shared judging criteria below, each scored 1–5.