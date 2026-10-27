import re
from typing import List, Dict, Optional, Any
from backend.models.schemas import GapAnalysisResult, CandidateTrajectoryInput
from backend.services.trajectory_service import trajectory_service
from backend.services.embedding_service import create_embedding, cosine_similarity, semantic_skill_match

class DomainJDTemplate:
    def __init__(
        self,
        domain: str,
        default_target_role: str,
        baseline_salary: str,
        target_package: str,
        expected_skills: List[str],
        high_leverage_booster_skills: List[str],
        openings_count: int,
        hiring_companies: str
    ):
        self.domain = domain
        self.default_target_role = default_target_role
        self.baseline_salary = baseline_salary
        self.target_package = target_package
        self.expected_skills = expected_skills
        self.high_leverage_booster_skills = high_leverage_booster_skills
        self.openings_count = openings_count
        self.hiring_companies = hiring_companies

DOMAIN_TEMPLATES: Dict[str, DomainJDTemplate] = {
    'full-stack': DomainJDTemplate(
        domain='Full-Stack',
        default_target_role='Lead UI & Micro-Frontend Architect',
        baseline_salary='₹6L - 8L LPA',
        target_package='Up to ₹36L',
        expected_skills=['React.js', 'JavaScript (ES6+)', 'TypeScript', 'Component Arch', 'Redux / State Mgmt', 'HTML5/CSS3'],
        high_leverage_booster_skills=['Micro-Frontend Architecture', 'Module Federation (Webpack/Vite)', 'Core Web Vitals & Performance'],
        openings_count=520,
        hiring_companies='Swiggy, Razorpay, PhonePe, Makemytrip'
    ),
    'product-management': DomainJDTemplate(
        domain='Product Management',
        default_target_role='Lead Technical Product Manager',
        baseline_salary='₹7L - 10L LPA',
        target_package='Up to ₹38L',
        expected_skills=['Tech Scoping', 'UI/UX Empathy', 'Agile & Scrum', 'Stakeholder Mgmt', 'Wireframing', 'Data Analytics'],
        high_leverage_booster_skills=['PRD & Product Discovery', 'Growth Metrics & Funnels', 'Go-To-Market (GTM) Strategy'],
        openings_count=430,
        hiring_companies='Shine, Zepto, Flipkart, CRED, Amazon'
    ),
    'search-data-infra': DomainJDTemplate(
        domain='Search & Data Infra',
        default_target_role='Principal Search & Solr Architect',
        baseline_salary='₹8L - 12L LPA',
        target_package='Up to ₹48L',
        expected_skills=['REST APIs', 'SQL Schema', 'Distributed Systems', 'Backend Microservices', 'Query Optimization'],
        high_leverage_booster_skills=['Apache Solr & Lucene Engine', 'Sub-10ms Query Optimization', 'Inverted Index Sharding'],
        openings_count=290,
        hiring_companies='Netflix, Uber, Swiggy, Flipkart'
    ),
    'ai/ml': DomainJDTemplate(
        domain='AI/ML',
        default_target_role='Generative AI & LLM Full-Stack Architect',
        baseline_salary='₹7L - 11L LPA',
        target_package='Up to ₹45L',
        expected_skills=['Python', 'Fullstack Integration', 'WebSockets/APIs', 'DB Modeling', 'Prompt Engineering'],
        high_leverage_booster_skills=['LangChain & LLM Agents', 'Vector Embeddings & RAG', 'Production Fine-Tuning & Evaluation'],
        openings_count=610,
        hiring_companies='Swiggy, Adobe, OpenAI Partners, Postman'
    ),
    'semiconductor': DomainJDTemplate(
        domain='Semiconductor',
        default_target_role='Staff Silicon & RTL Design Architect',
        baseline_salary='₹8L - 12L LPA',
        target_package='Up to ₹42L',
        expected_skills=['Digital Electronics', 'Verilog', 'C/C++', 'Digital Logic & FPGA'],
        high_leverage_booster_skills=['RTL Design (SystemVerilog)', 'UVM ASIC Verification', 'Static Timing Analysis (STA)'],
        openings_count=380,
        hiring_companies='Qualcomm, Intel, Texas Instruments, AMD'
    ),
    'cybersecurity': DomainJDTemplate(
        domain='Cybersecurity',
        default_target_role='Lead Cloud Security & DevSecOps Architect',
        baseline_salary='₹5.5L - 8L LPA',
        target_package='Up to ₹38L',
        expected_skills=['Networking (TCP/IP)', 'Linux Administration', 'Bash/Python', 'Firewalls'],
        high_leverage_booster_skills=['Kubernetes Security (CKS)', 'Terraform DevSecOps', 'Threat Hunting (MITRE ATT&CK)', 'Cloud IAM Posture'],
        openings_count=310,
        hiring_companies='Palo Alto Networks, CrowdStrike, Cisco, Cloudflare'
    )
}

