/**
 * Product branding. Change the name here and every place the site shows it updates
 * (page titles, header/footer, logo text, messages). index.html picks it up at build time
 * via vite.config.ts. Logo/favicon images are separate files in public/brand/.
 * The backend's user-facing name is BRAND_NAME in backend/config.py.
 */
const name = 'PeerPath';
const parentDomain = 'shine.com';

export const BRAND = {
  name,
  parentDomain,
  // e.g. "PeerPath by shine.com"
  tagline: `${name} by ${parentDomain}`,
} as const;
