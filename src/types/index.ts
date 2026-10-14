export interface Expert {
  id: string;
  name: string;
  role: string;
  company: string;
  domain: string;
  experience: string;
  rating: number;
  reviewsCount: number;
  sessionsCount: number;
  price: number;
  location: string;
  duration: string;
  avatar: string;
  videoPoster: string;
  teaserTitle: string;
  skills: string[];
  bio: string;
  verifiedEmail: string;
  isVerifiedEmployer?: boolean;
  followersCount?: number;
  trajectory?: {
    role3YearsAgo: string;
    company3YearsAgo: string;
    salary3YearsAgo: string;
    keyJumpSkills: string[];
    jumpStory: string;
  };
  availability?: {
    days: string[];
    timeSlots: string[];
  };
}

export type ViewType = 
  | 'dashboard-view'
  | 'profile-view'
  | 'guidance-view'
  | 'jobs-view'
  | 'experts-view'
  | 'expert-profile-view'
  | 'community-view'
  | 'payment-view'
  | 'confirmed-view'
  | 'sessions-view'
  | 'live-call-view'
  | 'post-session-view'
  | 'recruiter-view'
  | 'mentor-dashboard-view'
  | 'login-view'
  | 'registration-view'
  | 'admin-dashboard-view';

export interface BookingDetails {
  expert: Expert;
  date: string;
  timeSlot: string;
  price: number;
  sessionType?: string;
  duration?: string;
}

export interface MentorshipSession {
  id: string;
  expertId?: string;
  expert: Expert;
  candidateId?: string;
  candidateName: string;
  candidateRole?: string;
  candidateAvatar?: string;
  candidateGoal?: string;
  date: string;
  timeSlot: string;
  status: 'upcoming' | 'completed' | 'cancelled';
  badgeAwarded?: string;
  feedbackNotes?: string;
  rating?: number;
  meetingLink?: string;
  recordingUrl?: string;
  recordingDuration?: number;
  hasRecording?: boolean;
  sessionType?: string;
  amountPaid?: number;
  completedAt?: string;
  // Candidate's review of the mentor (rating/feedbackNotes above are the mentor's assessment)
  candidateRating?: number;
  candidateReview?: string;
}

export interface PeerVerifiedBadge {
  id: string;
  title: string;
  subtitle: string;
  verifierName: string;
  verifierRole: string;
  verifierCompany?: string;
  verifierAvatar: string;
  date: string;
  skills: string[];
  status: 'verified' | 'in-progress';
  credentialId?: string;
  verificationUrl?: string;
  qrCodeUrl?: string;
  badgeLevel?: string;
  scorePercentile?: string;
  rubricSummary?: string;
}

export interface UserProfileData {
  name: string;
  headline: string;
  experienceYears: string;
  location: string;
  profileScore: number;
  jobSearchStatus: string;
  summary: string;
  skills: string[];
  badges: PeerVerifiedBadge[];
  email: string;
  phone: string;
  currentCtc?: string;
  targetCtc?: string;
  targetRole?: string;
  targetCompany?: string;
  domain?: string;
  resumeFileName?: string;
  // ISO 8601 time of the last resume upload
  resumeUpdatedAt?: string;
  educationDegree?: string;
  educationCollege?: string;
  pastCompany?: string;
  pastCompanyRole?: string;
  isMentor?: boolean;
  mentorRating?: number;
  mentorReviewsCount?: number;
  mentorEarnings?: number;
  mentorSessionsCount?: number;
  mentorRate?: number;
  mentorDuration?: number;
  mentorAvailability?: { days: string[]; timeSlots: string[] };
  mentorTeaserVideo?: {
    url: string;
    title: string;
    duration?: string;
    thumbnail?: string;
    uploadedAt?: string;
  } | null;
  hasExpertBadge?: boolean;
  isMentorEligible?: boolean;
  currentCompany?: string;
  dreamCompany?: string;
  isCalibrated?: boolean;
  calibratedAt?: string;
  noticePeriod?: string;
  expectedCtc?: string;
  designation?: string;
  currentlyNotWorking?: boolean;
  startDate?: string;
  avatar?: string;
  lastUpdatedDate?: string;
  // Structured profile fields (see CandidateProfile in backend/models/schemas.py)
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string | null;   // YYYY-MM-DD
  totalExperienceYears?: number | null;
  totalExperienceMonths?: number | null;
  currentCtcLpa?: number | null;
  expectedCtcLpa?: number | null;
  graduationYear?: number | null;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
}

// Fields the resume parser found (all optional; nothing is guessed)
export interface ResumeExtract {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  location?: string;
  totalExperienceYears?: number;
  totalExperienceMonths?: number;
  currentDesignation?: string;
  currentCompany?: string;
  noticePeriod?: string;
  currentCtcLpa?: number;
  expectedCtcLpa?: number;
  summary?: string;
  skills?: string[];
  highestQualification?: string;
  educationCollege?: string;
  graduationYear?: number;
  linkedinUrl?: string;
  githubUrl?: string;
}

export interface ResumeUploadResult {
  resume: { fileName: string; updatedAt: string };
  textFound: boolean;
  extracted: ResumeExtract;
}

export interface BootcampMasterclass {
  id: string;
  title: string;
  domain: string;
  mentorName: string;
  mentorRole: string;
  mentorCompany: string;
  mentorAvatar: string;
  mentorExCompany?: string;
  date: string;
  time: string;
  duration: string;
  registeredCount: number;
  maxCapacity: number;
  topics: string[];
  takeaways: string[];
  isFree: boolean;
  expertId: string;
  openSlotsOnEndCount: number;
}

