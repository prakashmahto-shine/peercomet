from datetime import datetime
from typing import Dict, Any
from backend.data.store import store
from backend.config import BRAND_NAME

class AnalyticsService:
    def get_metrics(self) -> Dict[str, Any]:
        raw = store.get_analytics()
        creators = store.get_creators()

        domain_breakdown = {
            'AI/ML': len([c for c in creators if c.domain == 'AI/ML']),
            'Semiconductor': len([c for c in creators if c.domain == 'Semiconductor']),
            'Cybersecurity': len([c for c in creators if c.domain == 'Cybersecurity']),
            'Full-Stack': len([c for c in creators if c.domain == 'Full-Stack']),
            'SaaS Sales': len([c for c in creators if c.domain == 'SaaS Sales']),
            'Marketing': len([c for c in creators if c.domain == 'Marketing'])
        }

        total_sessions = raw.get('totalSessionsBooked', 2430)
        formatted_sessions = f"{total_sessions:,}"

        return {
            'status': 'success',
            'timestamp': datetime.utcnow().isoformat() + "Z",
            'keyHackathonMetrics': [
                {
                    'metric': 'Profile Update Rate (MoM)',
                    'value': '+68.4%',
                    'whyItMatters': 'Proves mentorship sessions convert to active platform profile freshness and verified skill signals.'
                },
                {
                    'metric': f'New Passive Registrations Attributed to {BRAND_NAME}',
                    'value': '6,350',
                    'whyItMatters': 'Direct acquisition of passive working professionals in underserved domains job alerts cannot touch.'
                },
                {
                    'metric': 'Sessions Booked / Month',
                    'value': formatted_sessions,
                    'whyItMatters': 'Core marketplace velocity and transaction pulse.'
                },
                {
                    'metric': 'Verified Creators Live Across 6 Verticals',
                    'value': str(raw.get('verifiedCreatorsCount', len(creators))),
                    'whyItMatters': 'Supply-side liquidity health check across AI/ML, Semiconductor, Cybersecurity, Full-Stack, SaaS Sales, and Marketing.'
                }
            ],
            'verticalLiquidity': domain_breakdown,
            'closingLoopOutcomes': {
                'badgesIssuedTotal': raw.get('totalBadgesIssued', 0),
                'recruiterSearchCTRMultiplier': '3.4x higher for peer-verified candidates',
                'verifiedHireConversionRate': '28.2%'
            }
        }

analytics_service = AnalyticsService()
