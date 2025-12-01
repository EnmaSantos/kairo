from database import SessionLocal
import models

db = SessionLocal()
user = db.query(models.User).filter(models.User.email == "demo@kairo.app").first()
if user:
    print(f"Demo user found: {user.email}")
    count = db.query(models.JournalEntry).filter(models.JournalEntry.user_id == user.id).count()
    print(f"Entry count: {count}")
else:
    print("Demo user not found.")
db.close()
