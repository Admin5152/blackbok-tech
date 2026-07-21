/**
 * Shared HTML email chrome for BlackBox transactional mail.
 */
export function wrapEmailHtml(opts: {
  title: string;
  bodyHtml: string;
  ctaUrl?: string;
  ctaLabel?: string;
}): string {
  const cta =
    opts.ctaUrl && opts.ctaLabel
      ? `<p style="margin:24px 0 8px;">
          <a href="${opts.ctaUrl}" style="display:inline-block;background:#B38B21;color:#000;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:999px;">
            ${opts.ctaLabel}
          </a>
        </p>`
      : '';

  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
    <div style="background:#111;border:1px solid #222;border-radius:16px;padding:28px 24px;color:#f5f5f5;">
      <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#B38B21;font-weight:800;">BlackBox Tech</p>
      <h1 style="margin:0 0 16px;font-size:22px;line-height:1.25;color:#fff;">${opts.title}</h1>
      <div style="font-size:15px;line-height:1.55;color:#d4d4d4;">${opts.bodyHtml}</div>
      ${cta}
      <p style="margin:28px 0 0;font-size:12px;color:#737373;">
        BlackBox Ghana · KNUST Campus<br/>
        <a href="https://blackboxghana.com" style="color:#B38B21;">blackboxghana.com</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

export function plainFromHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
