export default function Logo({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect
        x="8"
        y="8"
        width="38"
        height="30"
        rx="4"
        fill="none"
        stroke="var(--color-ghost)"
        strokeWidth="3"
        strokeDasharray="4 5.5"
      />
      <rect
        x="18"
        y="26"
        width="38"
        height="30"
        rx="4"
        fill="var(--color-ink)"
        stroke="var(--color-signal)"
        strokeWidth="3.5"
      />
      <circle cx="27" cy="35" r="3" fill="var(--color-signal)" />
    </svg>
  );
}
