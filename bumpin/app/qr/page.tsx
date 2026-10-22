import Image from "next/image";
import Link from "next/link";
import { Brand } from "@/components/ui/brand";
import { GROK_BOT_LONDON } from "@/lib/events/seed";

export default function QrPage() {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const eventUrl = `${base.replace(/\/$/, "")}/e/${GROK_BOT_LONDON.slug}`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(eventUrl)}`;

  return (
    <main className="home-page">
      <Brand />
      <div>
        <p className="eyebrow">ONE SCAN. A NEW CONNECTION.</p>
        <h1 className="mt-3">
          Find your
          <br />
          people.
        </h1>
      </div>
      <Image
        unoptimized
        width={320}
        height={320}
        src={qrSrc}
        alt="QR code for event join link"
        className="qr-code"
      />
      <p className="muted w-full text-center text-sm">
        Scan to join {GROK_BOT_LONDON.name}.
      </p>
      <Link href={`/e/${GROK_BOT_LONDON.slug}`} className="primary-button">
        Open event
      </Link>
      <p className="muted w-full break-all text-center text-xs">{eventUrl}</p>
    </main>
  );
}
