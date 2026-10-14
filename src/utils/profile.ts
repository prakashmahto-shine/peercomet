import { UserProfileData } from '../types';

// Mandatory fields required to complete registration:
// 1. Full name (first name or name)
// 2. Current city
// 3. Total experience (years)
// 4. Current role (designation + company, or currently not working)
// 5. Key skills (at least 1 skill)
// 6. Resume uploaded
export const getMissingMandatoryFields = (p?: UserProfileData | null): string[] => {
  if (!p) return ['Full Name', 'Current City', 'Total Experience', 'Current Role', 'Key Skills', 'Resume'];
  const missing: string[] = [];
  if (!Boolean((p.firstName || p.name || '').trim())) missing.push('Full Name');
  if (!Boolean((p.location || '').trim())) missing.push('Current City');
  if (p.totalExperienceYears === null || p.totalExperienceYears === undefined) missing.push('Total Experience');
  if (!Boolean(p.currentlyNotWorking) && (!Boolean((p.designation || '').trim()) || !Boolean((p.currentCompany || '').trim()))) {
    missing.push('Current Role');
  }
  if (!Boolean(p.skills && p.skills.length > 0)) missing.push('Key Skills');
  if (!Boolean(p.resumeFileName)) missing.push('Resume');
  return missing;
};

export const isProfileComplete = (p?: UserProfileData | null): boolean => {
  return getMissingMandatoryFields(p).length === 0;
};

// The career goal (trajectory) is set once the user chose a target role and company
export const isGoalSet = (p?: UserProfileData | null): boolean =>
  Boolean(p?.isCalibrated) || Boolean(p?.targetRole && (p?.dreamCompany || p?.targetCompany));
