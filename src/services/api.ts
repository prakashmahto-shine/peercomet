import { 
  Expert, 
  MentorshipSession, 
  PeerVerifiedBadge, 
  TrajectoryMatch, 
  ZeroPrepDossier, 
  GapAnalysisResult, 
  ShineJob, 
  UserProfileData,
  CommunityPost,
  CommunityComment,
  CommunityNotification
} from '../types';

const ENV_API_URL = typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL 
  ? String((import.meta as any).env.VITE_API_URL).replace(/\/$/, '') 
  : '';

export const API_BASE = ENV_API_URL ? `${ENV_API_URL}/api` : '/api';

/**
 * Resilient fetch wrapper with automatic retry to handle Render Free Tier cold-starts
 * (which return 502/503/504 or network timeout while the web service spins up after 15m inactivity).
 */
async function fetchWithRetry(url: string, options?: RequestInit, retries = 2, delayMs = 1200): Promise<Response> {
  // Never retry writes: a request that timed out may still have succeeded on the server
  // (e.g. a checkout), and retrying it would create a duplicate.
  const method = (options?.method || 'GET').toUpperCase();
  if (method !== 'GET' && method !== 'HEAD') {
    retries = 0;
  }
  // Send the httpOnly session cookie on every call (also when the API is on another origin)
  options = { credentials: 'include', ...options };
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, options);
      if ((res.status === 502 || res.status === 503 || res.status === 504) && i < retries) {
        console.warn(`[API] Received HTTP ${res.status} from server (Render warming up?), retrying ${i + 1}/${retries} in ${delayMs}ms...`);
        await new Promise(r => setTimeout(r, delayMs * (i + 1)));
        continue;
      }
      return res;
    } catch (err) {
      if (i < retries) {
        console.warn(`[API] Request attempt ${i + 1}/${retries} failed (Render instance spinning up?), retrying in ${delayMs}ms...`);
        await new Promise(r => setTimeout(r, delayMs * (i + 1)));
        continue;
      }
      throw err;
    }
  }
  return fetch(url, options);
}

// Plain fetch that sends the session cookie (for call sites that don't go through peerpathApi)
export function apiFetch(url: string, options?: RequestInit): Promise<Response> {
  return fetch(url, { credentials: 'include', ...options });
}

// Surfaces the server's `detail` message (e.g. "This slot was just booked") instead of a generic error
async function errorFromResponse(res: Response, fallback: string): Promise<Error> {
  try {
    const json = await res.json();
    if (json?.detail && typeof json.detail === 'string') return new Error(json.detail);
  } catch {}
  return new Error(fallback);
}

export interface AuthUser {
  id: string;
  name: string;
  email?: string | null;
  mobile?: string | null;
  avatar?: string | null;
  creatorId?: string | null;
  isMentor: boolean;
}

