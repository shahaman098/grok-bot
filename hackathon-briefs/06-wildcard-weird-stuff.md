# Wildcard · Your own community idea

## Weird Stuff

You already run or know a community and have an idea that doesn't fit the other tracks. Build that.

## The problem

Some of the best tools come from people fixing their own community's problem. If yours doesn't fit a track, bring it here.

## What community leads told us

Tell the judges which community it's for and what hurts today.

Show it working on real data or with a real lead in the room.

## What to build

Anything that solves a real problem for a real community, built in the open.

Start from the Data starter kit and the integrations below if you need data or a channel.

## What a winning demo looks like

Name the community, show the problem, and show your build fixing it live.

## Suggested partner stack

Pick from Supabase, Cognee, Zero, Notion, Grok Bot and Cursor.

Click a partner for docs and who to find on the night.

## Open-source starters to fork

**Grok Bot skill · MIT**

Point Grok Bot at your repo and community context.

**Cognee · Apache-2.0**

Memory layer for any community agent.

**Supabase · Apache-2.0**

Database, auth and storage.

## Integrations: where community leads live

### WhatsApp

Cloud API (official): Free to start. Talks 1:1 with people who message a business number. Outbound needs approved templates; group support is limited.

Baileys · MIT: Unofficial. Logs in as a linked device and can read and post in groups. Against WhatsApp's terms, so use a spare test number.

whatsapp-web.js · Apache-2.0: Unofficial, drives WhatsApp Web. Same caveat as Baileys.

### Discord

Discord API (official): Free. Full bot access to the servers that add your bot.

discord.js · Apache-2.0: Node library.

discord.py · MIT: Python library.

### Slack

Bolt for JavaScript · MIT: Official framework for Slack apps. Free workspaces work.

### Notion

Notion API + JS SDK · MIT: Free. Read and write databases and pages your integration is shared with.

Notion MCP server · MIT: Lets Grok Bot or Cursor read and write a Notion workspace.

### Ghost newsletter

Ghost · MIT: Open-source newsletter and site. Self-host free, or Ghost(Pro) paid.

Admin API: Create posts, send newsletters and manage members. JS client in TryGhost/SDK (MIT): https://github.com/TryGhost/SDK

Content API: Read-only public posts.

### Substack

RSS feed: No official API. Every publication has <name>.substack.com/feed for posts, and writers can export subscribers as CSV from the dashboard. Posting has to stay manual.

### LinkedIn

Share on LinkedIn (official): Self-serve, but only posts as the signed-in member. Reading other people, groups or company pages needs partner approval you won't get tonight. Scraping is against their terms. Use a lead's own data export or manual paste.

## Free data

Sources you can scrape today

### Luma discover API (London) · tested 22 Oct

You get: entries[].event: name, start_at, end_at, url, location_type, geo_address_info (venue, address, lat/lng); guest_count; calendar. Page with pagination_cursor=next_cursor.

Access: No key. Undocumented, so cache results and keep it to a few calls a minute.

```sh
curl -s 'https://api.lu.ma/discover/get-paginated-events?discover_place_api_id=discplace-QCcNk3HXowOR97j&pagination_limit=50' | jq -r '.entries[].event | [.start_at, .name, .geo_address_info.address] | @tsv'
```

### Devpost hackathons API · tested 22 Oct

You get: title, url, submission_period_dates, displayed_location, themes, prize_amount (HTML), registrations_count, organization_name. 9 per page; meta.total_count. Filters: status[]=upcoming|open|ended, search=london.

Access: No key. Send a browser User-Agent; plain bots get 403 on hackathon subdomains.

```sh
curl -s -g 'https://devpost.com/api/hackathons?status[]=ended&search=london' | jq -r '.hackathons[] | [.title, .submission_period_dates, .registrations_count, .organization_name] | @tsv'
```

### GitHub REST API · tested 22 Oct

You get: Users/orgs: created_at, public_repos, followers. Repos: stars, topics, language, pushed_at. Search users, repos and orgs by location or topic.

Access: No key: 60 requests/hour, search 10/minute. A free personal token raises it to 5,000/hour.

```sh
curl -s 'https://api.github.com/users/octocat' | jq '{created_at, public_repos, followers}'
```

### Hacker News Algolia API · tested 22 Oct

You get: hits[]: title, url, points, num_comments, created_at, author. Filters: tags=story|show_hn, numericFilters=created_at_i>…

Access: No key. Roughly 10,000 requests/hour per IP.

```sh
curl -s 'https://hn.algolia.com/api/v1/search_by_date?query=hackathon&tags=story&hitsPerPage=5' | jq -r '.hits[] | [.created_at, .points, .title] | @tsv'
```

All sources and working snippets: Data starter kit.

Anything public goes. The Data starter kit has tested snippets for Luma, Meetup, Eventbrite, dev.events, Devpost, BuilderBase, MLH, GitHub, Hacker News, Companies House and Hugging Face.

## How it's judged

Same criteria as every track. A real community that would use it next week matters most.

Every project must be open source (public repo, MIT, Apache-2.0 or AGPL-3.0). All tracks also use the six shared judging criteria below, each scored 1–5.
