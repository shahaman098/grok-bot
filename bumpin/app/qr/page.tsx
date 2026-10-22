import Image from "next/image";
import Link from "next/link";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { Brand } from "@/components/ui/brand";
import { GROK_BOT_LONDON } from "@/lib/events/seed";

export default async function QrPage() {
  const incoming = await headers();
  const host = incoming.get("host");
  const protocol =
    incoming.get("x-forwarded-proto")?.split(",")[0].trim() ??
    (host?.startsWith("localhost") || host?.startsWith("127.0.0.1")
      ? "http"
      : "https");
  // Keep review-deployment QR entry on the same release the presenter opened.
  const base = host
    ? `${protocol}://${host}`
    : (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000");
  const eventUrl = `${base.replace(/\/$/, "")}/e/${GROK_BOT_LONDON.slug}`;
  // Generated locally: no third-party request, so a restricted venue network can't break the QR.
  const qrSrc = await QRCode.toDataURL(eventUrl, {
    width: 640,
    margin: 2,
    errorCorrectionLevel: "M",
  });

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
