"use client";

import Image from "next/image";
import { memo, useMemo } from "react";
import { avatarDataUri } from "@/lib/avatars";

export const Avatar = memo(function Avatar({
  seed,
  size = 48,
  className = "",
}: {
  seed: string;
  size?: number;
  className?: string;
}) {
  const src = useMemo(() => avatarDataUri(seed), [seed]);
  return (
    <Image
      unoptimized
      src={src}
      width={size}
      height={size}
      alt=""
      className={`avatar ${className}`}
      style={{ width: size, height: size }}
    />
  );
});
