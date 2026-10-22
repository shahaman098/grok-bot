"use client";

import Image from "next/image";
import { memo, useMemo, useState } from "react";
import { normalizeLinkedInPhoto } from "@/lib/auth/linkedin";
import { avatarDataUri } from "@/lib/avatars";

export const Avatar = memo(function Avatar({
  seed,
  photo,
  size = 48,
  className = "",
}: {
  seed: string;
  photo?: string | null;
  size?: number;
  className?: string;
}) {
  const fallback = useMemo(() => avatarDataUri(seed), [seed]);
  const remote = normalizeLinkedInPhoto(photo);
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  const src = remote && failedPhoto !== remote ? remote : fallback;
  return (
    <Image
      unoptimized
      src={src}
      width={size}
      height={size}
      alt=""
      referrerPolicy="no-referrer"
      onError={() => setFailedPhoto(remote)}
      className={`avatar ${className}`}
      style={{ width: size, height: size }}
    />
  );
});
