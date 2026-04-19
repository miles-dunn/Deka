type DekaLogoProps = {
  className?: string;
  title?: string;
};

export function DekaLogo({ className, title = "Deka" }: DekaLogoProps) {
  return (
    <svg
      aria-label={title}
      className={className}
      role="img"
      viewBox="0 0 320 96"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <text
        fill="transparent"
        fontFamily="var(--font-display), sans-serif"
        fontSize="72"
        fontWeight="700"
        letterSpacing="-3"
        stroke="currentColor"
        strokeWidth="2.75"
        x="6"
        y="70"
      >
        DEKA
      </text>
    </svg>
  );
}
