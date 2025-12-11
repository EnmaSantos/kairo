import models
from database import SessionLocal, engine
import utils
from datetime import datetime, timedelta
import random

# Create tables if they don't exist
models.Base.metadata.create_all(bind=engine)

def seed_data():
    db = SessionLocal()
    
    try:
        # 1. Create Demo User
        email = "jack.tucker@example.com"
        username = "jacktucker"
        password = "password123"
        
        # Check if exists (by email OR username)
        existing_user = db.query(models.User).filter(
            (models.User.email == email) | (models.User.username == username)
        ).first()
        
        if existing_user:
            print(f"User {username} already exists. Updating password...")
            existing_user.hashed_password = utils.hash_password(password)
            db.commit()
            user_id = existing_user.id
        else:
            print(f"Creating new user: {email}")
            hashed_pw = utils.hash_password(password)
            new_user = models.User(
                email=email,
                username=username,
                full_name="Jack Tucker",
                hashed_password=hashed_pw,
                profile_picture_url=f"https://api.dicebear.com/9.x/avataaars/svg?seed={username}"
            )
            db.add(new_user)
            db.commit()
            db.refresh(new_user)
            user_id = new_user.id
            print(f"User created with ID: {user_id}")

        # 2. Generate 50 Entries
        sentiments = ["joy", "sadness", "anger", "fear", "surprise", "neutral"]
        
        # Sample texts for different sentiments
        texts = {
            "joy": [
                "Had an amazing day today! The sun was shining and I felt great.",
                "Finally finished that big project. So relieved and happy!",
                "Went out with friends and laughed so much my stomach hurts.",
                "Got a promotion at work! Hard work pays off.",
                "The coffee this morning was absolutely perfect."
            ],
            "sadness": [
                "Feeling a bit down today. Not sure why.",
                "Missed a deadline and I feel terrible about it.",
                "It's raining and gloomy, matching my mood.",
                "Had a fight with a friend. I hope we can make up.",
                "Just one of those days where nothing goes right."
            ],
            "anger": [
                "So frustrated with the traffic this morning!",
                "Why can't people just be honest? It makes me so mad.",
                "My computer crashed and I lost an hour of work. Ugh!",
                "I can't believe he said that to me.",
                "Everything is annoying me today."
            ],
            "fear": [
                "Nervous about the presentation tomorrow.",
                "Had a weird dream that really shook me up.",
                "Worried about the future and what comes next.",
                "Anxious about the meeting with the boss.",
                "Feeling a bit overwhelmed by everything."
            ],
            "surprise": [
                "Wow, I didn't expect that to happen!",
                "Ran into an old friend I haven't seen in years.",
                "The movie had such a crazy plot twist.",
                "Got a surprise gift in the mail today.",
                "I can't believe it's already December."
            ],
            "neutral": [
                "Just a normal day. Nothing special happened.",
                "Went to the grocery store and bought milk.",
                "Did some reading and cleaned the house.",
                "Work was okay. Standard meetings.",
                "Had a sandwich for lunch."
            ]
        }

        print("Generating 50 entries...")
        for i in range(50):
            # Random date within last 60 days
            days_ago = random.randint(0, 60)
            entry_date = datetime.now() - timedelta(days=days_ago)
            
            # Random sentiment
            sentiment = random.choice(sentiments)
            
            # Random text (mix of template + random number to make it unique)
            base_text = random.choice(texts[sentiment])
            text_content = f"{base_text} (Log #{i+1})"
            
            new_entry = models.JournalEntry(
                user_id=user_id,
                text_content=text_content,
                sentiment=sentiment,
                created_at=entry_date,
                notebook_id=None # Start uncategorized
            )
            db.add(new_entry)
        
        db.commit()
        print("Successfully added 50 entries!")
        print(f"Login with: {email} / {password}")

    except Exception as e:
        print(f"Error seeding data: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