export const peerpathApi = {
  // Auth: 6-digit code sent by email (sign-in and sign-up); session is an httpOnly cookie
  async sendOtp(email: string): Promise<{ requestId: string; isRegistered: boolean }> {
    const res = await fetchWithRetry(`${API_BASE}/auth/otp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    if (!res.ok) throw await errorFromResponse(res, 'Could not send the code');
    return res.json();
  },

  async verifyOtp(payload: { requestId: string; email: string; otp: string; name?: string; mobile?: string }): Promise<AuthUser> {
    const res = await fetchWithRetry(`${API_BASE}/auth/otp/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw await errorFromResponse(res, 'Could not verify the code');
    const json = await res.json();
    return json.data;
  },

  // Returns null when not signed in
  async getMe(): Promise<AuthUser | null> {
    const res = await fetchWithRetry(`${API_BASE}/auth/me`);
    if (res.status === 401) return null;
    if (!res.ok) throw new Error('Failed loading session');
    const json = await res.json();
    return json.data;
  },

  async logout(): Promise<void> {
    await fetchWithRetry(`${API_BASE}/auth/logout`, { method: 'POST' });
  },

  // Health
  async getHealth() {
    const res = await fetchWithRetry(`${API_BASE}/health`);
    if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
    return res.json();
  },

  // Creators
  async getCreators(domain?: string, query?: string): Promise<Expert[]> {
    const params = new URLSearchParams();
    if (domain && domain !== 'all') params.append('domain', domain);
    if (query) params.append('q', query);
    
    const res = await fetchWithRetry(`${API_BASE}/creators?${params.toString()}`);
    if (!res.ok) throw new Error(`Failed fetching creators: ${res.statusText}`);
    const json = await res.json();
    return json.data;
  },

  async getCreatorById(id: string): Promise<Expert> {
    const res = await fetchWithRetry(`${API_BASE}/creators/${id}`);
    if (!res.ok) throw new Error(`Failed fetching creator ${id}`);
    const json = await res.json();
    return json.data;
  },

  async registerCreator(creatorData: Partial<Expert> & { days?: string[]; timeSlots?: string[] }): Promise<Expert> {
    const res = await fetchWithRetry(`${API_BASE}/creators/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(creatorData)
    });
    if (!res.ok) throw await errorFromResponse(res, 'Failed registering creator');
    const json = await res.json();
    return json.data;
  },

  async updateCreator(id: string, updates: { price?: number; role?: string; company?: string; bio?: string; skills?: string[]; teaserTitle?: string; duration?: string; location?: string }): Promise<Expert> {
    const res = await fetchWithRetry(`${API_BASE}/creators/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw await errorFromResponse(res, 'Failed updating mentor profile');
    const json = await res.json();
    return json.data;
  },

  async updateCreatorAvailability(id: string, days: string[], timeSlots: string[]): Promise<Expert> {
    const res = await fetchWithRetry(`${API_BASE}/creators/${id}/availability`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ days, timeSlots })
    });
    if (!res.ok) throw await errorFromResponse(res, 'Failed updating availability');
    const json = await res.json();
    return json.data;
  },

  async getBookedSlots(creatorId: string): Promise<Array<{ date: string; timeSlot: string }>> {
    const res = await fetchWithRetry(`${API_BASE}/creators/${creatorId}/booked-slots`);
    if (!res.ok) throw new Error(`Failed fetching booked slots`);
    const json = await res.json();
    return json.data;
  },

  // Candidate Profile
  async getCandidateProfile(id: string): Promise<UserProfileData> {
    const res = await fetchWithRetry(`${API_BASE}/candidates/${id}`);
    if (!res.ok) throw new Error(`Failed fetching candidate ${id}`);
    const json = await res.json();
    return json.data;
  },

  async updateCandidateProfile(id: string, updates: Partial<UserProfileData>): Promise<UserProfileData> {
    const res = await fetchWithRetry(`${API_BASE}/candidates/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error(`Failed updating candidate ${id}`);
    const json = await res.json();
    return json.data;
  },

  // Trajectory Matching
  async matchTrajectories(params: {
    currentRole: string;
    currentCompany?: string;
    currentExperience?: string;
    currentSalary?: string;
    targetRole?: string;
    targetPackage?: string;
    targetCompany?: string;
    domain?: string;
    skills: string[];
  }): Promise<{ matches: TrajectoryMatch[]; supportedDomain: boolean; message?: string }> {
    const res = await fetchWithRetry(`${API_BASE}/trajectory/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) throw new Error(`Failed matching trajectories`);
    const json = await res.json();
    return { matches: json.data, supportedDomain: json.supportedDomain !== false, message: json.message };
  },

  // CV Parsing
  async parseCv(cvText: string, metadata?: Record<string, any>): Promise<{
    parsedSkills: string[];
    estimatedExperience: string;
    rawLength: number;
    extractedHighlights: string[];
  }> {
    const res = await fetchWithRetry(`${API_BASE}/cv/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cvText, metadata })
    });
    if (!res.ok) throw new Error(`Failed parsing CV`);
    const json = await res.json();
    return json.data;
  },

  // CV Gap Analysis
  async runGapAnalysis(params: {
    domain?: string;
    skills?: string[];
    currentRole?: string;
    currentCtc?: string;
    currentCompany?: string;
    targetCompany?: string;
  }): Promise<GapAnalysisResult> {
    const res = await fetchWithRetry(`${API_BASE}/cv/gap-analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) throw new Error(`Failed running gap analysis`);
    const json = await res.json();
    return json.data;
  },

  // Batch Pathways Analysis for all 5 domains
  async getPathwaysAnalysis(params: {
    skills?: string[];
    currentRole?: string;
    currentCtc?: string;
    currentCompany?: string;
    targetCompany?: string;
  }): Promise<Record<string, GapAnalysisResult>> {
    const res = await fetchWithRetry(`${API_BASE}/cv/pathways-analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) throw new Error(`Failed running pathways analysis`);
    const json = await res.json();
    return json.data;
  },

  // Jobs API
  async getJobs(params?: {
    domain?: string;
    q?: string;
    loc?: string;
    trackKey?: string;
    minSalary?: number;
  }): Promise<ShineJob[]> {
    const qs = new URLSearchParams();
    if (params?.domain && params.domain !== 'all') qs.append('domain', params.domain);
    if (params?.q) qs.append('q', params.q);
    if (params?.loc && params.loc !== 'all') qs.append('loc', params.loc);
    if (params?.trackKey) qs.append('trackKey', params.trackKey);
    if (params?.minSalary) qs.append('minSalary', String(params.minSalary));

    const res = await fetchWithRetry(`${API_BASE}/jobs?${qs.toString()}`);
    if (!res.ok) throw new Error(`Failed fetching jobs`);
    const json = await res.json();
    return json.data;
  },

  // Bookings & Mock Checkout
  async getSessions(userId?: string, role?: 'candidate' | 'mentor'): Promise<MentorshipSession[]> {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    if (role) params.append('role', role);

    const res = await fetchWithRetry(`${API_BASE}/bookings?${params.toString()}`);
    if (!res.ok) throw new Error(`Failed fetching sessions`);
    const json = await res.json();
    return json.data;
  },

  async checkoutAndBookSession(payload: {
    expertId: string;
    candidateId?: string;
    candidateName?: string;
    candidateRole?: string;
    candidateAvatar?: string;
    candidateGoal?: string;
    candidateEmail?: string;
    date: string;
    timeSlot: string;
    sessionType?: string;
    paymentMethod: 'upi' | 'card' | 'netbanking' | 'wallet';
    upiId?: string;
  }): Promise<{ session: MentorshipSession; receipt: any }> {
    // Price is computed server-side from the mentor's rate and sessionType
    const res = await fetchWithRetry(`${API_BASE}/payments/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw await errorFromResponse(res, 'Failed processing checkout');
    const json = await res.json();
    return json;
  },

  async cancelSession(sessionId: string): Promise<MentorshipSession> {
    const res = await fetchWithRetry(`${API_BASE}/bookings/${sessionId}/cancel`, {
      method: 'POST'
    });
    if (!res.ok) throw await errorFromResponse(res, 'Failed cancelling session');
    const json = await res.json();
    return json.data;
  },

  async rescheduleSession(sessionId: string, newDate: string, newTimeSlot: string): Promise<MentorshipSession> {
    const res = await fetchWithRetry(`${API_BASE}/bookings/${sessionId}/reschedule`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newDate, newTimeSlot })
    });
    if (!res.ok) throw await errorFromResponse(res, 'Failed rescheduling session');
    const json = await res.json();
    return json.data;
  },

  // Marks a session as held (call ended). Does not award badges.
  async completeSession(sessionId: string): Promise<MentorshipSession> {
    const res = await fetchWithRetry(`${API_BASE}/bookings/${sessionId}/complete`, { method: 'POST' });
    if (!res.ok) throw await errorFromResponse(res, 'Failed completing session');
    const json = await res.json();
    return json.data;
  },

  // Candidate's rating & review of the mentor
  async reviewSession(sessionId: string, rating: number, comment: string): Promise<MentorshipSession> {
    const res = await fetchWithRetry(`${API_BASE}/bookings/${sessionId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating, comment })
    });
    if (!res.ok) throw await errorFromResponse(res, 'Failed submitting review');
    const json = await res.json();
    return json.data;
  },

  // Video Recordings & Streaming
  getRecordingUrl(sessionId: string): string {
    const cleanId = (sessionId || '').replace(/^peerpath-/, '').replace(/^sess-/, '');
    return `${API_BASE}/sessions/${cleanId}/recording`;
  },

  async uploadSessionRecording(sessionId: string, blob: Blob): Promise<{ success: boolean; recordingUrl: string; sessionId: string }> {
    const cleanId = (sessionId || '').replace(/^peerpath-/, '').replace(/^sess-/, '');
    const res = await fetchWithRetry(`${API_BASE}/sessions/${cleanId}/recording`, {
      method: 'POST',
      headers: {
        'Content-Type': blob.type || 'video/webm'
      },
      body: blob
    });
    if (!res.ok) throw new Error(`Failed uploading recording for session ${cleanId}`);
    return res.json();
  },

  // Creator Mode Zero-Prep Dossier
  async getZeroPrepDossier(sessionId: string): Promise<ZeroPrepDossier> {
    const res = await fetchWithRetry(`${API_BASE}/creator/sessions/${sessionId}/briefing`);
    if (!res.ok) throw new Error(`Failed fetching zero-prep dossier`);
    const json = await res.json();
    return json.data;
  },

  // Assessment & Peer Badge Issuance
  async submitAssessment(sessionId: string, payload: {
    rating: number;
    feedbackNotes: string;
    badgeTitle?: string;
    skillsVerified?: string[];
    interviewReadinessScore?: number;
  }): Promise<{ session: MentorshipSession; badge: PeerVerifiedBadge; recruiterVisibilityBoost: string }> {
    const res = await fetchWithRetry(`${API_BASE}/sessions/${sessionId}/assess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw await errorFromResponse(res, 'Failed submitting assessment');
    const json = await res.json();
    return json.data;
  },

  // Recruiter Search
  async matchRecruiterCandidates(params: {
    roleTitle: string;
    requiredSkills: string[];
    peerVerifiedOnly?: boolean;
  }): Promise<{
    roleTitle: string;
    requiredSkills: string[];
    embeddingProvider: string;
    matches: Array<{
      candidate: any;
      matchPercent: number;
      matchedSkills: string[];
      missingSkills: string[];
      explanation: string;
    }>;
  }> {
    const res = await fetchWithRetry(`${API_BASE}/recruiter/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (!res.ok) throw new Error(`Failed matching recruiter candidates`);
    const json = await res.json();
    return json.data;
  },

  async searchRecruiterCandidates(params?: {
    domain?: string;
    query?: string;
    peerVerifiedOnly?: boolean;
    minScore?: number;
  }) {
    const qs = new URLSearchParams();
    if (params?.domain && params.domain !== 'all') qs.append('domain', params.domain);
    if (params?.query) qs.append('q', params.query);
    if (params?.peerVerifiedOnly) qs.append('peer_verified_only', 'true');
    if (params?.minScore) qs.append('min_score', String(params.minScore));

    const res = await fetchWithRetry(`${API_BASE}/recruiter/candidates?${qs.toString()}`);
    if (!res.ok) throw new Error(`Failed searching recruiter candidates`);
    const json = await res.json();
    return json.data;
  },

  async sendRecruiterInvite(payload: {
    candidateId: string;
    recruiterName?: string;
    company: string;
    roleTitle: string;
    message?: string;
  }) {
    const res = await fetchWithRetry(`${API_BASE}/recruiter/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`Failed sending interview invite`);
    return res.json();
  },

  // Analytics
  async getAnalytics() {
    const res = await fetchWithRetry(`${API_BASE}/analytics/metrics`);
    if (!res.ok) throw new Error(`Failed fetching analytics`);
    return res.json();
  },

  // Community Posts & Discussions
  async getCommunityPosts(params?: { tag?: string; mentorId?: string; userId?: string }): Promise<CommunityPost[]> {
    const qs = new URLSearchParams();
    if (params?.tag && params.tag !== 'all') qs.append('tag', params.tag);
    if (params?.mentorId) qs.append('mentorId', params.mentorId);
    if (params?.userId) qs.append('userId', params.userId);

    const res = await fetchWithRetry(`${API_BASE}/community/posts?${qs.toString()}`);
    if (!res.ok) throw new Error(`Failed fetching community posts`);
    const json = await res.json();
    return json.data;
  },

  async createCommunityPost(post: Partial<CommunityPost>): Promise<CommunityPost> {
    const res = await fetchWithRetry(`${API_BASE}/community/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(post)
    });
    if (!res.ok) throw new Error(`Failed creating community post`);
    const json = await res.json();
    return json.data;
  },

  async addCommunityComment(postId: string, comment: Partial<CommunityComment>): Promise<CommunityComment> {
    const res = await fetchWithRetry(`${API_BASE}/community/posts/${postId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(comment)
    });
    if (!res.ok) throw new Error(`Failed adding comment`);
    const json = await res.json();
    return json.data;
  },

  async togglePostLike(postId: string, userId: string) {
    const res = await fetchWithRetry(`${API_BASE}/community/posts/${postId}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    return res.json();
  },

  async toggleCommentLike(postId: string, commentId: string, userId: string) {
    const res = await fetchWithRetry(`${API_BASE}/community/posts/${postId}/comments/${commentId}/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    return res.json();
  },

  // Notifications
  async getNotifications(userId?: string, unreadOnly?: boolean): Promise<CommunityNotification[]> {
    const qs = new URLSearchParams();
    if (userId) qs.append('userId', userId);
    if (unreadOnly) qs.append('unreadOnly', 'true');

    const res = await fetchWithRetry(`${API_BASE}/notifications?${qs.toString()}`);
    if (!res.ok) throw new Error(`Failed fetching notifications`);
    const json = await res.json();
    return json.data;
  },

  async markNotificationRead(notificationId: string) {
    const res = await fetchWithRetry(`${API_BASE}/notifications/${notificationId}/read`, {
      method: 'PATCH'
    });
    return res.json();
  },

  async markAllNotificationsRead(userId: string) {
    const res = await fetchWithRetry(`${API_BASE}/notifications/mark-all-read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    return res.json();
  },

  async deleteNotification(notificationId: string) {
    const res = await fetchWithRetry(`${API_BASE}/notifications/${notificationId}`, {
      method: 'DELETE'
    });
    return res.json();
  },

  async clearAllNotifications(userId?: string) {
    const res = await fetchWithRetry(`${API_BASE}/notifications/clear-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });
    return res.json();
  },

  // Reset Demo
  async resetDemo() {
    const res = await fetchWithRetry(`${API_BASE}/demo/reset`, { method: 'POST' });
    if (!res.ok) throw new Error(`Failed resetting demo`);
    return res.json();
  }
};
