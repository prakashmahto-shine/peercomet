const name = 'PeerComet';
const domain = 'peercomet.com';
const parentDomain = 'shine.com';

export const BRAND = {
  name,
  domain,
  parentDomain,
  // e.g. "PeerComet by shine.com"
  tagline: `${name} by ${parentDomain}`,
} as const;

