import time
from datetime import datetime
from typing import Dict, Any, List, Optional
from backend.data.store import store
from backend.services.booking_service import booking_service
from backend.models.schemas import (
    PeerVerifiedBadge,
    ZeroPrepDossier,
    ZeroPrepCandidate,
    ZeroPrepGapReport,
    ZeroPrepRubric,
    MentorshipSession,
    AssessmentSubmitPayload
)

class AssessmentConflictError(Exception):
    pass

class AssessmentService:
    def get_zero_prep_dossier(self, session_id: str) -> ZeroPrepDossier:
        session = store.get_session_by_id(session_id)
        if not session:
            raise ValueError(f"Session with id '{session_id}' not found")

        candidate = store.get_candidate(session.candidateId)
        if not candidate:
            # Only what the booking itself says; no made-up profile details
            cand_dict = {
                'name': session.candidateName,
                'headline': session.candidateRole or '',
                'targetRole': f"Role at {session.expert.company}",
            }
        else:
            cand_dict = {
                'name': candidate.name,
                'headline': candidate.headline or '',
                'experienceYears': candidate.experienceYears,
                'designation': candidate.designation,
                'currentCompany': candidate.currentCompany,
                'currentCtc': candidate.currentCtc,
                'targetCtc': candidate.targetCtc,
                'targetRole': candidate.targetRole or f"Role at {session.expert.company}",
                'noticePeriod': candidate.noticePeriod,
                'educationDegree': candidate.educationDegree,
                'educationCollege': candidate.educationCollege,
                'linkedinUrl': candidate.linkedinUrl,
                'skills': candidate.skills,
                'summary': candidate.summary or '',
                'resumeFileName': candidate.resumeFileName if candidate.resumeFileKey else None,
            }

        expert_skills = session.expert.skills or ["System Architecture", "High-Performance Systems"]
        s0 = expert_skills[0] if len(expert_skills) > 0 else "Architecture"
        s1 = expert_skills[1] if len(expert_skills) > 1 else "Design"

        return ZeroPrepDossier(
            sessionId=session.id,
            candidate=ZeroPrepCandidate(**cand_dict),
            gapReport=ZeroPrepGapReport(
                missingSkills=session.expert.trajectory.keyJumpSkills,
                targetJump=f"Jump to {cand_dict['targetCtc']}" if cand_dict.get('targetCtc') else f"Target: {cand_dict.get('targetRole')}",
                suggestedFocusAreas=[
                    f"Review candidate's architectural grasp of {s0} and {s1}",
                    f"Simulate Tier-1 interview loop for {session.expert.role}",
                    "Provide direct feedback on resume bullets and metric storytelling"
                ]
            ),
            recommendedAssessmentRubric=[
                ZeroPrepRubric(
                    category='Architectural Depth',
                    criteria=[
                        'Understanding of concurrency and distributed performance',
                        'Familiarity with production trade-offs and edge cases',
                        'Clean code and design pattern modularity'
                    ]
                ),
                ZeroPrepRubric(
                    category='Communication & Problem Solving',
                    criteria=[
                        'Structuring answers with STAR / Framework method',
                        'Clarity under hypothetical failure scenarios',
                        'Readiness for Tier-1 engineering discussions'
                    ]
                )
            ],
            quickDiscussionPrompts=[
                f"\"Walk me through how you would architect a resilient system for {session.expert.domain}.\"",
                "\"What is the single biggest bottleneck you solved in your current job?\"",
                "\"How do you approach latency optimization vs feature velocity?\""
            ]
        )

    def submit_assessment(self, session_id: str, payload: AssessmentSubmitPayload) -> Dict[str, Any]:
        session = store.get_session_by_id(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")
        if session.status == 'cancelled':
            raise AssessmentConflictError("Cancelled sessions cannot be assessed")
        if session.badgeAwarded:
            raise AssessmentConflictError("This session has already been assessed")

        badge_title = payload.badgeTitle or f"{session.expert.domain} Competency Verified"
        company_tag = session.expert.company[:3].upper() if session.expert.company else "SHN"
        hash_code = f"SHINE-PEER-{int(time.time() * 1000)}-{company_tag}"

        today_str = datetime.now().strftime("%b %d, %Y")
        skills_verified = payload.skillsVerified if payload.skillsVerified else session.expert.skills[:4]

        new_badge = PeerVerifiedBadge(
            id=f"badge-{int(time.time() * 1000)}",
            title=badge_title,
            subtitle=f"Verified by {session.expert.name} • {session.expert.role} @ {session.expert.company}",
            verifierName=session.expert.name,
            verifierRole=f"{session.expert.role} @ {session.expert.company}",
            verifierAvatar=session.expert.avatar,
            verifierCompany=session.expert.company,
            date=today_str,
            skills=skills_verified,
            status='verified',
            verificationHash=hash_code
        )

        updated_cand = store.award_badge_to_candidate(session.candidateId, new_badge)

        # Assessing an upcoming session means the call happened; mark it held (bumps mentor's sessionsCount)
        if session.status == 'upcoming':
            booking_service.complete_session(session_id)

        updated_session = store.update_session(session_id, {
            'rating': payload.rating,
            'feedbackNotes': payload.feedbackNotes,
            'badgeAwarded': badge_title
        })

        if not updated_session:
            raise ValueError(f"Failed to update session {session_id}")

        return {
            'session': updated_session,
            'badge': new_badge,
            'candidateProfileScore': updated_cand.profileScore if updated_cand else 85,
            'recruiterVisibilityBoost': '3.4x Higher Visibility in Recruiter Talent Search'
        }

assessment_service = AssessmentService()
