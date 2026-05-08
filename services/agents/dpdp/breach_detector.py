from datetime import datetime, timezone


class BreachDetector:
    def simulate_breach_detection(self, business_id: str) -> dict:
        return {
            "business_id": business_id,
            "status": "safe",
            "risk_level": "low",
            "events_checked": 0,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    def draft_dpb_notification(self, breach_details: dict, business_profile: dict) -> str:
        return (
            "Subject: DPDP Breach Notification (72-hour format)\n\n"
            f"Business: {business_profile.get('name', 'Unknown')}\n"
            f"Incident status: {breach_details.get('status')}\n"
            f"Detected at: {breach_details.get('timestamp')}\n"
            "Potential impact: Under assessment\n"
            "Immediate actions taken: Access containment and audit log review initiated.\n"
            "Next update: Within 24 hours."
        )
