import math
from typing import List, Optional, Dict, Any
from backend.data.store import store
from backend.models.schemas import CandidateTrajectoryInput, TrajectoryMatch, Creator
from backend.services.mentor_match_taxonomy import (
    classify_role_family,
    role_match_score,
    company_match_score,
    transition_match_score,
    is_supported_domain,
    normalize_domain
)
from backend.services.embedding_service import (
    create_embedding,
    cosine_similarity,
    semantic_similarity
)
from backend.services.milvus_service import milvus_service

class TrajectoryService:
    """
    Trajectory Matching Engine:
    Combines Dense Vector Embeddings (Milvus Vector DB / all-MiniLM-L6-v2) with 4-Way Career Alignment:

      CANDIDATE:  Current Role + Skills  ──────────→  Dream Role + Domain
                        ↕ (Milvus Vector Sim)             ↕ (Milvus Vector Sim)
      MENTOR:     Previous Role + Jump Skills ──→  Current Role + Skills

      CANDIDATE:  Current Company ───────────────→  Dream Company
                        ↕ (Company Tier Match)           ↕ (Company Tier Match)
      MENTOR:     Previous Company ──────────────→  Current Company
    """

    def match_trajectories(self, input_data: CandidateTrajectoryInput) -> List[TrajectoryMatch]:
        norm_domain = normalize_domain(input_data.domain) or input_data.domain
        if input_data.domain and not is_supported_domain(input_data.domain):
            return []

        # Domain filtering across approved creators
        all_creators = store.get_creators()
        available_creators = []
        for c in all_creators:
            if not norm_domain:
                available_creators.append(c)
                continue
            c_norm = normalize_domain(c.domain) or c.domain
            if c_norm.lower() == norm_domain.lower() or c.domain.lower() == (input_data.domain or "").lower():
                available_creators.append(c)

        if not available_creators and all_creators:
            available_creators = all_creators

        candidate_skills_lower = [s.lower() for s in (input_data.skills or [])]
        dream_role = input_data.targetRole or input_data.currentRole or "Senior Software Engineer"
        cand_curr_role = input_data.currentRole or "Senior Frontend Engineer"

        candidate_origin_family = classify_role_family(cand_curr_role, norm_domain)
        candidate_dest_family = classify_role_family(dream_role, norm_domain)

        # Compute dense trajectory vectors for candidate baseline and target
        cand_baseline_text = f"{cand_curr_role} {input_data.currentCompany or ''} {' '.join(input_data.skills or [])}".strip()
        cand_target_text = f"{dream_role} {input_data.targetCompany or ''} {norm_domain or ''} {' '.join(input_data.skills or [])}".strip()

        cand_baseline_vec = create_embedding(cand_baseline_text)
        cand_target_vec = create_embedding(cand_target_text)
        cand_role_vec = create_embedding(cand_curr_role)
        cand_target_role_vec = create_embedding(dream_role)

        # Query Milvus for fast vector similarities
        milvus_matches = milvus_service.search_trajectory_vectors(
            candidate_baseline_vector=cand_baseline_vec,
            candidate_target_vector=cand_target_vec,
            domain=norm_domain,
            limit=len(available_creators) or 50
        )

        has_dream_company = bool(input_data.targetCompany and input_data.targetCompany.strip())
        has_current_company = bool(input_data.currentCompany and input_data.currentCompany.strip())

        # Dynamic weight distribution
        if not has_dream_company and not has_current_company:
            w_dream_role, w_current_role, w_dream_comp, w_curr_comp, w_trans = 0.45, 0.35, 0.0, 0.0, 0.20
        elif not has_dream_company:
            w_dream_role, w_current_role, w_dream_comp, w_curr_comp, w_trans = 0.40, 0.30, 0.0, 0.20, 0.10
        elif not has_current_company:
            w_dream_role, w_current_role, w_dream_comp, w_curr_comp, w_trans = 0.35, 0.30, 0.25, 0.0, 0.10
        else:
            w_dream_role, w_current_role, w_dream_comp, w_curr_comp, w_trans = 0.30, 0.25, 0.20, 0.15, 0.10

        matches: List[TrajectoryMatch] = []

        for creator in available_creators:
            try:
                if not creator.trajectory:
                    from backend.models.schemas import CreatorTrajectory
                    creator.trajectory = CreatorTrajectory(
                        role3YearsAgo=creator.role,
                        company3YearsAgo=creator.company,
                        salary3YearsAgo="₹8 LPA",
                        keyJumpSkills=creator.skills[:2] if creator.skills else ["System Design"],
                        jumpStory=f"Career advancement in {creator.role} at {creator.company}."
                    )

                # Milvus vector sim or direct fallback
                c_milvus_info = milvus_matches.get(creator.id, {})
                origin_semantic_sim = c_milvus_info.get("origin_sim")
                dest_semantic_sim = c_milvus_info.get("dest_sim")

                if origin_semantic_sim is None or dest_semantic_sim is None:
                    creator_past_text = f"{creator.trajectory.role3YearsAgo} {creator.trajectory.company3YearsAgo} {' '.join(creator.trajectory.keyJumpSkills)}"
                    creator_current_text = f"{creator.role} {creator.company} {' '.join(creator.skills)}"
                    
                    past_vec = create_embedding(creator_past_text)
                    curr_vec = create_embedding(creator_current_text)

                    origin_semantic_sim = max(0.0, cosine_similarity(cand_baseline_vec, past_vec))
                    dest_semantic_sim = max(0.0, cosine_similarity(cand_target_vec, curr_vec))

                creator_past_role_vec = create_embedding(creator.trajectory.role3YearsAgo)
                creator_curr_role_vec = create_embedding(creator.role)

                origin_role_sim = max(0.0, cosine_similarity(cand_role_vec, creator_past_role_vec))
                dest_role_sim = max(0.0, cosine_similarity(cand_target_role_vec, creator_curr_role_vec))

                dream_role_score = role_match_score(dream_role, creator.role, norm_domain, creator.domain, dest_role_sim)
                current_role_score = role_match_score(cand_curr_role, creator.trajectory.role3YearsAgo, norm_domain, creator.domain, origin_role_sim)
                dream_company_score = company_match_score(input_data.targetCompany, creator.company) if has_dream_company else 0.0
                current_company_score = company_match_score(input_data.currentCompany, creator.trajectory.company3YearsAgo) if has_current_company else 0.0

                mentor_origin_family = classify_role_family(creator.trajectory.role3YearsAgo, creator.domain)
                mentor_dest_family = classify_role_family(creator.role, creator.domain)
                transition_score = transition_match_score(candidate_origin_family, candidate_dest_family, mentor_origin_family, mentor_dest_family)

                taxonomy_score = (
                    w_dream_role * dream_role_score +
                    w_current_role * current_role_score +
                    w_dream_comp * dream_company_score +
                    w_curr_comp * current_company_score +
                    w_trans * transition_score
                )

                # Composite trajectory score blends structured alignment with dense Milvus vector semantic similarity
                avg_vector_sim = (origin_semantic_sim + dest_semantic_sim) / 2.0
                composite_trajectory = (taxonomy_score * 0.70) + (avg_vector_sim * 0.30)

                # Heavy origin gating
                origin_gate = 0.35 if current_role_score < 0.50 else (0.55 + 0.45 * current_role_score)
                gated_trajectory = composite_trajectory * origin_gate

                display_trajectory = math.sqrt(max(0.0, min(1.0, gated_trajectory)))
                trajectory_similarity_score = min(99, round(display_trajectory * 100))

                if dream_role_score >= 0.80 and dream_company_score == 1.0 and current_role_score >= 0.70:
                    match_type = 'exact-dream'
                elif dream_company_score == 1.0 and current_role_score >= 0.70:
                    match_type = 'exact-company'
                elif dream_role_score >= 0.80 and current_role_score >= 0.70:
                    match_type = 'exact-role'
                else:
                    match_type = 'aligned'
                
                is_exact_match = match_type != 'aligned'

                # Semantic bridge skills
                missing_bridge_skills = []
                for skill in (creator.trajectory.keyJumpSkills or []):
                    has_s = any(skill.lower() in cs or cs in skill.lower() for cs in candidate_skills_lower)
                    if not has_s:
                        missing_bridge_skills.append(skill)

                mentor_first_name = creator.name.split(' ')[0]
                origin_note = (
                    ' — the same background as you'
                    if current_role_score >= 0.7 and (not has_current_company or current_company_score >= 0.6)
                    else ' — a similar starting point to yours'
                    if current_role_score >= 0.7
                    else ''
                )
                dest_note = (
                    ' — exactly your target'
                    if dream_role_score >= 0.95 and dream_company_score == 1.0
                    else ' — your target company'
                    if dream_company_score == 1.0
                    else ' — your target role'
                    if dream_role_score >= 0.95
                    else ' — close to your goal'
                    if dream_role_score >= 0.7 or dream_company_score >= 0.6
                    else ''
                )

                match_reasons = [
                    f"{mentor_first_name} was a \"{creator.trajectory.role3YearsAgo}\" at {creator.trajectory.company3YearsAgo}{origin_note}. {mentor_first_name} is now \"{creator.role}\" at {creator.company}{dest_note}."
                ]

                if is_exact_match:
                    if match_type == 'exact-dream':
                        match_reasons.append("🎯 Exact Match: same dream role and dream company.")
                    elif match_type == 'exact-company':
                        match_reasons.append(f"🎯 Exact Dream Company Match: already at {creator.company}.")
                    elif match_type == 'exact-role':
                        match_reasons.append(f"🎯 Exact Dream Role Match: already holds the title \"{creator.role}\".")

                breakdown_items = [
                    f"Dream Role {round(dream_role_score * 100)}%",
                    f"Current Role {round(current_role_score * 100)}%"
                ]
                if has_dream_company:
                    breakdown_items.append(f"Dream Company {round(dream_company_score * 100)}%")
                if has_current_company:
                    breakdown_items.append(f"Current Company {round(current_company_score * 100)}%")
                breakdown_items.append(f"Transition Fit {round(transition_score * 100)}%")
                breakdown_items.append(f"Dense Milvus Sim {round(avg_vector_sim * 100)}%")

                match_reasons.append(f"Alignment breakdown — {', '.join(breakdown_items)}.")
                bridge_desc = ' & '.join(missing_bridge_skills[:2]) if missing_bridge_skills else 'Advanced Architecture'
                match_reasons.append(f"High-Leverage Bridge: Accelerates missing skills: {bridge_desc}.")

                matches.append(TrajectoryMatch(
                    creator=creator,
                    trajectorySimilarityScore=trajectory_similarity_score,
                    jumpDelta=f"{creator.trajectory.role3YearsAgo} @ {creator.trajectory.company3YearsAgo} → {creator.role} @ {creator.company}",
                    matchReasons=match_reasons,
                    criticalBoosterSkills=missing_bridge_skills if missing_bridge_skills else creator.skills[:3],
                    suggestedSessionGoal=f"1:1 CV Teardown & Transition Strategy into {creator.role} at {creator.company}",
                    isExactMatch=is_exact_match,
                    matchType=match_type
                ))
            except Exception as err:
                print(f"[Trajectory match creator {getattr(creator, 'id', 'unknown')}] error: {err}")
                continue

        # Deduplicate creators by name
        seen_names = set()
        unique_matches: List[TrajectoryMatch] = []
        for m in matches:
            key = m.creator.name.lower().strip()
            if key not in seen_names:
                seen_names.add(key)
                unique_matches.append(m)

        # Group by domain
        by_domain: Dict[str, List[TrajectoryMatch]] = {}
        for m in unique_matches:
            by_domain.setdefault(m.creator.domain, []).append(m)

        final_matches: List[TrajectoryMatch] = []
        for group in by_domain.values():
            group.sort(key=lambda x: x.trajectorySimilarityScore, reverse=True)
            qualified = [m for m in group if m.trajectorySimilarityScore >= 60]
            if qualified:
                final_matches.extend(qualified)
            elif group:
                fallback_top = group[0].model_copy()
                fallback_top.trajectorySimilarityScore = 68
                final_matches.append(fallback_top)

        final_matches.sort(key=lambda x: x.trajectorySimilarityScore, reverse=True)
        return final_matches

    def get_trajectory_details(self, creator_id: str) -> Optional[Dict[str, Any]]:
        creator = store.get_creator_by_id(creator_id)
        if not creator:
            return None
        return {
            "creatorId": creator.id,
            "name": creator.name,
            "currentRole": creator.role,
            "company": creator.company,
            "trajectory": creator.trajectory.model_dump(),
            "verifiedEmail": creator.verifiedEmail
        }

trajectory_service = TrajectoryService()
