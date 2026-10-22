export function Brand() {
  return (
    <span className="brand">
      <span className="brand-mark" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo.png" alt="" width={34} height={34} />
      </span>
      <span>
        BumpIn<span className="brand-dot">.</span>
      </span>
    </span>
  );
}
