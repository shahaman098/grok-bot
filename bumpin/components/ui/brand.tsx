import { ArrowUpRight } from "lucide-react";

export function Brand() {
  return (
    <span className="brand">
      <span className="brand-mark" aria-hidden="true">
        <ArrowUpRight size={20} strokeWidth={3} />
      </span>
      <span>
        BumpIn<span className="brand-dot">.</span>
      </span>
    </span>
  );
}
