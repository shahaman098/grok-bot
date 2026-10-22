import { EventExperience } from "@/components/event/event-experience";
import { getSeedEvent } from "@/lib/events/seed";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function EventPage({ params }: Props) {
  const { slug } = await params;
  const seed = getSeedEvent(slug);
  if (!seed) notFound();

  const initialEvent = {
    slug: seed.slug,
    name: seed.name,
    venueName: seed.venueName,
    venueLat: seed.venueLat,
    venueLng: seed.venueLng,
    lumaUrl: seed.lumaUrl,
    startsAt: seed.startsAt,
    endsAt: seed.endsAt,
  };

  return <EventExperience slug={slug} initialEvent={initialEvent} />;
}
