import Link from "next/link";
import { Brand } from "@/components/ui/brand";
import { GROK_BOT_LONDON } from "@/lib/events/seed";
import { ArrowRight, MapPin } from "lucide-react";

export default function HomePage() {
  return (
    <main className="home-page">
      <Brand />
      <p className="eyebrow">GOOD PEOPLE. SAME ROOM.</p>
      <h1>
        Be there.
        <br />
        Meet someone<span className="accent">.</span>
      </h1>
      <p className="muted">
        Find the people worth saying hello to. Opt in, explore the room, and
        turn a shared interest into a conversation.
      </p>
      <div className="home-event-card">
        <span className="eyebrow">THE ROOM IS WAITING</span>
        <h2 className="mt-3 mb-4 text-lg font-semibold">
          {GROK_BOT_LONDON.name}
        </h2>
        <p className="muted mb-5 flex items-start gap-2 text-sm">
          <MapPin size={18} className="shrink-0" />
          {GROK_BOT_LONDON.venueName}
        </p>
        <Link href={`/e/${GROK_BOT_LONDON.slug}`} className="primary-button">
          Join the event
          <ArrowRight size={20} />
        </Link>
      </div>
      <p className="privacy-note">
        Your choice to be visible. No GPS collected.
      </p>
    </main>
  );
}
