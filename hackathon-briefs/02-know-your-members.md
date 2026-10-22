Close ✕
Track 2 · Members, intros & speakers

Know Your Members
Find out who your members are, introduce them to each other, and find speakers among them.

The problem
Most leads know a member as a phone number. Nobody gets introduced, threads die, and finding a good panellist means asking around.

What community leads told us
One builder group has over a thousand members known only by phone number. Its chat dropped from hundreds of messages a month to a few dozen.
A co-working space wants to know who keeps coming back, why, and what they get out of it.
Organisers want to send every member a few quick questions and actually use the answers.
Finding good panellists and people to demo is slow and depends on who you already know.
What to build
A short opt-in questionnaire sent over WhatsApp or Discord. Answers go into a member graph in Cognee or Supabase.
An intro bot that suggests one good introduction a week per member, explains why, and still works a month later without the organiser.
A speaker finder: give it a topic and it suggests members and London builders, with proof of what they've built (GitHub, Devpost, Hacker News) or hosted (Luma).
A thread reviver that spots dead conversations worth restarting and drafts the nudge, with a log of what it tried and where it failed.
What a winning demo looks like
An introduction or revived thread that no organiser made by hand, shown end to end. Then a speaker shortlist for a real topic, each name with evidence.

Suggested partner stack
Cognee for the member graph, Supabase for answers and consent, Notion as the lead's view, Grok Bot to write the intros.

Click a partner for docs and who to find on the night.

Open-source starters to fork
Cognee Apache-2.0
Turns answers, chats and profiles into a knowledge graph your agent can query.
sentence-transformers Apache-2.0
Embeddings for matching members by what they build and want.
graphology MIT
Graph library for the member network and connection-density metrics.
mem0 Apache-2.0
Per-member memory for a bot that remembers past conversations.
Luma event JSON (hosts and speakers) free, no key
Each event lists its hosts with LinkedIn, X and website handles. That is a good source of speakers.
Integrations: where community leads live
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
LinkedIn
Share on LinkedIn (official): Self-serve, but only posts as the signed-in member. Reading other people, groups or company pages needs partner approval you won't get tonight. Scraping is against their terms. Use a lead's own data export or manual paste.
Data community leads offered
The Hack Collective: a Luma calendar subscriber export (about 450 names and emails, shared with consent) and a synthetic member-profile dataset. Use it in the room; don't commit it to a public repo.
AI Pilled: their Luma history and LinkedIn posts (all public), useful for the speaker finder.
Free data
Sources you can scrape today

Luma single event JSON tested 22 Oct
You get: Full event: description, hosts[] (name, linkedin_handle, twitter_handle, website), sessions, ticket_info, categories, guest_count, calendar. The event id is in the discover feed (api_id).

Access: No key. Same courtesy limits as above.

curl -s 'https://api.lu.ma/event/get?event_api_id=evt-Yz7RR89Zlv56tya' | jq '{name: .event.name, start: .event.start_at, going: .guest_count}'
GitHub REST API tested 22 Oct
You get: Users/orgs: created_at, public_repos, followers. Repos: stars, topics, language, pushed_at. Search users, repos and orgs by location or topic.

Access: No key: 60 requests/hour, search 10/minute. A free personal token raises it to 5,000/hour.

curl -s 'https://api.github.com/users/octocat' | jq '{created_at, public_repos, followers}'
Devpost project search tested 22 Oct
You get: JSON: name, tagline, url, members (usernames), tags (tech stack), winner, like_count, comment_count. 62k+ results for "community".

Access: No key. Use Accept: application/json.

curl -s -H 'Accept: application/json' 'https://devpost.com/software/search?query=community+bot' | jq -r '.software[] | [.name, .winner, (.tags|join(","))] | @tsv'
Hacker News Algolia API tested 22 Oct
You get: hits[]: title, url, points, num_comments, created_at, author. Filters: tags=story|show_hn, numericFilters=created_at_i>…

Access: No key. Roughly 10,000 requests/hour per IP.

curl -s 'https://hn.algolia.com/api/v1/search_by_date?query=hackathon&tags=story&hitsPerPage=5' | jq -r '.hits[] | [.created_at, .points, .title] | @tsv'
All sources and working snippets: Data starter kit.

GitHub's API turns an opt-in handle into languages and projects. Devpost project search and Hacker News show what someone has shipped or said.

How it’s judged
How good the intros and speaker picks are. Evidence for each one. Honesty about failures. Whether a lead would run it every week.

Every project must be open source (public repo, MIT, Apache-2.0 or AGPL-3.0). All tracks also use the six shared judging criteria below, each scored 1–5.