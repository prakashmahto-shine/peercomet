from typing import List, Optional, Literal, Dict, Any
from pydantic import BaseModel, Field, model_validator

DomainVertical = Literal[
    'AI/ML',
    'Semiconductor',
    'Cybersecurity',
    'Full-Stack',
    'SaaS Sales',
    'Marketing',
    'Product Management',
    'Search & Data Infra',
    'Others'
]

class CreatorTrajectory(BaseModel):
    role3YearsAgo: str
    company3YearsAgo: str
    salary3YearsAgo: str
    keyJumpSkills: List[str] = Field(default_factory=list)
    jumpStory: str

class CreatorAvailability(BaseModel):
    days: List[str] = Field(default_factory=list)
    timeSlots: List[str] = Field(default_factory=list)

class Creator(BaseModel):
    id: str
    name: str
    role: str
    company: str
    domain: str
    experience: str = "6+ Years Exp."
    rating: float = 5.0
    reviewsCount: int = 0
    sessionsCount: int = 0
    price: int = 999
    location: str = "Bengaluru / Remote"
    duration: str = "01:15"
    avatar: str = "/avatars/nisha.jpg"
    videoPoster: str = "/avatars/nisha.jpg"
    teaserTitle: str = ""
    skills: List[str] = Field(default_factory=list)
    bio: str = ""
    verifiedEmail: str = ""
    isVerifiedEmployer: bool = True
    trajectory: CreatorTrajectory
    availability: CreatorAvailability = Field(default_factory=lambda: CreatorAvailability(days=['Wed', 'Sat', 'Sun'], timeSlots=['07:00 PM - 08:00 PM']))

class PeerVerifiedBadge(BaseModel):
    id: str
    title: str
    subtitle: str
    verifierName: str
    verifierRole: str
    verifierAvatar: str
    verifierCompany: str
    date: str
    skills: List[str] = Field(default_factory=list)
    status: Literal['verified', 'in-progress'] = 'verified'
    verificationHash: Optional[str] = None

class CandidateProfile(BaseModel):
    id: str
    name: str
    email: str = ""
    phone: str = ""
    headline: str = ""
    experienceYears: Optional[str] = None
    location: Optional[str] = None
    profileScore: int = 75
    jobSearchStatus: str = "Actively Looking"
    summary: str = ""
    skills: List[str] = Field(default_factory=list)
    currentCtc: Optional[str] = None
    targetCtc: Optional[str] = None
    targetRole: Optional[str] = None
    targetCompany: Optional[str] = None
    pastCompany: Optional[str] = None
    pastCompanyRole: Optional[str] = None
    educationDegree: Optional[str] = None
    educationCollege: Optional[str] = None
    domain: Optional[str] = None
    badges: List[PeerVerifiedBadge] = Field(default_factory=list)
    recruiterSearchMultiplier: Optional[float] = 1.5

class MentorshipSession(BaseModel):
    id: str
    expertId: str
    expert: Creator
    candidateId: str
    candidateName: str
    candidateRole: str
    candidateAvatar: str = "/avatars/prakash.jpg"
    candidateGoal: str = ""
    candidateEmail: Optional[str] = None
    date: str
    timeSlot: str
    status: Literal['upcoming', 'completed', 'cancelled'] = 'upcoming'
    meetingLink: str = ""
    badgeAwarded: Optional[str] = None
    feedbackNotes: Optional[str] = None
    rating: Optional[float] = None
    paymentId: Optional[str] = None
    amountPaid: Optional[int] = None
    bookedAt: str = ""
    sessionType: Optional[str] = None
    completedAt: Optional[str] = None
    # Candidate's review of the mentor (separate from the mentor's assessment above)
    candidateRating: Optional[float] = None
    candidateReview: Optional[str] = None

class TrajectoryMatch(BaseModel):
    creator: Creator
    trajectorySimilarityScore: int
    jumpDelta: str
    matchReasons: List[str]
    criticalBoosterSkills: List[str]
    suggestedSessionGoal: str
    isExactMatch: bool
    matchType: Literal['exact-dream', 'exact-company', 'exact-role', 'aligned']

