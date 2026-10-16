import { UserProfileData } from '../types';

// Mandatory fields required to complete registration:
// 1. Full name (first name or name)
// 2. Mobile number (10 digits)
// 3. Current city
// 4. Total experience (years)
// 5. Current role (designation + company, or currently not working)
// 6. Key skills (at least 1 skill)
// 7. Resume uploaded
export const getMissingMandatoryFields = (p?: UserProfileData | null): string[] => {
  if (!p) return ['Full Name', 'Mobile Number', 'Current City', 'Total Experience', 'Current Role', 'Key Skills', 'Resume'];
  const missing: string[] = [];
  if (!Boolean((p.firstName || p.name || '').trim())) missing.push('Full Name');
  if (!Boolean((p.phone || '').trim())) missing.push('Mobile Number');
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

const ROLE_SUFFIX_REGEX = /\s+(?:senior|lead|associate|principal|junior|staff)?\s*(software|softwere|frontend|backend|fullstack|full-stack|web|ui|react|python|java|devops|data|ai|ml)?\s*(developer|engineer|architect|designer|analyst|specialist|programmer|consultant|manager|intern|lead)(\s+.*)?$/i;

/**
 * Ensures candidate full name never contains trailing job titles (e.g. "Prakash Mahto Software Developer" -> Name: "Prakash Mahto", Role: "Software Developer")
 */
export const parseNameAndRole = (rawName?: string, currentDesignation?: string): { cleanName: string; role: string } => {
  const normDesig = (currentDesignation || '').replace(/softwere/gi, 'Software').trim();
  const isGenericRole = !normDesig || /^(tech professional|candidate|developer|professional)$/i.test(normDesig);

  if (!rawName) return { cleanName: '', role: !isGenericRole ? normDesig : '' };
  const trimmed = rawName.trim();
  const match = trimmed.match(ROLE_SUFFIX_REGEX);
  if (match && match.index !== undefined && match.index > 0) {
    const cleanName = trimmed.slice(0, match.index).trim();
    let extractedRole = trimmed.slice(match.index).trim();
    extractedRole = extractedRole.replace(/softwere/gi, 'Software');
    extractedRole = extractedRole.replace(/\b[a-z]/g, c => c.toUpperCase());
    return {
      cleanName: cleanName || trimmed,
      role: (!isGenericRole ? normDesig : '') || extractedRole
    };
  }
  return { cleanName: trimmed, role: (!isGenericRole ? normDesig : '') };
};

/**
 * Accurately determines if an expert/creator card belongs to the currently logged in user,
 * checking creator IDs, user IDs, emails, and normalized clean full names.
 */
export const isSelfMentor = (
  expertOrCreator: { id?: string; name?: string; verifiedEmail?: string; ownerUserId?: string; owner_user_id?: string } | null | undefined,
  currentUser: { id?: string; creatorId?: string | null; name?: string; email?: string } | null | undefined,
  userProfile?: { name?: string; email?: string; mentorCreatorId?: string } | null | undefined
): boolean => {
  if (!expertOrCreator || !currentUser) return false;

  const expertId = (expertOrCreator.id || '').trim().toLowerCase();
  const currentUserId = (currentUser.id || '').trim().toLowerCase();
  const creatorId = (currentUser.creatorId || '').trim().toLowerCase();
  const profileMentorId = (userProfile?.mentorCreatorId || '').trim().toLowerCase();
  const expertOwnerId = ((expertOrCreator as any).ownerUserId || (expertOrCreator as any).owner_user_id || '').trim().toLowerCase();

  // 1. Direct ID checks
  if (expertId) {
    if (currentUserId && expertId === currentUserId) return true;
    if (creatorId && expertId === creatorId) return true;
    if (profileMentorId && expertId === profileMentorId) return true;
  }
  if (expertOwnerId && currentUserId && expertOwnerId === currentUserId) {
    return true;
  }

  // 2. Email matching
  const expertEmail = (expertOrCreator.verifiedEmail || '').trim().toLowerCase();
  const userEmail = (currentUser.email || userProfile?.email || '').trim().toLowerCase();
  if (expertEmail && userEmail) {
    if (expertEmail === userEmail) return true;
    const expUserPart = expertEmail.split('@')[0];
    const userPart = userEmail.split('@')[0];
    if (expUserPart && userPart && expUserPart === userPart && expUserPart.length > 3) return true;
  }

  // 3. Name matching with parseNameAndRole
  const expCleanName = parseNameAndRole(expertOrCreator.name).cleanName.toLowerCase().trim();
  const userCleanName = parseNameAndRole(userProfile?.name || currentUser.name).cleanName.toLowerCase().trim();

  if (expCleanName && userCleanName) {
    if (expCleanName === userCleanName) return true;
    const expTokens = expCleanName.split(/\s+/).filter(t => t.length > 1);
    const userTokens = userCleanName.split(/\s+/).filter(t => t.length > 1);
    if (expTokens.length >= 2 && userTokens.length >= 2) {
      if (expTokens[0] === userTokens[0] && expTokens[expTokens.length - 1] === userTokens[userTokens.length - 1]) {
        return true;
      }
    }
    if (expCleanName.length > 4 && userCleanName.length > 4) {
      if (expCleanName.startsWith(userCleanName) || userCleanName.startsWith(expCleanName)) {
        return true;
      }
    }
  }

  return false;
};
