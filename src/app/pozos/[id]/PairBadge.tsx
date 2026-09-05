export default function PairBadge({
  number,
  className,
}: {
  number: number;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-primary-container text-on-primary-container text-base font-bold shrink-0 ${
        className ?? "w-9 h-9"
      }`}
    >
      {number}
    </span>
  );
}
