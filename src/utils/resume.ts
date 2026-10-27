import { UserProfileData } from '../types';

// Resume freshness, computed from the real upload time (resumeUpdatedAt, ISO 8601)

export const hasResume = (profile?: UserProfileData | null): boolean => Boolean(profile?.resumeFileName);

export const resumeAgeDays = (profile?: UserProfileData | null): number | null => {
  if (!profile?.resumeFileName || !profile.resumeUpdatedAt) return null;
  const updated = new Date(profile.resumeUpdatedAt).getTime();
  if (Number.isNaN(updated)) return null;
  return Math.max(0, Math.floor((Date.now() - updated) / 86_400_000));
};

// Uploaded within the last `days` days
export const isResumeRecent = (profile?: UserProfileData | null, days = 30): boolean => {
  const age = resumeAgeDays(profile);
  return age !== null && age <= days;
};

// "today", "3 days ago", "2 months ago", "over a year ago"; '' when unknown
export const formatResumeAge = (profile?: UserProfileData | null): string => {
  const age = resumeAgeDays(profile);
  if (age === null) return '';
  if (age === 0) return 'today';
  if (age === 1) return 'yesterday';
  if (age < 30) return `${age} days ago`;
  const months = Math.floor(age / 30);
  if (months < 12) return months === 1 ? '1 month ago' : `${months} months ago`;
  return 'over a year ago';
};