class GapAnalysisResult(BaseModel):
    candidateRole: str
    targetRole: str
    targetDomain: str
    currentSalaryBaseline: str
    targetSalaryPotential: str
    estimatedJump: str
    currentScore: int
    targetScore: int
    matchedSkills: List[str]
    missingBoosterSkills: List[str]
    trajectoryRecommendation: str
    recommendedCreators: List[TrajectoryMatch] = Field(default_factory=list)
    openingsCount: Optional[int] = None
    hiringCompanies: Optional[str] = None

class ZeroPrepCandidate(BaseModel):
    name: str
    headline: str
    experienceYears: str
    currentCtc: Optional[str] = None
    targetCtc: Optional[str] = None
    targetRole: Optional[str] = None
    skills: List[str]
    summary: str

class ZeroPrepGapReport(BaseModel):
    missingSkills: List[str]
    targetJump: str
    suggestedFocusAreas: List[str]

class ZeroPrepRubric(BaseModel):
    category: str
    criteria: List[str]

class ZeroPrepDossier(BaseModel):
    sessionId: str
    candidate: ZeroPrepCandidate
    gapReport: ZeroPrepGapReport
    recommendedAssessmentRubric: List[ZeroPrepRubric]
    quickDiscussionPrompts: List[str]

# Request / Response Body Models
class CandidateTrajectoryInput(BaseModel):
    currentRole: Optional[str] = 'Senior Frontend Engineer'
    currentCompany: Optional[str] = None
    currentExperience: Optional[str] = '4 Years'
    currentSalary: Optional[str] = None
    targetRole: Optional[str] = None
    targetPackage: Optional[str] = None
    targetCompany: Optional[str] = None
    domain: Optional[str] = None
    skills: List[str] = Field(default_factory=list)

class CreatorRegisterInput(BaseModel):
    name: str
    role: str
    company: str
    domain: str
    experience: Optional[str] = '6+ Years Exp.'
    price: Optional[int] = Field(default=999, ge=99, le=100000)
    duration: Optional[str] = '01:15'
    skills: List[str] = Field(default_factory=list)
    bio: str = ""
    avatar: Optional[str] = None
    videoPoster: Optional[str] = None
    teaserTitle: Optional[str] = None
    verifiedEmail: Optional[str] = None
    days: Optional[List[str]] = None
    timeSlots: Optional[List[str]] = None
    role3YearsAgo: Optional[str] = None
    company3YearsAgo: Optional[str] = None
    salary3YearsAgo: Optional[str] = None

class AvailabilityUpdateInput(BaseModel):
    days: List[str]
    timeSlots: List[str]

class CreatorUpdateInput(BaseModel):
    # Whitelisted fields a mentor may edit on their own profile
    price: Optional[int] = Field(default=None, ge=99, le=100000)
    role: Optional[str] = None
    company: Optional[str] = None
    bio: Optional[str] = Field(default=None, max_length=4000)
    skills: Optional[List[str]] = None
    teaserTitle: Optional[str] = None
    duration: Optional[str] = None
    location: Optional[str] = None

class CheckoutPayload(BaseModel):
    expertId: str
    candidateId: Optional[str] = None
    candidateName: Optional[str] = None
    candidateRole: Optional[str] = None
    candidateAvatar: Optional[str] = None
    candidateGoal: Optional[str] = None
    candidateEmail: Optional[str] = None
    date: str
    timeSlot: str
    sessionType: Optional[str] = None
    paymentMethod: Literal['upi', 'card', 'netbanking', 'wallet'] = 'upi'
    upiId: Optional[str] = None
    # Ignored by the server: price is always computed from the creator's rate and sessionType
    amount: Optional[int] = None

class ReschedulePayload(BaseModel):
    newDate: str
    newTimeSlot: str

class SessionReviewPayload(BaseModel):
    rating: float = Field(ge=1, le=5)
    comment: str = Field(default="", max_length=2000)

class AssessmentSubmitPayload(BaseModel):
    rating: float
    feedbackNotes: str
    badgeTitle: Optional[str] = None
    skillsVerified: Optional[List[str]] = None
    interviewReadinessScore: Optional[int] = None

