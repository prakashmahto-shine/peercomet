/**
 * Generates a clean, professional user initials avatar SVG data URL when no custom photo is uploaded.
 * Prevents brand logo duplication as user profile pictures.
 */
export function getUserAvatar(name?: string, avatar?: string): string {
  if (avatar && !avatar.includes('/brand/')) {
    return avatar;
  }
  const cleanName = (name || 'User').trim();
  const initials = cleanName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0]?.toUpperCase())
    .join('') || 'U';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <defs>
    <linearGradient id="avGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0C3B6E"/>
      <stop offset="100%" stop-color="#1D4ED8"/>
    </linearGradient>
  </defs>
  <rect width="128" height="128" rx="64" fill="url(#avGrad)"/>
  <text x="50%" y="54%" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="48" font-weight="700" fill="#FFFFFF" text-anchor="middle" dominant-baseline="middle" letter-spacing="1">${initials}</text>
</svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