export interface NamedExpertInvite {
  mentorName: string;
  mentorRole: string;
  mentorCompany: string;
  mentorExCompany?: string;
  mentorAvatar: string;
  domain: string;
  headline: string;
  description: string;
  targetAudience: string;
  totalSlots: number;
  remainingSlots: number;
  price?: number;
  expertId: string;
}

export interface UserAccount {
  id: string;
  username: string;
  name: string;
  role: 'candidate' | 'mentor';
  avatar: string;
  email: string;
  headline: string;
  company?: string;
  experienceYears?: string;
  location?: string;
  earnings?: number;
  rating?: number;
  reviewsCount?: number;
  completedSessionsCount?: number;
  hasExpertBadge?: boolean;
  isMentorEligible?: boolean;
  isAdmin?: boolean;
  // Creator (mentor profile) id when this user is a mentor; may differ from the user id
  creatorId?: string;
}

export interface AdminOverviewStats {
  totalUsers: number;
  totalCandidates: number;
  totalMentors: number;
  eligibleMentors: number;
  totalBookings: number;
  totalGmv: number;
  platformEarnings: number;
}

export interface AdminUserData {
  id: string;
  name: string;
  email: string;
  mobile?: string;
  avatar?: string;
  currentCompany?: string;
  designation?: string;
  experienceYears?: string;
  totalExperienceYears?: number;
  skills: string[];
  resumeFileName?: string;
  resumeUpdatedAt?: string;
  resumeUrl?: string;
  city?: string;
  careerGoal?: string;
  targetRole?: string;
  isMentorEligible: boolean;
  isMentor: boolean;
  creatorId?: string;
  creatorStatus?: string;
  createdAt?: string;
  lastLoginAt?: string;
}

export interface AdminBookingData {
  id: string;
  expertId: string;
  expertName: string;
  expertCompany: string;
  candidateId: string;
  candidateName: string;
  candidateEmail?: string;
  status: string;
  date: string;
  timeSlot: string;
  price: number;
  platformCut: number;
  mentorEarnings: number;
  createdAt?: string;
}

export interface PeerpathJobContext {
  isFromPeerpath: boolean;
  trackKey: string;
  trackTitle: string;
  targetRole: string;
  targetPackage: string;
  requiredBoosterSkills: string[];
}

export interface TrajectoryMatch {
  creator: Expert;
  trajectorySimilarityScore: number;
  jumpDelta: string;
  matchReasons: string[];
  criticalBoosterSkills: string[];
  suggestedSessionGoal: string;
  isExactMatch: boolean;
  matchType: 'exact-dream' | 'exact-company' | 'exact-role' | 'aligned';
}

export interface GapAnalysisResult {
  candidateRole: string;
  targetRole: string;
  targetDomain: string;
  currentSalaryBaseline: string;
  targetSalaryPotential: string;
  estimatedJump: string;
  currentScore: number;
  targetScore: number;
  matchedSkills: string[];
  missingBoosterSkills: string[];
  trajectoryRecommendation: string;
  recommendedCreators: TrajectoryMatch[];
  openingsCount?: number;
  hiringCompanies?: string;
}

export interface ZeroPrepDossier {
  sessionId: string;
  candidate: {
    name: string;
    headline: string;
    experienceYears?: string | null;
    designation?: string | null;
    currentCompany?: string | null;
    currentCtc?: string | null;
    targetCtc?: string | null;
    targetRole?: string | null;
    noticePeriod?: string | null;
    educationDegree?: string | null;
    educationCollege?: string | null;
    linkedinUrl?: string | null;
    skills: string[];
    summary: string;
    // Set when the candidate uploaded a resume
    resumeFileName?: string | null;
  };
  gapReport: {
    missingSkills: string[];
    targetJump: string;
    suggestedFocusAreas: string[];
  };
  recommendedAssessmentRubric: {
    category: string;
    criteria: string[];
  }[];
  quickDiscussionPrompts: string[];
}

export interface ShineJob {
  id: string;
  title: string;
  company: string;
  companyInitials?: string;
  companyColor?: string;
  postedTime: string;
  exp: string;
  salary: string;
  salaryNum?: number;
  loc: string;
  domain: string;
  requiredSkills: string[];
  isActivelyHiring?: boolean;
  isEarlyApplicant?: boolean;
  description?: string;
}

export type PathwayTrackKey = 'arch' | 'pm' | 'search' | 'ai' | 'semi';

export interface CommunityComment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  authorAvatar: string;
  authorIsMentor?: boolean;
  content: string;
  createdAt: string;
  likesCount: number;
  likedByCurrentUser?: boolean;
}

export interface PostAnalytics {
  impressions: number;
  reach: number;
  engagements: number;
  engagementRate: string;
  reactionsBreakdown: {
    likes: number;
    hearts: number;
    insightful: number;
  };
  commentsCount: number;
  repliesCount: number;
  sharesCount: number;
  profileClicks: number;
  bookingsGenerated: number;
  revenueGenerated: number;
  topAudienceTitles: { title: string; percentage: number }[];
  topAudienceCompanies: { company: string; percentage: number }[];
  topLocations: { city: string; percentage: number }[];
}

export interface CommunityPost {
  id: string;
  mentorId: string;
  mentorName: string;
  mentorRole: string;
  mentorCompany: string;
  mentorAvatar: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  likesCount: number;
  likedByCurrentUser?: boolean;
  commentsCount: number;
  comments: CommunityComment[];
  analytics?: PostAnalytics;
}

export interface CommunityNotification {
  id: string;
  type: 'mentor_post' | 'comment_reply';
  mentorId: string;
  mentorName: string;
  mentorAvatar: string;
  postId: string;
  title: string;
  message: string;
  createdAt: string;
  isRead: boolean;
}
