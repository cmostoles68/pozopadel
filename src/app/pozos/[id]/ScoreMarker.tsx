export default function ScoreMarker({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`relative inline-flex items-center justify-center rounded-lg border border-white/25 bg-black/80 p-[3px] shadow-[inset_0_1px_2px_rgba(0,0,0,0.9)] ${className}`}
    >
      <span className="inline-flex min-w-9 items-center justify-center rounded-[5px] bg-[#0c1105] px-2.5 py-1 font-display font-black text-xl text-secondary-container leading-none [text-shadow:0_0_8px_rgba(195,244,0,0.55)]">
        {children}
      </span>
    </span>
  );
}
