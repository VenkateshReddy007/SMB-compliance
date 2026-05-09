import asyncio
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), 'services/api')))
from datetime import date, timedelta
from uuid import uuid4

from services.api.database import Business, Obligation, AsyncSessionLocal

async def seed_data():
    async with AsyncSessionLocal() as db:
        # 1. Tech Startup - Fully Compliant (Edge Case: High Volume, Perfect Compliance)
        tech_id = uuid4()
        b1 = Business(
            id=tech_id,
            clerk_user_id=f"demo_user_{uuid4()}",
            name="Quantum Cloud Solutions",
            business_type="Technology",
            state="Karnataka",
            annual_turnover=50000000,
            employee_count=150,
            gst_registered=True,
            pf_registered=True,
            esi_registered=True,
            gstin="29ABCDE1234F1Z5",
            pan="ABCDE1234F",
            sector_tags=["IT", "SaaS", "B2B"],
            dpdp_consent_given=True
        )

        # 2. Manufacturing Firm - Highly Non-Compliant (Edge Case: Massive Overdues & Cascade Risk)
        mfg_id = uuid4()
        b2 = Business(
            id=mfg_id,
            clerk_user_id=f"demo_user_{uuid4()}",
            name="Apex Heavy Industries",
            business_type="Manufacturing",
            state="Maharashtra",
            annual_turnover=850000000,
            employee_count=850,
            gst_registered=True,
            pf_registered=True,
            esi_registered=True,
            gstin="27XYZAB9876C1Z2",
            pan="XYZAB9876C",
            sector_tags=["Manufacturing", "Export", "Heavy Machinery"],
            dpdp_consent_given=False # Edge case for data privacy handling
        )

        # 3. Small Freelancer - Unregistered (Edge Case: UI handling empty states)
        free_id = uuid4()
        b3 = Business(
            id=free_id,
            clerk_user_id=f"demo_user_{uuid4()}",
            name="Sarah Designs Studio",
            business_type="Freelance",
            state="Delhi",
            annual_turnover=1500000,
            employee_count=1,
            gst_registered=False,
            pf_registered=False,
            esi_registered=False,
            gstin=None,
            pan="QWERT5678Y",
            sector_tags=["Design", "Consulting"],
            dpdp_consent_given=True
        )

        db.add_all([b1, b2, b3])
        await db.commit()

        # Add Obligations for Tech (Compliant)
        today = date.today()
        tech_obs = [
            Obligation(
                business_id=tech_id, domain="GST", title="GSTR-1 Filing", 
                status="compliant", due_date=today.replace(day=11), amount=250000
            ),
            Obligation(
                business_id=tech_id, domain="GST", title="GSTR-3B Filing", 
                status="compliant", due_date=today.replace(day=20), amount=150000
            ),
            Obligation(
                business_id=tech_id, domain="Payroll", title="PF Contribution", 
                status="compliant", due_date=today.replace(day=15), amount=45000
            )
        ]

        # Add Obligations for Mfg (Overdue / Non-compliant)
        mfg_obs = [
            Obligation(
                business_id=mfg_id, domain="GST", title="GSTR-1 Filing", 
                status="overdue", due_date=today.replace(day=11) - timedelta(days=30), amount=1200000
            ),
            Obligation(
                business_id=mfg_id, domain="GST", title="GSTR-3B Filing", 
                status="overdue", due_date=today.replace(day=20) - timedelta(days=30), amount=850000
            ),
            Obligation(
                business_id=mfg_id, domain="Payroll", title="PF Contribution", 
                status="overdue", due_date=today.replace(day=15) - timedelta(days=60), amount=320000
            ),
            Obligation(
                business_id=mfg_id, domain="Payroll", title="ESI Contribution", 
                status="pending", due_date=today.replace(day=15), amount=110000
            )
        ]

        db.add_all(tech_obs + mfg_obs)
        await db.commit()
        print("Successfully seeded demo data: Quantum Cloud (Compliant), Apex Industries (Non-Compliant), Sarah Designs (Unregistered).")

if __name__ == "__main__":
    asyncio.run(seed_data())
