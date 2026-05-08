class PlainLanguageGenerator:
    def generate_what_changed_card(self, triggered_obligations: list, business_name: str, event_type: str) -> dict:
        domains = sorted({o.domain for o in triggered_obligations})
        urgency = "low"
        if len(triggered_obligations) >= 3:
            urgency = "high"
        elif len(triggered_obligations) == 2:
            urgency = "medium"

        title = f"{len(triggered_obligations)} compliance changes triggered for {business_name}"
        summary = (
            f"A {event_type.replace('_', ' ')} event triggered updates across {len(domains)} compliance domains for your business."
        )
        action_items = [f"Review {o.title} ({o.domain}) and complete before due date rule: {o.due_date_rule}" for o in triggered_obligations]
        return {
            "title": title,
            "summary": summary,
            "action_items": action_items,
            "urgency": urgency,
            "affected_domains": domains,
        }

    def generate_impact_notification(self, delta_summary: dict, business_profile: dict) -> str:
        name = business_profile.get("name", "your business")
        change_count = len(delta_summary.get("changes", []))
        return (
            f"Hi {name}, we detected {change_count} regulation updates that may affect your filings. "
            "Please check the updated tasks and complete urgent ones first."
        )
