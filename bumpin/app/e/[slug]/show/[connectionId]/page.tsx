import { ShowStage } from "@/components/matching/show-stage";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Love at First Bot — BumpIn", robots: { index: false, follow: false }, referrer: "no-referrer" };
export default async function StagePage({ params }: { params: Promise<{ slug: string; connectionId: string }> }) {
  const { slug, connectionId } = await params;
  return <ShowStage slug={slug} connectionId={connectionId} />;
}
