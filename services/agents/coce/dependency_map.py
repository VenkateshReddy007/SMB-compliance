BUSINESS_EVENTS = {
    "new_employee_hired": {
        "checks": ["PF_REGISTRATION", "ESI_REGISTRATION", "PT_REGISTRATION"],
        "thresholds": {
            "PF_REGISTRATION": {"field": "employee_count", "value": 20, "operator": "gte"},
            "ESI_REGISTRATION": {"field": "employee_count", "value": 10, "operator": "gte"},
        },
    },
    "turnover_threshold_crossed": {
        "checks": ["GST_REGISTRATION", "FSSAI_STATE_LICENSE", "FSSAI_ANNUAL_RETURN"],
        "thresholds": {
            "GST_REGISTRATION": {"field": "annual_turnover", "value": 2000000, "operator": "gte"},
            "FSSAI_STATE_LICENSE": {
                "field": "annual_turnover",
                "value": 1200000,
                "operator": "gte",
                "condition": "business_type=food_business",
            },
        },
    },
    "regulation_updated": {
        "checks": ["ALL_AFFECTED_OBLIGATIONS"],
        "description": "Re-evaluate all obligations affected by the changed regulation",
    },
    "license_expiry_approaching": {
        "checks": ["FSSAI_LICENSE_RENEWAL"],
        "thresholds": {"FSSAI_LICENSE_RENEWAL": {"days_before_expiry": 30}},
    },
}