class CvService:
    def parse_cv(self, cv_text: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Parses pasted resume text. Returns only what was found (no sample defaults)."""
        from backend.services.resume_parser import parse_resume
        fields = parse_resume(cv_text or '')
        years = fields.get('totalExperienceYears')
        return {
            'parsedSkills': fields.get('skills', []),
            'estimatedExperience': f"{years} Years" if years is not None else None,
            'rawLength': len(cv_text or ''),
            'fields': fields,
        }

    def perform_gap_analysis(
        self,
        domain_key: str = 'full-stack',
        candidate_skills: Optional[List[str]] = None,
        candidate_role: str = 'Senior Frontend Engineer',
        current_ctc: str = '₹7.5 LPA',
        current_company: Optional[str] = None,
        target_company: Optional[str] = None
    ) -> GapAnalysisResult:
        candidate_skills = candidate_skills or []
        key = re.sub(r'[^a-z0-9]', '', (domain_key or 'full-stack').lower())
        matched_template = DOMAIN_TEMPLATES['full-stack']

        if 'ai' in key or 'ml' in key or 'genai' in key or 'llm' in key:
            matched_template = DOMAIN_TEMPLATES['ai/ml']
        elif 'semiconductor' in key or 'vlsi' in key or 'silicon' in key or key == 'semi':
            matched_template = DOMAIN_TEMPLATES['semiconductor']
        elif 'product' in key or key == 'pm' or 'management' in key:
            matched_template = DOMAIN_TEMPLATES['product-management']
        elif 'search' in key or 'solr' in key or 'lucene' in key or 'data' in key:
            matched_template = DOMAIN_TEMPLATES['search-data-infra']
        elif 'cyber' in key or 'security' in key:
            matched_template = DOMAIN_TEMPLATES['cybersecurity']

        cand_skills_lower = [s.lower() for s in candidate_skills]

        # Matched skills
        matched_skills = []
        for es in matched_template.expected_skills:
            e_lower = es.lower()
            matched = any(e_lower in cs or cs in e_lower or re.sub(r'[^a-z0-9]', '', cs) == re.sub(r'[^a-z0-9]', '', e_lower) for cs in cand_skills_lower)
            if not matched and candidate_skills:
                for cs in candidate_skills:
                    if semantic_skill_match(cs, es, 0.70):
                        matched = True
                        break
            if matched:
                matched_skills.append(es)

        if not matched_skills:
            matched_skills = candidate_skills[:4] if candidate_skills else matched_template.expected_skills[:3]

        # Missing booster skills
        missing_booster_skills = []
        for bs in matched_template.high_leverage_booster_skills:
            b_lower = bs.lower()
            has_s = any(b_lower in cs or cs in b_lower or re.sub(r'[^a-z0-9]', '', cs) == re.sub(r'[^a-z0-9]', '', b_lower) for cs in cand_skills_lower)
            if not has_s and candidate_skills:
                for cs in candidate_skills:
                    if semantic_skill_match(cs, bs, 0.75):
                        has_s = True
                        break
            if not has_s:
                missing_booster_skills.append(bs)

        if not missing_booster_skills:
            missing_booster_skills = matched_template.high_leverage_booster_skills[:2]

        cand_text = f"{candidate_role} {', '.join(candidate_skills)}"
        target_text = f"{matched_template.default_target_role} {matched_template.domain} {' '.join(matched_template.expected_skills)}"

        cand_vec = create_embedding(cand_text)
        target_vec = create_embedding(target_text)
        semantic_fit = max(0.0, cosine_similarity(cand_vec, target_vec))

        added_boosters_count = len(matched_template.high_leverage_booster_skills) - len(missing_booster_skills)
        expected_count = len(matched_template.expected_skills) or 1
        match_ratio = min(1.0, len(matched_skills) / expected_count)

        role_lower = (candidate_role or '').lower()
        role_bonus = 0
        if matched_template.domain == 'Full-Stack' and any(k in role_lower for k in ['front', 'react', 'ui', 'web', 'full']):
            role_bonus = 8
        elif matched_template.domain == 'Product Management' and any(k in role_lower for k in ['lead', 'mgr', 'prod', 'eng', 'senior']):
            role_bonus = 6
        elif matched_template.domain == 'AI/ML' and any(k in role_lower for k in ['ai', 'data', 'python', 'ml']):
            role_bonus = 8
        elif matched_template.domain == 'Search & Data Infra' and any(k in role_lower for k in ['backend', 'data', 'search', 'system']):
            role_bonus = 7
        elif matched_template.domain == 'Semiconductor' and any(k in role_lower for k in ['hardware', 'embedded', 'vlsi', 'silicon']):
            role_bonus = 8

        target_score = 96
        base_score = min(88, max(45, round(40 + (match_ratio * 25) + (semantic_fit * 22) + role_bonus)))
        current_score = min(target_score, round(base_score + (added_boosters_count * ((target_score - base_score) / len(matched_template.high_leverage_booster_skills)))))

        all_matches = trajectory_service.match_trajectories(CandidateTrajectoryInput(
            currentRole=candidate_role,
            currentCompany=current_company,
            currentExperience='4 Years',
            currentSalary=current_ctc,
            targetRole=matched_template.default_target_role,
            targetPackage=matched_template.target_package,
            targetCompany=target_company,
            domain=matched_template.domain,
            skills=candidate_skills
        ))

        recommended_creators = all_matches[:3]

        return GapAnalysisResult(
            candidateRole=candidate_role,
            targetRole=matched_template.default_target_role,
            targetDomain=matched_template.domain,
            currentSalaryBaseline=current_ctc or matched_template.baseline_salary,
            targetSalaryPotential=matched_template.target_package,
            estimatedJump='+₹14L - ₹22L Jump',
            currentScore=current_score,
            targetScore=target_score,
            matchedSkills=matched_skills,
            missingBoosterSkills=missing_booster_skills,
            trajectoryRecommendation=f"Bridge the {' and '.join(missing_booster_skills[:2])} gap with verified mentors from {matched_template.domain} who made this exact jump.",
            recommendedCreators=recommended_creators,
            openingsCount=matched_template.openings_count,
            hiringCompanies=matched_template.hiring_companies
        )

cv_service = CvService()
