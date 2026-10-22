"use client";

import { MobileSheet } from "@/components/ui/mobile-sheet";
import { ArrowUpRight, CalendarDays, MapPin } from "lucide-react";

type EventMeta = {
  name: string;
  venueName: string;
  lumaUrl: string;
  startsAt: string;
  endsAt: string;
};
type Props = {
  event: EventMeta;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};
function formatWhen(start: string, end: string) {
  const options = { timeZone: "Europe/London" };
  return `${new Date(start).toLocaleDateString("en-GB", { ...options, weekday: "short", day: "numeric", month: "short" })} · ${new Date(start).toLocaleTimeString("en-GB", { ...options, hour: "2-digit", minute: "2-digit" })}–${new Date(end).toLocaleTimeString("en-GB", { ...options, hour: "2-digit", minute: "2-digit" })} (London)`;
}
export function EventInfoSheet({ event, open, onOpenChange }: Props) {
  return (
    <MobileSheet
      open={open}
      onOpenChange={onOpenChange}
      title="The event"
      description="The place bringing everyone together."
      closeLabel="Close event details"
      footer={
        <a
          href={event.lumaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="primary-button"
        >
          View event on Luma
          <ArrowUpRight size={20} />
        </a>
      }
    >
      <h2 className="event-sheet-name">{event.name}</h2>
      <div className="event-detail-row">
        <MapPin size={20} />
        <p>{event.venueName}</p>
      </div>
      <div className="event-detail-row">
        <CalendarDays size={20} />
        <p>{formatWhen(event.startsAt, event.endsAt)}</p>
      </div>
      <div className="info-note">
        Your profile is shared only when you choose to be visible. Map markers
        show the event area.
      </div>
    </MobileSheet>
  );
}
