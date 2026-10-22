Close ✕
Track 5 · Inbound, pricing, sponsors

Front Desk & Revenue
Answer inbound in chat, price bookings fairly, and find sponsors.

The problem
Requests, quotes, pricing and sponsor deals all happen by hand in group chats and DMs. That decides whether events happen at all.

What community leads told us
A venue wants pricing that works for it and its hosts. Communities book often, bring leads and have no budget. Companies book rarely and pay a lot.
Replies and quotes are manual. Venues want an automatic first reply in chat.
Requests arrive in a full WhatsApp group and get lost. Leads need them turned into a ranked task list, and want to know when the bot fails instead of it dying silently.
Sponsors live in people's heads and spreadsheets. Communities want a simple sponsor CRM.
What to build
A pricing engine trained on a venue's real booking history. It quotes each request and explains community versus company pricing.
An inbound bot that replies in WhatsApp, qualifies the request, then books a call or sends the quote.
A front desk that turns every chat message into a task with an owner and a priority, and logs what it couldn't handle.
A sponsor CRM: scrape Luma event hosts and Devpost hackathon organisers to see who already backs London events, size them with Companies House, and draft the email. Run it in Zero or Twenty.
What a winning demo looks like
A chat request comes in, gets qualified, priced from past bookings and quoted. Then it's matched to a likely sponsor with a drafted email.

Suggested partner stack
Zero for sponsor and organiser pipeline (it syncs Luma guests), Supabase for bookings, Grok Bot for replies, Cursor for the pricing model.

Click a partner for docs and who to find on the night.

Open-source starters to fork
Chatwoot MIT core
Open-source shared inbox with a WhatsApp channel.
Twenty AGPL-3.0 core
Open-source CRM with an API, for the sponsor pipeline.
Frappe CRM AGPL-3.0
A lighter open-source CRM alternative.
Cal.com AGPL-3.0
Open-source booking for venue viewings and sponsor calls.
LightGBM MIT
Gradient boosting for a pricing model on a small booking history.
Integrations: where community leads live
WhatsApp
Cloud API (official): Free to start. Talks 1:1 with people who message a business number. Outbound needs approved templates; group support is limited.
Baileys · MIT: Unofficial. Logs in as a linked device and can read and post in groups. Against WhatsApp's terms, so use a spare test number.
whatsapp-web.js · Apache-2.0: Unofficial, drives WhatsApp Web. Same caveat as Baileys.
Slack
Bolt for JavaScript · MIT: Official framework for Slack apps. Free workspaces work.
LinkedIn
Share on LinkedIn (official): Self-serve, but only posts as the signed-in member. Reading other people, groups or company pages needs partner approval you won't get tonight. Scraping is against their terms. Use a lead's own data export or manual paste.
Luma
Luma API (official): Needs Luma Plus (paid) and covers your own calendar. Public pages and the discover feed are in the Data starter kit.
Zero Luma sync: Zero pulls Luma guests into its pipeline, so attendees become contacts you can enrich and follow up.
Data community leads offered
Night Office: a redacted history of their events and what was paid, to train and test pricing. Ask on the night.
Free data
Sources you can scrape today

Luma single event JSON tested 22 Oct
You get: Full event: description, hosts[] (name, linkedin_handle, twitter_handle, website), sessions, ticket_info, categories, guest_count, calendar. The event id is in the discover feed (api_id).

Access: No key. Same courtesy limits as above.

curl -s 'https://api.lu.ma/event/get?event_api_id=evt-Yz7RR89Zlv56tya' | jq '{name: .event.name, start: .event.start_at, going: .guest_count}'
Devpost hackathons API tested 22 Oct
You get: title, url, submission_period_dates, displayed_location, themes, prize_amount (HTML), registrations_count, organization_name. 9 per page; meta.total_count. Filters: status[]=upcoming|open|ended, search=london.

Access: No key. Send a browser User-Agent; plain bots get 403 on hackathon subdomains.

curl -s -g 'https://devpost.com/api/hackathons?status[]=ended&search=london' | jq -r '.hackathons[] | [.title, .submission_period_dates, .registrations_count, .organization_name] | @tsv'
Companies House (UK company data) tested 22 Oct
You get: Company number, status, SIC codes (industry), incorporation date, registered address, filing history and accounts. Good for sizing a sponsor.

Access: Free API key from developer.company-information.service.gov.uk (basic auth, key as username). 600 requests per 5 minutes. No key at all: the HTML search at find-and-update.company-information.service.gov.uk, or the free monthly bulk company data product.

curl -s -A 'Mozilla/5.0' 'https://find-and-update.company-information.service.gov.uk/search/companies?q=cloudflare' | grep -o 'href="/company/[0-9A-Z]*"' | head -3   # with a key: curl -u "$CH_KEY:" https://api.company-information.service.gov.uk/search/companies?q=cloudflare
BuilderBase public discovery API tested 22 Oct
You get: data.events[]: name, slug, start_at, end_at, format, event_type, location (city, country, lat, lng), participant_count, track_count, organization.name, theme_tags; data.next_cursor.

Access: No key for discovery. The full API (registrations, submissions, judging) needs a key: developers.builderbase.com.

curl -s 'https://edge.builderbase.com/super-events/public/discovery?status=active&limit=100' | jq -r '.data.events[] | [.start_at, .name, .location.city, .participant_count] | @tsv'
All sources and working snippets: Data starter kit.

Companies House (free key, or the no-key search page) sizes a UK sponsor. Devpost's hackathon API shows organisers and prize pools. Luma event JSON names the hosts of every London event.

How it’s judged
Prices that make sense on held-out bookings and are explained. Fast, correct replies. Sponsor matches that fit. Whether a venue would use it for real.

Every project must be open source (public repo, MIT, Apache-2.0 or AGPL-3.0). All tracks also use the six shared judging criteria below, each scored 1–5.