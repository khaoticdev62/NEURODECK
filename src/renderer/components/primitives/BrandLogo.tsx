export function BrandLogo({
  className = "h-16 w-16",
  "aria-hidden": ariaHidden = true,
}: {
  className?: string;
  "aria-hidden"?: boolean;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden={ariaHidden}
    >
      <defs>
        {/* Glow filter for the N mark */}
        <filter id="logo-glow-strong" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="10" result="blur1" />
          <feGaussianBlur stdDeviation="20" result="blur2" />
          <feMerge>
            <feMergeNode in="blur2" />
            <feMergeNode in="blur1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="logo-glow-soft" x="-15%" y="-15%" width="130%" height="130%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Cyan glow gradient for strokes */}
        <linearGradient id="logo-stroke-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--nd-accent-primary)" />
          <stop offset="50%" stopColor="var(--nd-accent-secondary, #00C2D9)" />
          <stop offset="100%" stopColor="var(--nd-accent-primary)" />
        </linearGradient>
        {/* Node fill gradient */}
        <radialGradient id="logo-node-grad" cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="45%" stopColor="var(--nd-accent-primary)" />
          <stop offset="100%" stopColor="var(--nd-accent-secondary, #00C2D9)" />
        </radialGradient>
      </defs>

      {/* Subtle grid lines underlay */}
      <g opacity="0.05" stroke="var(--nd-accent-primary)" strokeWidth="1">
        <line x1="0" y1="128" x2="512" y2="128" />
        <line x1="0" y1="256" x2="512" y2="256" />
        <line x1="0" y1="384" x2="512" y2="384" />
        <line x1="128" y1="0" x2="128" y2="512" />
        <line x1="256" y1="0" x2="256" y2="512" />
        <line x1="384" y1="0" x2="384" y2="512" />
      </g>

      {/* Circuit trace connectors underlay */}
      <g opacity="0.16" stroke="var(--nd-accent-primary)" strokeWidth="1.5" fill="none">
        <line x1="64" y1="148" x2="152" y2="148" />
        <line x1="360" y1="148" x2="448" y2="148" />
        <line x1="64" y1="364" x2="152" y2="364" />
        <line x1="360" y1="364" x2="448" y2="364" />
        <line x1="64" y1="256" x2="100" y2="256" />
        <line x1="412" y1="256" x2="448" y2="256" />
        {/* Small circuit junction dots */}
        <circle cx="100" cy="256" r="3" />
        <circle cx="412" cy="256" r="3" />
        <circle cx="64" cy="148" r="2" />
        <circle cx="64" cy="364" r="2" />
        <circle cx="448" cy="148" r="2" />
        <circle cx="448" cy="364" r="2" />
      </g>

      {/* Left vertical stroke */}
      <line
        x1="152"
        y1="148"
        x2="152"
        y2="364"
        stroke="url(#logo-stroke-grad)"
        strokeWidth="22"
        strokeLinecap="round"
        filter="url(#logo-glow-soft)"
      />

      {/* Right vertical stroke */}
      <line
        x1="360"
        y1="148"
        x2="360"
        y2="364"
        stroke="url(#logo-stroke-grad)"
        strokeWidth="22"
        strokeLinecap="round"
        filter="url(#logo-glow-soft)"
      />

      {/* Diagonal stroke */}
      <line
        x1="152"
        y1="148"
        x2="360"
        y2="364"
        stroke="url(#logo-stroke-grad)"
        strokeWidth="22"
        strokeLinecap="round"
        filter="url(#logo-glow-soft)"
      />

      {/* Glow bloom layer on top */}
      <g stroke="var(--nd-accent-primary)" strokeWidth="4" opacity="0.9" strokeLinecap="round" filter="url(#logo-glow-strong)">
        <line x1="152" y1="148" x2="152" y2="364" />
        <line x1="360" y1="148" x2="360" y2="364" />
        <line x1="152" y1="148" x2="360" y2="364" />
      </g>

      {/* Node dots at junction points */}
      <g filter="url(#logo-glow-strong)">
        <circle cx="152" cy="148" r="16" fill="url(#logo-node-grad)" />
        <circle cx="360" cy="148" r="16" fill="url(#logo-node-grad)" />
        <circle cx="152" cy="364" r="16" fill="url(#logo-node-grad)" />
        <circle cx="360" cy="364" r="16" fill="url(#logo-node-grad)" />
        <circle cx="256" cy="256" r="12" fill="url(#logo-node-grad)" />
      </g>

      {/* Node center lights */}
      <g fill="#ffffff">
        <circle cx="152" cy="148" r="7" opacity="0.95" />
        <circle cx="360" cy="148" r="7" opacity="0.95" />
        <circle cx="152" cy="364" r="7" opacity="0.95" />
        <circle cx="360" cy="364" r="7" opacity="0.95" />
        <circle cx="256" cy="256" r="5" opacity="0.9" />
      </g>

      {/* Corner scan-frame brackets */}
      <g stroke="var(--nd-accent-primary)" strokeWidth="2.5" fill="none" opacity="0.5">
        <polyline points="72,100 72,72 100,72" />
        <polyline points="412,72 440,72 440,100" />
        <polyline points="72,412 72,440 100,440" />
        <polyline points="440,412 440,440 412,440" />
      </g>

      {/* Version/build dot bottom-right */}
      <circle cx="420" cy="420" r="5" fill="var(--nd-accent-error)" opacity="0.8" />
      <circle cx="420" cy="420" r="9" fill="none" stroke="var(--nd-accent-error)" strokeWidth="1.5" opacity="0.4" />
    </svg>
  );
}
