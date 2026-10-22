"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { LocateFixed, MapPin, X } from "lucide-react";
import { Marker, type MapRef } from "react-map-gl/maplibre";
import "./private-location.css";

type Point = { latitude: number; longitude: number; accuracy: number };
type Props = {
  mapRef: RefObject<MapRef | null>;
  ready: boolean;
  venueLat: number;
  venueLng: number;
  onShowAttendees: () => void;
};
const PRIVATE_NOTE = "Only you can see your location.";

/** One-shot GPS, kept only in this mounted map. Never submitted or persisted. */
export function PrivateLocation({ mapRef, ready, venueLat, venueLng, onShowAttendees }: Props) {
  const [point, setPoint] = useState<Point | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(PRIVATE_NOTE);
  const request = useRef(0);
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const invalidate = useCallback(() => {
    request.current++;
    clearTimeout(timeout.current);
  }, []);
  const moveMap = useCallback((latitude: number, longitude: number, zoom: number) => {
    const height = mapRef.current?.getContainer().clientHeight ?? 400;
    mapRef.current?.easeTo({
      center: [longitude, latitude], zoom,
      padding: { top: 20, bottom: Math.max(20, Math.min(240, height - 80)), left: 30, right: 30 },
      duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 600,
    });
  }, [mapRef]);

  useEffect(() => {
    const hide = () => {
      if (!document.hidden) return;
      invalidate();
      setPoint(null);
      setBusy(false);
      setMessage(PRIVATE_NOTE);
      moveMap(venueLat, venueLng, 17);
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      invalidate();
    };
  }, [invalidate, moveMap, venueLat, venueLng]);

  function locate() {
    if (busy || !ready) return;
    if (!window.isSecureContext || !navigator.geolocation) {
      setMessage("Location is unavailable in this browser. Open BumpIn directly in Safari or Chrome over HTTPS.");
      return;
    }
    const id = ++request.current;
    setPoint(null);
    setBusy(true);
    setMessage("Finding your location… Allow location when your browser asks.");
    const fail = (code: number) => {
      if (id !== request.current) return;
      request.current++;
      clearTimeout(timeout.current);
      setBusy(false);
      setMessage(code === 1
        ? "Location permission is blocked. Allow location for this site in your browser settings, then try again."
        : code === 3
          ? "Location timed out. Check your phone’s Location Services and try again."
          : "Your phone could not find a location. Check Location Services and try again.");
    };
    // Some embedded browsers never settle their native geolocation callback.
    timeout.current = setTimeout(() => fail(3), 11_000);
    try {
      navigator.geolocation.getCurrentPosition(({ coords }) => {
        if (id !== request.current) return;
        if (!Number.isFinite(coords.latitude) || Math.abs(coords.latitude) > 90 ||
            !Number.isFinite(coords.longitude) || Math.abs(coords.longitude) > 180 ||
            !Number.isFinite(coords.accuracy) || coords.accuracy < 0) {
          fail(2);
          return;
        }
        request.current++;
        clearTimeout(timeout.current);
        setBusy(false);
        setPoint({ latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy });
        setMessage(`Your approximate location · accuracy ±${Math.max(1, Math.round(coords.accuracy))} m. Only visible to you.`);
        moveMap(coords.latitude, coords.longitude, 16);
      }, (error) => fail(error.code), {
        enableHighAccuracy: true, timeout: 10_000, maximumAge: 0,
      });
    } catch {
      fail(2);
    }
  }

  function clear() {
    request.current++;
    clearTimeout(timeout.current);
    setBusy(false);
    setPoint(null);
    setMessage("Your location is hidden.");
    moveMap(venueLat, venueLng, 17);
  }

  const expanded = !!point || busy || (message !== PRIVATE_NOTE && message !== "Your location is hidden.");
  return <>
    <section className={`private-location-controls ${expanded ? "is-expanded" : ""}`} aria-label="Your private map location">
      <div className="private-location-actions">
        <button type="button" className="secondary-button" onClick={locate} disabled={busy || !ready}>
          <LocateFixed size={18} />{busy ? "Locating…" : "Locate me"}
        </button>
        {expanded && <button type="button" className="icon-button" aria-label={point || busy ? "Hide my location" : "Dismiss location message"} onClick={clear}><X size={18} /></button>}
      </div>
      <button type="button" className="secondary-button private-location-return" aria-label="Back to event venue" disabled={!ready}
        onClick={onShowAttendees}><MapPin size={18} /> Show attendees at venue</button>
      <p role="status" className={expanded ? undefined : "private-location-message-hidden"}>{message}</p>
    </section>
    {point && <Marker latitude={point.latitude} longitude={point.longitude} anchor="center" style={{ zIndex: 4, pointerEvents: "none" }}>
      <div className="private-location-marker" role="img" aria-label="Your approximate location, visible only to you">
        <span className="private-location-dot" /><span className="private-location-label">You · private</span>
      </div>
    </Marker>}
  </>;
}
