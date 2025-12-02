from database import SessionLocal, engine
import models
import utils
from datetime import datetime, timedelta
import random

def seed_data():
    db = SessionLocal()
    
    try:
        print("Seeding data...")
        
        # 1. Create Demo User
        email = "demo@kairo.app"
        username = "demo_user"
        password = "password123"
        
        # Check if exists
        existing = db.query(models.User).filter(models.User.email == email).first()
        if existing:
            print("Demo user already exists. Skipping user creation.")
            user = existing
        else:
            hashed_pw = utils.hash_password(password)
            user = models.User(
                email=email,
                hashed_password=hashed_pw,
                username=username,
                full_name="Demo User",
                profile_picture_url=f"https://api.dicebear.com/9.x/avataaars/svg?seed={username}"
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"Created user: {email} / {password}")

            print(f"Created user: {email} / {password}")

        # 1.5 Create Notebook
        notebook = models.Notebook(title="Daily Journal", user_id=user.id)
        db.add(notebook)
        db.commit()
        db.refresh(notebook)
        print(f"Created notebook: {notebook.title}")

        # 2. Create Journal Entries
        # Clear existing entries for this user to avoid duplicates if run multiple times
        db.query(models.JournalEntry).filter(models.JournalEntry.user_id == user.id).delete()
        
        entries_data = [
            # Joy / Excitement
            {"text": "I finally presented my project today and it went amazing! The team loved the new design.", "sentiment": "joy", "days_ago": 0},
            {"text": "Had a wonderful dinner with friends. We laughed so much my sides hurt. I feel so grateful.", "sentiment": "joy", "days_ago": 1},
            {"text": "Got promoted! All the hard work finally paid off. I'm on cloud nine.", "sentiment": "joy", "days_ago": 5},
            
            # Sadness
            {"text": "Feeling a bit down today. It's raining and I miss my family back home.", "sentiment": "sadness", "days_ago": 2},
            {"text": "My favorite coffee mug broke this morning. It's a small thing but it made me sad.", "sentiment": "sadness", "days_ago": 6},
            
            # Anger / Frustration
            {"text": "Traffic was absolutely terrible. I was stuck for two hours and missed my appointment. So furious!", "sentiment": "anger", "days_ago": 3},
            {"text": "My laptop crashed right before I saved my work. I lost an hour of progress. Ugh!", "sentiment": "anger", "days_ago": 7},
            
            # Fear / Anxiety
            {"text": "I have a big presentation coming up and I'm terrified I'll mess it up. My heart is racing.", "sentiment": "fear", "days_ago": 4},
            {"text": "Heard a strange noise outside last night. Couldn't sleep well. Felt very uneasy.", "sentiment": "fear", "days_ago": 8},
            
            # Disgust
            {"text": "Found a hair in my food at the cafeteria. I instantly lost my appetite. So gross.", "sentiment": "disgust", "days_ago": 9},
            
            # Surprise
            {"text": "My friends threw me a surprise birthday party! I had no idea. I was totally shocked.", "sentiment": "surprise", "days_ago": 10},
            
            # Neutral
            {"text": "Just a regular day. Went to the gym, did some grocery shopping, and read a book.", "sentiment": "neutral", "days_ago": 11},
            {"text": "Spent the afternoon organizing my bookshelf. It feels good to be tidy.", "sentiment": "neutral", "days_ago": 12},
        ]
        
        for data in entries_data:
            created_at = datetime.now() - timedelta(days=data["days_ago"])
            entry = models.JournalEntry(
                text_content=data["text"],
                sentiment=data["sentiment"],
                user_id=user.id,
                created_at=created_at,
                notebook_id=notebook.id
            )
            db.add(entry)
        
        db.commit()
        print(f"Added {len(entries_data)} journal entries.")
        
    except Exception as e:
        print(f"Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
