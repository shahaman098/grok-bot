# Track 1 · Vetting & moderation

## Gatekeeper

Review applications, keep scammers out, and share a blocklist across groups.

## The problem

Leads read every application by hand and kick bots and scammers one by one. A scammer removed from one group joins the next, because communities share nothing.

## What community leads told us

Every application gets read by hand, often by one tired lead.

Checking a new member means asking "do they fit what we do?", not just "are they real?".

A scammer kicked from one WhatsApp group turns up in the next. There is no shared blocklist.

Chat apps have weak moderation tools, so every removal and warning is manual.

## What to build

An open-source application reviewer. It scores each applicant against the community's own written rules, says accept, ask or decline, and shows why. Store decisions in Supabase.

A shared blocklist that several communities can write to: hashed phone numbers or handles, evidence, who reported it, and an appeal route. Row-level security in Supabase keeps each community's reports private until they're confirmed.

A WhatsApp or Discord moderation bot that flags scam patterns and drafts the removal message. A human presses send.

A review queue for the borderline cases, so a lead clears a week of decisions in ten minutes.

## What a winning demo looks like

An applicant arrives, gets scored and routed with a clear reason. Then a known scammer tries to join a second group and gets stopped.

## Suggested partner stack

Supabase for the shared blocklist and auth, Grok Bot to write the reviewer's reasoning, Cursor to build the bot.

Click a partner for docs and who to find on the night.

## Open-source starters to fork

**detoxify · Apache-2.0**

Pretrained toxicity classifiers. A quick first pass on chat messages.

**SMS spam dataset · free dataset**

5,574 labelled messages to test a scam filter.

**StopForumSpam API · free API**

Checks emails, usernames and IPs against reported spammers.

**Supabase · Apache-2.0**

Postgres, auth and row-level security for a blocklist shared between communities.

## Integrations: where community leads live

### WhatsApp

Cloud API (official): Free to start. Talks 1:1 with people who message a business number. Outbound needs approved templates; group support is limited.

Baileys · MIT: Unofficial. Logs in as a linked device and can read and post in groups. Against WhatsApp's terms, so use a spare test number.

whatsapp-web.js · Apache-2.0: Unofficial, drives WhatsApp Web. Same caveat as Baileys.

### Discord

Discord API (official): Free. Full bot access to the servers that add your bot.

discord.js · Apache-2.0: Node library.

discord.py · MIT: Python library.

## Data community leads offered

Unicorn Mafia: past event data, channel history, member info with consent, and access to their WhatsApp bot. Ask on the night.

AI Agent Lab: will share most data apart from API access. Ask on the night.

## Free data

Sources you can scrape today

### SMS spam dataset (Hugging Face) · tested 22 Oct

You get: 5,574 labelled messages (sms, label ham/spam). Real scam wording to train or test a chat moderation filter.

Access: No key. Rows API returns up to 100 rows per call.

```sh
curl -s 'https://datasets-server.huggingface.co/rows?dataset=ucirvine/sms_spam&config=plain_text&split=train&offset=0&length=100' | jq -r '.rows[].row | [.label, .sms] | @tsv'
```

### GitHub REST API · tested 22 Oct

You get: Users/orgs: created_at, public_repos, followers. Repos: stars, topics, language, pushed_at. Search users, repos and orgs by location or topic.

Access: No key: 60 requests/hour, search 10/minute. A free personal token raises it to 5,000/hour.

```sh
curl -s 'https://api.github.com/users/octocat' | jq '{created_at, public_repos, followers}'
```

### Devpost project search · tested 22 Oct

You get: JSON: name, tagline, url, members (usernames), tags (tech stack), winner, like_count, comment_count. 62k+ results for "community".

Access: No key. Use Accept: application/json.

```sh
curl -s -H 'Accept: application/json' 'https://devpost.com/software/search?query=community+bot' | jq -r '.software[] | [.name, .winner, (.tags|join(","))] | @tsv'
```

All sources and working snippets: Data starter kit.

Never load private member data into a public repo. Collect opt-in applications on the night, or use a lead's data inside the room only. To check whether an applicant's handle belongs to a real builder, use GitHub (account age, repos, followers) and Devpost (past projects).

## How it's judged

Right accept and decline calls on a test set. Clear reasons. Few real people wrongly blocked. Time saved for a lead.

Every project must be open source (public repo, MIT, Apache-2.0 or AGPL-3.0). All tracks also use the six shared judging criteria below, each scored 1–5.
