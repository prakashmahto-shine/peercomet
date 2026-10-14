from datetime import datetime
from typing import Dict, Any
from backend.data.store import store


class AnalyticsService:
    def get_metrics(self) -> Dict[str, Any]:
        """Marketplace numbers computed from the database only (no sample figures)."""
        raw = store.get_analytics()
        creators = store.get_creators()

        domain_breakdown: Dict[str, int] = {}
        for c in creators:
            domain_breakdown[c.domain] = domain_breakdown.get(c.domain, 0) + 1

        return {
            'status': 'success',
            'timestamp': datetime.utcnow().isoformat() + "Z",
            'totals': {
                'registrations': raw.get('newRegistrationsThisMonth', 0),
                'profileUpdates': raw.get('profileUpdatesThisMonth', 0),
                'sessionsBooked': raw.get('totalSessionsBooked', 0),
                'upcomingSessions': raw.get('upcomingSessionsCount', 0),
                'completedSessions': raw.get('completedSessionsCount', 0),
                'mentors': len(creators),
                'badgesIssued': raw.get('totalBadgesIssued', 0),
            },
            'mentorsByDomain': domain_breakdown,
        }


analytics_service = AnalyticsService()
