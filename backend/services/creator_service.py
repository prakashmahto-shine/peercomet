import time
import re
from typing import List, Optional, Dict, Any
from backend.data.store import store
from backend.models.schemas import Creator, CreatorRegisterInput, CreatorTrajectory, CreatorAvailability
from backend.services.milvus_service import milvus_service

class CreatorService:
    def get_all(self, domain: Optional[str] = None, query: Optional[str] = None) -> List[Creator]:
        return store.get_creators(domain=domain, query=query)

    def get_by_id(self, creator_id: str) -> Optional[Creator]:
        return store.get_creator_by_id(creator_id)

    def register(self, payload: CreatorRegisterInput, owner_user_id: Optional[str] = None) -> Creator:
        creator_id = f"exp-{int(time.time() * 1000)}"
        company_clean = re.sub(r'[^a-z]', '', payload.company.lower())

        trajectory = CreatorTrajectory(
            role3YearsAgo=payload.role3YearsAgo or 'Senior Software Engineer',
            company3YearsAgo=payload.company3YearsAgo or 'Mid-tier Technology Firm',
            salary3YearsAgo=payload.salary3YearsAgo or '₹8 LPA',
            keyJumpSkills=payload.skills[:3] if payload.skills else ['Architecture', 'System Design'],
            jumpStory=f"Bridged core architecture and system design requirements to land role at {payload.company}."
        )

        availability = CreatorAvailability(
            days=payload.days if payload.days else ['Wed', 'Sat', 'Sun'],
            timeSlots=payload.timeSlots if payload.timeSlots else ['07:00 PM - 08:00 PM', '08:30 PM - 09:30 PM']
        )

        new_creator = Creator(
            id=creator_id,
            name=payload.name,
            role=payload.role,
            company=payload.company,
            domain=payload.domain or 'Full-Stack',
            experience=payload.experience or '6+ Years Exp.',
            rating=5.0,
            reviewsCount=0,
            sessionsCount=0,
            price=payload.price or 999,
            location='Bengaluru / Remote',
            duration=payload.duration or '01:15',
            avatar=payload.avatar or '/avatars/nisha.jpg',
            videoPoster=payload.videoPoster or payload.avatar or '/avatars/nisha.jpg',
            teaserTitle=payload.teaserTitle or f"Teaser: How I Jumped into {payload.role} at {payload.company}",
            skills=payload.skills,
            bio=payload.bio,
            verifiedEmail=payload.verifiedEmail or f"@{company_clean}.com",
            isVerifiedEmployer=True,
            trajectory=trajectory,
            availability=availability,
            serviceOfferings=payload.serviceOfferings
        )

        saved = store.add_creator(new_creator, owner_user_id=owner_user_id)

        # Upsert vector into Milvus
        try:
            milvus_service.upsert_creator(saved)
        except Exception as e:
            print(f"[CreatorService] Milvus upsert warning: {e}")

        return saved

    def update_availability(self, creator_id: str, days: List[str], time_slots: List[str]) -> Optional[Creator]:
        return store.update_creator_availability(creator_id, days, time_slots)

    def update_profile(self, creator_id: str, updates: Dict[str, Any]) -> Optional[Creator]:
        updated = store.update_creator(creator_id, updates)
        if updated:
            try:
                milvus_service.upsert_creator(updated)
            except Exception as e:
                print(f"[CreatorService] Milvus upsert warning: {e}")
        return updated

creator_service = CreatorService()
