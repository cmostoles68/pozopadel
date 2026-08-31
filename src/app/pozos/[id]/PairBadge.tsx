export default function PairBadge({
  number,
  className,
}: {
  number: number;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-white text-base font-bold shrink-0 ${
        className ?? "bg-primary-container"
      }`}
    >
      {number}
    </span>
  );
}
