import os
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime, timezone

# Initialize Firebase Admin
# Make sure to set the GOOGLE_APPLICATION_CREDENTIALS environment variable 
# or provide the path to your service account key file here.
CREDENTIALS_PATH = os.path.join(os.path.dirname(__file__), 'serviceAccountKey.json')

try:
    cred = credentials.Certificate(CREDENTIALS_PATH)
    firebase_admin.initialize_app(cred)
    print("Firebase initialized successfully.")
except ValueError:
    # If app is already initialized
    pass
except Exception as e:
    print(f"Error initializing Firebase: {e}")
    print(f"Please ensure {CREDENTIALS_PATH} exists and is valid.")
    exit(1)

db = firestore.client()

def seed_users():
    print("Seeding 'users' collection...")
    users_ref = db.collection('users')
    
    sample_users = [
        {
            "id": "admin@saferail.ai",
            "data": {
                "email": "admin@saferail.ai",
                "name": "System Admin",
                "role": "Administrator",
                "isAdmin": True
            }
        },
        {
            "id": "alice.johnson@company.com",
            "data": {
                "email": "alice.johnson@company.com",
                "name": "Alice Johnson",
                "role": "Sales",
                "isAdmin": False
            }
        },
        {
            "id": "bob.smith@company.com",
            "data": {
                "email": "bob.smith@company.com",
                "name": "Bob Smith",
                "role": "Engineering",
                "isAdmin": False
            }
        }
    ]
    
    for user in sample_users:
        users_ref.document(user["id"]).set(user["data"])
        print(f"  - Created user: {user['id']}")

def seed_rules():
    print("Seeding 'rules' collection...")
    rules_ref = db.collection('rules')
    
    sample_rules = [
        {
            "id": "rule_mergers_acquisitions",
            "data": {
                "title": "M&A discussion",
                "rule": "Flag any mention of unannounced mergers, acquisitions, or IPOs.",
                "status": "active",
                "externalOnly": True,
                "appliedTo": "all"
            }
        },
        {
            "id": "rule_financial_metrics",
            "data": {
                "title": "Quarterly Financials",
                "rule": "Block sending of quarterly financial metrics before official public release.",
                "status": "active",
                "externalOnly": True,
                "appliedTo": ["alice.johnson@company.com"]
            }
        },
        {
            "id": "rule_source_code",
            "data": {
                "title": "Source Code Sharing",
                "rule": "Prevent sending proprietary source code or system architecture diagrams outside the company.",
                "status": "active",
                "externalOnly": True,
                "appliedTo": ["bob.smith@company.com"]
            }
        }
    ]
    
    for rule in sample_rules:
        rules_ref.document(rule["id"]).set(rule["data"])
        print(f"  - Created rule: {rule['id']} ({rule['data']['title']})")

def seed_incidents():
    print("Seeding 'incidents' collection...")
    incidents_ref = db.collection('incidents')
    
    now_iso = datetime.now(timezone.utc).isoformat()
    
    sample_incidents = [
        {
            "id": "incident_1001",
            "data": {
                "email": "alice.johnson@company.com",
                "rule": "rule_financial_metrics",
                "severity": "warning",
                "date": now_iso
            }
        },
        {
            "id": "incident_1002",
            "data": {
                "email": "bob.smith@company.com",
                "rule": "rule_source_code",
                "severity": "violation",
                "date": now_iso
            }
        }
    ]
    
    for incident in sample_incidents:
        incidents_ref.document(incident["id"]).set(incident["data"])
        print(f"  - Created incident: {incident['id']}")

def seed_config():
    print("Seeding 'config' collection...")
    config_ref = db.collection('config')
    
    # Settings Document
    settings_data = {
        "unsafe_domains": "competitor.com\nmalicious-site.org",
        "denied_entities": ["CREDIT_CARD", "US_SSN", "PHONE_NUMBER"]
    }
    config_ref.document('settings').set(settings_data)
    print("  - Created config/settings")
    
    # Analytics Document
    analytics_data = {
        "total_incidents_logged": 2,
        "active_users": 3,
        "last_updated": datetime.now(timezone.utc).isoformat()
    }
    config_ref.document('analytics').set(analytics_data)
    print("  - Created config/analytics")

if __name__ == "__main__":
    print("Starting database seed...")
    seed_users()
    seed_rules()
    seed_incidents()
    seed_config()
    print("Database seeding completed successfully!")
