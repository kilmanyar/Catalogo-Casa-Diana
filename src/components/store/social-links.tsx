import { SOCIALS } from "@/lib/catalog";

function Mark({ id, className }: { id: (typeof SOCIALS)[number]["id"]; className: string }) {
  if (id === "instagram") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden>
        <rect width="24" height="24" rx="6" fill="#E1306C" />
        <rect x="6.2" y="6.2" width="11.6" height="11.6" rx="3.4" fill="none" stroke="#fff" strokeWidth="1.7" />
        <circle cx="12" cy="12" r="2.7" fill="none" stroke="#fff" strokeWidth="1.7" />
        <circle cx="16.3" cy="7.7" r="0.9" fill="#fff" />
      </svg>
    );
  }
  if (id === "tiktok") {
    return (
      <svg viewBox="0 0 24 24" className={className} aria-hidden>
        <rect width="24" height="24" rx="6" fill="#111111" />
        <path fill="#25F4EE" d="M14.2 6.2c.7 1.5 1.8 2.5 3.3 2.9v1.7c-1.1 0-2.2-.3-3.2-.9v4.7a4.3 4.3 0 1 1-4.3-4.3c.2 0 .4 0 .6.1v1.8a2.5 2.5 0 1 0 1.8 2.4V6.2h1.8Z" />
        <path fill="#FE2C55" d="M14.7 6.5c.6 1.4 1.7 2.3 3.1 2.7v1.5c-1.1-.1-2.1-.4-3-1v4.8a4.1 4.1 0 1 1-4.1-4.1c.2 0 .4 0 .6.1v1.7a2.4 2.4 0 1 0 1.6 2.3V6.5h1.8Z" />
        <path fill="#fff" d="M14.4 6.4c.6 1.4 1.7 2.4 3.2 2.8v1.6c-1.1 0-2.1-.3-3-.9v4.6a4.2 4.2 0 1 1-4.2-4.2c.2 0 .4 0 .6.1v1.7a2.5 2.5 0 1 0 1.7 2.4V6.4h1.7Z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="12" cy="12" r="12" fill="#1877F2" />
      <path fill="#fff" d="M13.2 18.5v-5.1h1.7l.3-2h-2v-1.3c0-.6.2-1 1-1h1.1V7.3c-.2 0-.9-.1-1.7-.1-1.7 0-2.8 1-2.8 2.9v1.3H9.3v2h1.5v5.1h2.4Z" />
    </svg>
  );
}

export function SocialLinks({ compact = false }: { compact?: boolean }) {
  const box = compact
    ? "flex size-9 items-center justify-center rounded-full"
    : "flex size-11 items-center justify-center rounded-full";
  const icon = compact ? "size-6" : "size-7";
  return (
    <div className={compact ? "social-row" : "social-row"}>
      {SOCIALS.map((item) => (
        <a
          key={item.id}
          href={item.href}
          target="_blank"
          rel="noreferrer"
          aria-label={item.label}
          className={box}
        >
          <Mark id={item.id} className={icon} />
        </a>
      ))}
    </div>
  );
}
