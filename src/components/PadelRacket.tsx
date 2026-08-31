export default function PadelRacket({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Racket head */}
      <ellipse
        cx="60"
        cy="45"
        rx="38"
        ry="42"
        fill="#1e40af"
        stroke="#1e3a8a"
        strokeWidth="3"
      />
      {/* Holes pattern */}
      {[
        [48, 28], [60, 28], [72, 28],
        [42, 38], [54, 38], [66, 38], [78, 38],
        [48, 48], [60, 48], [72, 48],
        [42, 58], [54, 58], [66, 58], [78, 58],
        [48, 68], [60, 68], [72, 68],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="3.5" fill="#1e3a8a" opacity="0.5" />
      ))}
      {/* Handle */}
      <rect
        x="52"
        y="82"
        width="16"
        height="28"
        rx="4"
        fill="#92400e"
        stroke="#78350f"
        strokeWidth="2"
      />
      {/* Grip tape lines */}
      <line x1="52" y1="88" x2="68" y2="88" stroke="#78350f" strokeWidth="1" />
      <line x1="52" y1="93" x2="68" y2="93" stroke="#78350f" strokeWidth="1" />
      <line x1="52" y1="98" x2="68" y2="98" stroke="#78350f" strokeWidth="1" />
      <line x1="52" y1="103" x2="68" y2="103" stroke="#78350f" strokeWidth="1" />
      {/* Ball */}
      <circle cx="95" cy="25" r="8" fill="#facc15" stroke="#eab308" strokeWidth="2" />
    </svg>
  );
}
