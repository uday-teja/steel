import { Check, Download, Link2, Share2 } from 'lucide-react';
import { useEffect, useState } from 'react';

const icon = 'h-4 w-4';

/* Brand glyphs (Lucide has no brand icons). Simple, monochrome. */
const WhatsApp = () => (
  <svg viewBox="0 0 24 24" className={icon} fill="currentColor" aria-hidden="true">
    <path d="M12.04 2a9.9 9.9 0 0 0-8.5 15l-1.4 5 5.2-1.4A9.9 9.9 0 1 0 12.04 2Zm0 18.1a8.2 8.2 0 0 1-4.2-1.15l-.3-.18-3.1.82.83-3-.2-.31a8.2 8.2 0 1 1 6.97 3.82Zm4.5-6.15c-.25-.12-1.46-.72-1.69-.8-.23-.08-.39-.12-.56.13-.16.24-.64.8-.79.96-.14.17-.29.19-.54.06-.25-.12-1.04-.38-1.99-1.22a7.4 7.4 0 0 1-1.37-1.7c-.14-.25 0-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.17.04-.31-.02-.43-.06-.13-.56-1.35-.77-1.85-.2-.48-.41-.42-.56-.42h-.48a.92.92 0 0 0-.66.31c-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.57.13.16 1.75 2.67 4.24 3.74.59.26 1.05.41 1.41.52.6.19 1.13.16 1.56.1.47-.07 1.46-.6 1.67-1.18.2-.58.2-1.07.14-1.18-.06-.1-.22-.16-.47-.29Z" />
  </svg>
);
const LinkedIn = () => (
  <svg viewBox="0 0 24 24" className={icon} fill="currentColor" aria-hidden="true">
    <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
  </svg>
);
const XLogo = () => (
  <svg viewBox="0 0 24 24" className={icon} fill="currentColor" aria-hidden="true">
    <path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.21-6.82-5.97 6.82H1.67l7.73-8.84L1.25 2.25h6.83l4.71 6.23 5.45-6.23Zm-1.16 17.52h1.83L7.08 4.13H5.12l11.96 15.64Z" />
  </svg>
);
const Facebook = () => (
  <svg viewBox="0 0 24 24" className={icon} fill="currentColor" aria-hidden="true">
    <path d="M24 12.07C24 5.41 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.5 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.62 23.1 24 18.1 24 12.07Z" />
  </svg>
);

export function ShareBar({ url, title, text, imageUrl, label = 'Share' }: { url: string; title: string; text?: string; imageUrl?: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const [canNative, setCanNative] = useState(false);
  useEffect(() => setCanNative(typeof navigator !== 'undefined' && typeof navigator.share === 'function'), []);

  const msg = text ? `${title}\n\n${text}` : title;
  const enc = encodeURIComponent;
  const links = [
    { name: 'WhatsApp', href: `https://wa.me/?text=${enc(`${msg}\n\n${url}`)}`, Icon: WhatsApp },
    { name: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`, Icon: LinkedIn },
    { name: 'X', href: `https://x.com/intent/post?text=${enc(title)}&url=${enc(url)}`, Icon: XLogo },
    { name: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`, Icon: Facebook },
  ];

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const native = async () => {
    try {
      await navigator.share({ title, text: text ?? title, url });
    } catch {
      /* user cancelled */
    }
  };

  const btn = 'inline-flex h-9 items-center gap-2 border border-rule px-3 font-sans text-[12px] font-medium text-ink-2 transition-colors hover:border-ink hover:text-ink';

  return (
    <div className="no-print">
      <p className="kicker mb-2 text-muted">{label}</p>
      <div className="flex flex-wrap gap-2">
        {canNative && (
          <button type="button" onClick={native} className={`${btn} border-ink text-ink`}>
            <Share2 className={icon} aria-hidden="true" /> Share
          </button>
        )}
        {links.map(({ name, href, Icon }) => (
          <a key={name} href={href} target="_blank" rel="noopener noreferrer" className={btn} aria-label={`Share on ${name}`}>
            <Icon />
            <span className="hidden sm:inline">{name}</span>
          </a>
        ))}
        <button type="button" onClick={copy} className={btn} aria-live="polite">
          {copied ? <Check className={icon} aria-hidden="true" /> : <Link2 className={icon} aria-hidden="true" />}
          {copied ? 'Copied' : 'Copy link'}
        </button>
        {imageUrl && (
          <a href={imageUrl} download className={btn} target="_blank" rel="noopener">
            <Download className={icon} aria-hidden="true" />
            <span>Share card</span>
          </a>
        )}
      </div>
    </div>
  );
}
