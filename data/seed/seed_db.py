import json
import os
from pathlib import Path

import psycopg2
from psycopg2.extras import Json


BASE_DIR = Path(__file__).resolve().parent
USERS_FILE = BASE_DIR / "users.json"
OBLIGATIONS_FILE = BASE_DIR / "obligations.json"
AUDIT_FILE = BASE_DIR / "audit_history.json"


def load_json(path: Path):
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def get_connection():
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is not set.")
    return psycopg2.connect(database_url)


def upsert_businesses(cur, businesses):
    query = """
    INSERT INTO businesses (
        id, clerk_user_id, name, business_type, state, annual_turnover, employee_count,
        gst_registered, pf_registered, esi_registered, fssai_registered, pt_state,
        gstin, pan, sector_tags
    ) VALUES (
        %(id)s, %(clerk_user_id)s, %(name)s, %(business_type)s, %(state)s, %(annual_turnover)s, %(employee_count)s,
        %(gst_registered)s, %(pf_registered)s, %(esi_registered)s, %(fssai_registered)s, %(pt_state)s,
        %(gstin)s, %(pan)s, %(sector_tags)s
    )
    ON CONFLICT (id) DO UPDATE SET
        clerk_user_id = EXCLUDED.clerk_user_id,
        name = EXCLUDED.name,
        business_type = EXCLUDED.business_type,
        state = EXCLUDED.state,
        annual_turnover = EXCLUDED.annual_turnover,
        employee_count = EXCLUDED.employee_count,
        gst_registered = EXCLUDED.gst_registered,
        pf_registered = EXCLUDED.pf_registered,
        esi_registered = EXCLUDED.esi_registered,
        fssai_registered = EXCLUDED.fssai_registered,
        pt_state = EXCLUDED.pt_state,
        gstin = EXCLUDED.gstin,
        pan = EXCLUDED.pan,
        sector_tags = EXCLUDED.sector_tags
    """
    cur.executemany(query, businesses)


def insert_obligations(cur, obligations):
    query = """
    INSERT INTO obligations (
        business_id, obligation_id, domain, title, description, status, due_date,
        amount, confidence_score, source_portal, source_regulation_version
    ) VALUES (
        %(business_id)s, %(obligation_id)s, %(domain)s, %(title)s, %(description)s, %(status)s, %(due_date)s,
        %(amount)s, %(confidence_score)s, %(source_portal)s, %(source_regulation_version)s
    )
    """
    cur.executemany(query, obligations)


def insert_caal_entries(cur, entries):
    query = """
    INSERT INTO caal_ledger (
        agent_did, agent_name, action_type, business_id, obligation_id, regulation_ids,
        regulation_version, business_state_snapshot, action_payload, confidence_score,
        rail_agreement, human_approved, human_approver_id, action_hash, source_citations
    ) VALUES (
        %(agent_did)s, %(agent_name)s, %(action_type)s, %(business_id)s, %(obligation_id)s, %(regulation_ids)s,
        %(regulation_version)s, %(business_state_snapshot)s, %(action_payload)s, %(confidence_score)s,
        %(rail_agreement)s, %(human_approved)s, %(human_approver_id)s, %(action_hash)s, %(source_citations)s
    )
    """
    payload = []
    for item in entries:
        entry = dict(item)
        entry["business_state_snapshot"] = Json(entry.get("business_state_snapshot", {}))
        entry["action_payload"] = Json(entry.get("action_payload", {}))
        entry["source_citations"] = Json(entry.get("source_citations", {}))
        payload.append(entry)
    cur.executemany(query, payload)


def main():
    users = load_json(USERS_FILE)
    obligations = load_json(OBLIGATIONS_FILE)
    audit_entries = load_json(AUDIT_FILE)

    print(f"Loaded {len(users)} users, {len(obligations)} obligations, {len(audit_entries)} audit entries.")

    conn = get_connection()
    try:
        with conn:
            with conn.cursor() as cur:
                upsert_businesses(cur, users)
                print(f"Upserted businesses: {len(users)}")

                insert_obligations(cur, obligations)
                print(f"Inserted obligations: {len(obligations)}")

                insert_caal_entries(cur, audit_entries)
                print(f"Inserted CAAL entries: {len(audit_entries)}")

        print("Seeding completed successfully.")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
