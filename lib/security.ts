/**
 * Client-side defenses for uploads, search filters, and free-text fields.
 * Supabase PostgREST still parameterizes most queries; these helpers close
 * gaps where strings are interpolated into `.or()` / LIKE patterns, and
 * harden file uploads beyond trusting the browser Content-Type.
 */

/** Raster images only — SVG/HTML can carry scripts if ever served inline. */
export const ALLOWED_IMAGE_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
] as const);

export const ALLOWED_IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

/** Cap search strings so filter payloads stay small. */
export const MAX_SEARCH_QUERY_LEN = 80;

/** Default max for free-text comments / descriptions. */
export const MAX_USER_TEXT_LEN = 4000;

/**
 * Strip characters that break PostgREST `.or()` filter grammar and LIKE wildcards.
 * Prefer this over interpolating raw user input into `.or(\`…${q}…\`)`.
 */
export function sanitizeSearchQuery(raw: unknown, maxLen = MAX_SEARCH_QUERY_LEN): string {
  let s = String(raw ?? '')
    .normalize('NFKC')
    .trim()
    .slice(0, maxLen);
  // Remove PostgREST filter / quoting / wildcard metacharacters
  s = s.replace(/[%_,.()"'\\:*]/g, ' ');
  s = s.replace(/[\u0000-\u001F\u007F]/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

/** Escape `%` and `_` for use inside a LIKE / ilike pattern value. */
export function escapeLikePattern(raw: string): string {
  return String(raw ?? '').replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

/**
 * Build a safe PostgREST `.or()` fragment for multi-column ilike search.
 * Returns null when the query is empty after sanitization.
 */
export function buildIlikeOrFilter(columns: string[], rawQuery: unknown): string | null {
  const q = sanitizeSearchQuery(rawQuery);
  if (!q || columns.length === 0) return null;
  // Values are already stripped of filter metacharacters; still quote for safety.
  const quoted = `"%${q.replace(/"/g, '')}%"`;
  return columns.map((col) => `${col}.ilike.${quoted}`).join(',');
}

/**
 * Sanitize free-text before insert/update (repairs, products, reviews, etc.).
 * React already escapes on render; this removes control chars / HTML tags and caps length.
 */
export function sanitizeUserText(raw: unknown, maxLen = MAX_USER_TEXT_LEN): string {
  let s = String(raw ?? '').normalize('NFKC');
  s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
  // Strip tags (scripting payloads pasted into textareas)
  s = s.replace(/<\/?[a-zA-Z][^>]*>/g, '');
  s = s.replace(/javascript\s*:/gi, '');
  s = s.replace(/on\w+\s*=/gi, '');
  s = s.replace(/\r\n/g, '\n').trim();
  if (s.length > maxLen) s = s.slice(0, maxLen);
  return s;
}

/** Short labels / names (product title, customer name). */
export function sanitizeUserLabel(raw: unknown, maxLen = 200): string {
  return sanitizeUserText(raw, maxLen).replace(/\s+/g, ' ');
}

/** Allow only http(s) image URLs — blocks javascript:/data:/file: paste attacks. */
export function sanitizeHttpUrl(raw: unknown, opts?: { allowHttp?: boolean }): string | null {
  const t = String(raw ?? '').trim();
  if (!t) return '';
  if (/[\u0000-\u001F\u007F]/.test(t)) return null;
  let parsed: URL;
  try {
    parsed = new URL(t);
  } catch {
    return null;
  }
  const proto = parsed.protocol.toLowerCase();
  if (proto === 'https:') return parsed.toString();
  if (opts?.allowHttp && proto === 'http:') return parsed.toString();
  return null;
}

export function sanitizeImageUrl(raw: unknown): string | null {
  return sanitizeHttpUrl(raw, { allowHttp: true });
}

export type ImageValidationOk = {
  ok: true;
  mime: string;
  ext: string;
};

export type ImageValidationErr = {
  ok: false;
  error: string;
};

/** Validate browser-reported type + filename extension (call before upload). */
export function validateImageFileMeta(file: File): ImageValidationOk | ImageValidationErr {
  if (!file) return { ok: false, error: 'No file selected' };

  const mime = String(file.type || '').toLowerCase().trim();
  if (!ALLOWED_IMAGE_MIME.has(mime as 'image/jpeg')) {
    return {
      ok: false,
      error: 'Only JPEG, PNG, WebP, or GIF images are allowed (no SVG or other formats).',
    };
  }

  const nameExt = (file.name.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const mimeExt = MIME_TO_EXT[mime] || nameExt;
  if (nameExt && !ALLOWED_IMAGE_EXT.has(nameExt)) {
    return { ok: false, error: `File extension .${nameExt} is not allowed.` };
  }
  // Prefer MIME-derived extension so spoofed .exe.jpg still becomes .jpg on disk
  const ext = mimeExt && ALLOWED_IMAGE_EXT.has(mimeExt) ? mimeExt : 'jpg';
  return { ok: true, mime: mime === 'image/jpg' ? 'image/jpeg' : mime, ext };
}

/** Magic-byte sniff — catches MIME spoofing (e.g. HTML renamed to .jpg). */
export async function sniffImageMagicBytes(file: File): Promise<ImageValidationOk | ImageValidationErr> {
  const meta = validateImageFileMeta(file);
  if (!meta.ok) return meta;

  const buf = await file.slice(0, 16).arrayBuffer();
  const b = new Uint8Array(buf);
  if (b.length < 3) return { ok: false, error: 'File is empty or corrupt.' };

  const isJpeg = b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  const isPng =
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47;
  const isGif =
    b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38;
  const isWebp =
    b[0] === 0x52 &&
    b[1] === 0x49 &&
    b[2] === 0x46 &&
    b[3] === 0x46 &&
    b.length >= 12 &&
    b[8] === 0x57 &&
    b[9] === 0x45 &&
    b[10] === 0x42 &&
    b[11] === 0x50;

  if (isJpeg) return { ok: true, mime: 'image/jpeg', ext: 'jpg' };
  if (isPng) return { ok: true, mime: 'image/png', ext: 'png' };
  if (isGif) return { ok: true, mime: 'image/gif', ext: 'gif' };
  if (isWebp) return { ok: true, mime: 'image/webp', ext: 'webp' };

  return {
    ok: false,
    error: 'File content is not a valid JPEG, PNG, WebP, or GIF image.',
  };
}

/** Accept attribute for file inputs — matches allowlist. */
export const IMAGE_FILE_ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif';
