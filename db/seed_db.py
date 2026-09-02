import os
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime, timezone

# Initialize Firebase Admin
# Make sure to set the GOOGLE_APPLICATION_CREDENTIALS environment variable 
# or provide the path to your service account key file here.
CREDENTIALS_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'serviceAccountKey.json')

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
                "role": "administrative",
                "isAdmin": True
            }
        },
        {
            "id": "alice.johnson@company.com",
            "data": {
                "email": "alice.johnson@company.com",
                "name": "Alice Johnson",
                "role": "finance",
                "isAdmin": False
            }
        },
        {
            "id": "bob.smith@company.com",
            "data": {
                "email": "bob.smith@company.com",
                "name": "Bob Smith",
                "role": "engineering",
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
            "id": "rule_financial_returns",
            "data": {
                "title": "Financial Returns",
                "rule": 'No promises of specific financial returns (e.g., "guaranteed 10%").',
                "status": "active",
                "externalOnly": False,
                "scope": "all"
            }
        },
        {
            "id": "rule_absolute_terms",
            "data": {
                "title": "Absolute Terms",
                "rule": 'Do not use absolute terms like "best," "perfect," or "safest" without a citation.',
                "status": "active",
                "externalOnly": False,
                "scope": "all"
            }
        },
        {
            "id": "rule_capital_at_risk",
            "data": {
                "title": "Capital at Risk",
                "rule": 'Must include the disclaimer "Capital at risk" when mentioning investments.',
                "status": "active",
                "externalOnly": False,
                "scope": "all"
            }
        },
        {
            "id": "rule_competitor_names",
            "data": {
                "title": "Competitor Names",
                "rule": 'No mention of competitor names in a negative light.',
                "status": "active",
                "externalOnly": False,
                "scope": "all"
            }
        },
        {
            "id": "rule_date_format",
            "data": {
                "title": "Date Format",
                "rule": 'All dates must be in DD/MM/YYYY format.',
                "status": "active",
                "externalOnly": False,
                "scope": "all"
            }
        },
        {
            "id": "rule_personal_data",
            "data": {
                "title": "Personal Data Leakage",
                "rule": 'No disguised personal data leakages, explicit and inexplicit.',
                "status": "active",
                "externalOnly": False,
                "scope": "all"
            }
        },
        {
            "id": "rule_financial_accounts",
            "data": {
                "title": "Personal Financial Accounts",
                "rule": 'No mention of personal financial accounts',
                "status": "active",
                "externalOnly": False,
                "scope": "administrative"
            }
        },
        {
            "id": "rule_splitting_contracts",
            "data": {
                "title": "Threshold Splitting",
                "rule": 'Trigger when the email suggests splitting contracts, purchase orders, scopes, or invoices to avoid approval, Legal review, signing thresholds, or procurement process.',
                "status": "active",
                "externalOnly": False,
                "scope": "all"
            }
        },
        {
            "id": "rule_four_eye_principle",
            "data": {
                "title": "Four-Eye Principle",
                "rule": 'Four-eye principle for commitments above EUR 5,000',
                "status": "active",
                "externalOnly": False,
                "scope": "finance"
            }
        },
        {
            "id": "rule_commitments_5000",
            "data": {
                "title": "Commitments above 5k",
                "rule": 'Trigger when the email appears to approve, accept, order, renew, amend, or commit to something with a value above EUR 5,000, and there is no clear authorized countersigner in cc',
                "status": "active",
                "externalOnly": False,
                "scope": "all"
            }
        },
        {
            "id": "rule_legal_review",
            "data": {
                "title": "Legal Review 150k",
                "rule": 'Legal review trigger above EUR 150,000 or high-risk contract type',
                "status": "active",
                "externalOnly": False,
                "scope": "all"
            }
        },
        {
            "id": "rule_contract_150000",
            "data": {
                "title": "Contract Value above 150k",
                "rule": 'Trigger when the email appears to send, approve, sign, accept, renew, amend, or negotiate a contract with total value above EUR 150,000, or when the email involves legal-review triggers such as personal data processing or uncertain clauses.',
                "status": "active",
                "externalOnly": False,
                "scope": "engineering"
            }
        },
        {
            "id": "rule_circumvention",
            "data": {
                "title": "Circumvention Language",
                "rule": 'Circumvention or threshold-splitting language',
                "status": "active",
                "externalOnly": False,
                "scope": "all"
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