class RecruiterMatchInput(BaseModel):
    roleTitle: Optional[str] = None
    jobTitle: Optional[str] = None
    requiredSkills: List[str] = Field(default_factory=list)
    candidateId: Optional[str] = None
    peerVerifiedOnly: Optional[bool] = False

    @model_validator(mode="before")
    @classmethod
    def resolve_role_title(cls, values: Any) -> Any:
        if isinstance(values, dict):
            if not values.get("roleTitle") and values.get("jobTitle"):
                values["roleTitle"] = values["jobTitle"]
            elif not values.get("roleTitle") and values.get("title"):
                values["roleTitle"] = values["title"]
            if not values.get("roleTitle"):
                values["roleTitle"] = "Senior Engineer"
        return values

class RecruiterInviteInput(BaseModel):
    candidateId: str
    recruiterName: Optional[str] = 'Senior Tech Recruiter'
    company: str
    roleTitle: str
    message: Optional[str] = None

class CvParseInput(BaseModel):
    cvText: str
    metadata: Optional[Dict[str, Any]] = None

class GapAnalysisInput(BaseModel):
    domain: Optional[str] = 'full-stack'
    skills: Optional[List[str]] = Field(default_factory=list)
    currentRole: Optional[str] = 'Senior Frontend Engineer'
    currentCtc: Optional[str] = '₹7.5 LPA'
    currentCompany: Optional[str] = None
    targetCompany: Optional[str] = None

class PathwaysAnalysisInput(BaseModel):
    skills: Optional[List[str]] = Field(default_factory=list)
    currentRole: Optional[str] = 'Senior Frontend Engineer'
    currentCtc: Optional[str] = '₹7.5 LPA'
    currentCompany: Optional[str] = None
    targetCompany: Optional[str] = None

class BackendJob(BaseModel):
    id: str
    title: str
    company: str
    companyInitials: Optional[str] = None
    companyColor: Optional[str] = None
    postedTime: str
    exp: str
    salary: str
    salaryNum: Optional[float] = None
    loc: str
    domain: str
    requiredSkills: List[str] = Field(default_factory=list)
    isActivelyHiring: Optional[bool] = True
    isEarlyApplicant: Optional[bool] = True
    description: Optional[str] = None

# Community & Notification Schemas
class CommunityComment(BaseModel):
    id: str
    authorId: str
    authorName: str
    authorRole: Optional[str] = None
    authorAvatar: Optional[str] = None
    authorIsMentor: Optional[bool] = False
    content: str
    createdAt: str
    likes: Optional[int] = 0
    likedBy: Optional[List[str]] = Field(default_factory=list)

class CommunityPost(BaseModel):
    id: str
    mentorId: str
    mentorName: str
    mentorRole: str
    mentorCompany: str
    mentorAvatar: Optional[str] = None
    title: str
    content: str
    tags: List[str] = Field(default_factory=list)
    createdAt: str
    likes: Optional[int] = 0
    comments: Optional[List[CommunityComment]] = Field(default_factory=list)
    likedBy: Optional[List[str]] = Field(default_factory=list)

class PostCreateInput(BaseModel):
    mentorId: str
    mentorName: str
    mentorRole: str
    mentorCompany: str
    mentorAvatar: Optional[str] = None
    title: str
    content: str
    tags: List[str] = Field(default_factory=list)

class CommentCreateInput(BaseModel):
    authorId: str
    authorName: str
    authorRole: Optional[str] = None
    authorAvatar: Optional[str] = None
    authorIsMentor: Optional[bool] = False
    content: str

class CommunityNotification(BaseModel):
    id: str
    recipientId: str
    type: str = 'system_announcement'
    title: str
    message: str
    mentorId: Optional[str] = None
    mentorName: Optional[str] = None
    mentorAvatar: Optional[str] = None
    actorId: Optional[str] = None
    actorName: Optional[str] = None
    actorAvatar: Optional[str] = None
    postId: Optional[str] = None
    sessionId: Optional[str] = None
    createdAt: str
    isRead: Optional[bool] = False
    actionUrl: Optional[str] = None

class NotificationSendInput(BaseModel):
    recipientId: str
    type: Optional[str] = 'system_announcement'
    title: str
    message: str
    mentorId: Optional[str] = None
    mentorName: Optional[str] = None
    mentorAvatar: Optional[str] = None
    actorId: Optional[str] = None
    actorName: Optional[str] = None
    actorAvatar: Optional[str] = None
    postId: Optional[str] = None
    sessionId: Optional[str] = None
    actionUrl: Optional[str] = None
