"""
Seed script to populate database with test data
Run with: python seed.py
"""
from app import create_app
from extensions import db
from models import User, Incident, MobileReport, Media
from datetime import datetime, timedelta, timezone

def seed_database():
    """Populate database with initial data"""
    app = create_app()
    
    with app.app_context():
        # Clear existing data
        print("Clearing existing data...")
        db.drop_all()
        db.create_all()
        
        # Create users
        print("Creating users...")
        admin = User(username='admin', role='admin')
        admin.set_password('admin123')
        
        operator = User(username='operator', role='operator')
        operator.set_password('operator123')
        
        db.session.add(admin)
        db.session.add(operator)
        db.session.commit()
        
        print(f"✓ Created user: admin / admin123")
        print(f"✓ Created user: operator / operator123")
        
        # Create test incidents
        print("\nCreating test incidents...")
        
        # CCTV incident (recent - 10 minutes ago)
        now = datetime.utcnow()
        incident1 = Incident(
            source='CCTV',
            camera_id='CAM-001',
            lat=13.0583,  # Chennai coordinates
            lng=80.2571,
            occurred_at=now - timedelta(minutes=10),
            confidence=0.89,
            severity='high',
            status='new'
        )
        db.session.add(incident1)
        
        # Mobile incident with sensor data (5 minutes ago)
        mobile_report = MobileReport(
            user_id='mobile_user_123',
            lat=13.0600,
            lng=80.2580,
            timestamp=now - timedelta(minutes=5),
            acc_peak=4.5,
            gyro_peak=180.0,
            speed=65.0,
            raw_json='{"ax": 4.5, "ay": 2.1, "az": -1.2, "gx": 180, "gy": 45, "gz": 12}'
        )
        db.session.add(mobile_report)
        db.session.flush()
        
        incident2 = Incident(
            source='MOBILE',
            mobile_report_id=mobile_report.id,
            lat=13.0600,
            lng=80.2580,
            occurred_at=mobile_report.timestamp,
            severity='high',
            status='new'
        )
        db.session.add(incident2)
        
        # Acknowledged CCTV incident (1 hour ago)
        incident3 = Incident(
            source='CCTV',
            camera_id='CAM-002',
            lat=13.0620,
            lng=80.2600,
            occurred_at=now - timedelta(hours=1),
            confidence=0.76,
            severity='medium',
            status='acknowledged'
        )
        db.session.add(incident3)
        
        db.session.commit()
        
        print(f"✓ Created {Incident.query.count()} test incidents")
        print(f"  - Incident #{incident1.id}: CCTV (new)")
        print(f"  - Incident #{incident2.id}: Mobile (new)")
        print(f"  - Incident #{incident3.id}: CCTV (acknowledged)")
        
        print("\n" + "="*50)
        print("✓ Database seeded successfully!")
        print("="*50)
        print("\nLogin credentials:")
        print("  Admin:    admin / admin123")
        print("  Operator: operator / operator123")
        print("\nStart the server with: python app.py")

if __name__ == '__main__':
    seed_database()