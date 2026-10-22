"use client";

import { Avatar } from "@/components/ui/avatar";
import { AttendeeList } from "@/components/event/attendee-list";

import "maplibre-gl/dist/maplibre-gl.css";
import { getVersion, setWorkerUrl } from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import Map, {
  Marker,
  NavigationControl,
  type MapRef,
} from "react-map-gl/maplibre";
import { getMapStyle } from "@/lib/map/style";
import type { PublicAttendee } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MapPin } from "lucide-react";
import conciergeStyles from "@/components/concierge/styles";

setWorkerUrl(`/maplibre/maplibre-gl-worker.mjs?v=${getVersion()}`);

type EventPin = {
  lat: number;
  lng: number;
  name: string;
};

type Props = {
  venue: EventPin;
  attendees: PublicAttendee[];
  selectedId: string | null;
  matchedIds?: string[];
  onSelectAttendee: (attendee: PublicAttendee) => void;
  onSelectEvent: () => void;
  className?: string;
};

export function AttendeeMap({
  venue,
  attendees,
  selectedId,
  matchedIds = [],
  onSelectAttendee,
  onSelectEvent,
  className,
}: Props) {
  const [mapFailed, setMapFailed] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef<MapRef>(null);
  const focused = attendees.find(
    (a) => a.membershipId === selectedId && matchedIds.includes(a.membershipId),
  );
  const focusedLng = focused?.displayLng;
  const focusedLat = focused?.displayLat;
  useEffect(() => {
    if (!mapLoaded || focusedLng === undefined || focusedLat === undefined)
      return;
    const height = mapRef.current?.getContainer().clientHeight ?? 500;
    mapRef.current?.easeTo({
      center: [focusedLng, focusedLat],
      padding: {
        top: Math.min(190, height * 0.35),
        bottom: Math.min(70, height * 0.15),
        left: 30,
        right: 30,
      },
      duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? 0
        : 600,
    });
  }, [mapLoaded, focusedLng, focusedLat]);
  useEffect(() => {
    if (mapLoaded || mapFailed) return;
    const timeout = window.setTimeout(() => setMapFailed(true), 12000);
    return () => window.clearTimeout(timeout);
  }, [mapLoaded, mapFailed]);
  const styleUrl = useMemo(() => getMapStyle(), []);

  const visibleAttendees = attendees.filter(
    (a) =>
      Number.isFinite(a.displayLat) &&
      Number.isFinite(a.displayLng) &&
      !a.isSelf,
  );

  if (mapFailed)
    return (
      <div className={cn("map-fallback", className)}>
        <p role="status" className="info-note mb-4">
          Map unavailable. You can still meet everyone below.
        </p>
        <button
          type="button"
          className="secondary-button mb-4"
          onClick={onSelectEvent}
          aria-label="Event venue"
        >
          Event details
        </button>
        <button
          type="button"
          className="secondary-button mb-4"
          onClick={() => {
            setMapLoaded(false);
            setMapFailed(false);
          }}
        >
          Retry map
        </button>
        <AttendeeList
          attendees={visibleAttendees}
          onSelect={onSelectAttendee}
        />
      </div>
    );

  return (
    <div className={cn("relative h-full w-full", className)}>
      <Map
        ref={mapRef}
        onLoad={() => setMapLoaded(true)}
        onError={() => setMapFailed(true)}
        initialViewState={{
          longitude: venue.lng,
          latitude: venue.lat,
          zoom: 17,
        }}
        style={{ width: "100%", height: "100%" }}
        mapStyle={styleUrl}
        attributionControl={{ compact: false }}
      >
        <NavigationControl
          position="bottom-right"
          style={{ marginBottom: 42 }}
          showCompass={false}
        />

        <Marker longitude={venue.lng} latitude={venue.lat} anchor="bottom">
          <button
            type="button"
            onClick={onSelectEvent}
            className="flex flex-col items-center gap-0.5"
            aria-label="Event venue"
          >
            <span className="rounded-full bg-lime-300 p-3 text-slate-950 shadow-lg">
              <MapPin className="h-5 w-5" />
            </span>
            <span className="max-w-[120px] truncate rounded-md bg-slate-950/80 px-2 py-0.5 text-[10px] font-medium text-sky-100">
              {venue.name}
            </span>
          </button>
        </Marker>

        {visibleAttendees.map((a) => (
          <Marker
            key={a.membershipId}
            longitude={a.displayLng}
            latitude={a.displayLat}
            anchor="center"
          >
            <button
              type="button"
              onClick={() => onSelectAttendee(a)}
              className={cn(
                "rounded-full border-2 p-0.5 transition-transform",
                selectedId === a.membershipId
                  ? "border-lime-300 scale-110"
                  : "border-white/80",
                matchedIds.includes(a.membershipId) && conciergeStyles.marker,
              )}
              data-concierge-match={
                matchedIds.includes(a.membershipId) || undefined
              }
              aria-pressed={selectedId === a.membershipId}
              aria-label={`Open profile for ${a.displayName}`}
            >
              <Avatar seed={a.avatarSeed} photo={a.avatarUrl} size={44} />
              {matchedIds.includes(a.membershipId) && (
                <span className={conciergeStyles.markerRank}>
                  {matchedIds.indexOf(a.membershipId) + 1}
                </span>
              )}
            </button>
          </Marker>
        ))}
      </Map>
      {!mapLoaded && (
        <p role="status" className="map-status">
          Loading the event map…
        </p>
      )}
    </div>
  );
}
