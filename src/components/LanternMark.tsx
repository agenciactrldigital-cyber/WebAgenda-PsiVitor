interface LanternMarkProps {
  className?: string;
}

export function LanternMark({ className = 'w-6 h-6' }: LanternMarkProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M12 6.5C12 4.84315 13.7909 3.5 16 3.5C18.2091 3.5 20 4.84315 20 6.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M10.5 9.5H21.5L23 23.5H9L10.5 9.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 23.5H23.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M9.5 9.5H22.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M16 13.2C16 13.2 18.2 15.6 18.2 17.3C18.2 18.515 17.215 19.5 16 19.5C14.785 19.5 13.8 18.515 13.8 17.3C13.8 15.6 16 13.2 16 13.2Z"
        fill="#B8732A"
        fillOpacity="0.28"
        stroke="#B8732A"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}
