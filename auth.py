import os
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
from dotenv import load_dotenv
import schemas

# Load environment variables from .env file
load_dotenv()

# --- .env variables ---
# We MUST add these to our .env file
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES"))

# --- Functions ---

def create_access_token(data: dict):
    """Creates a new JWT access token."""
    to_encode = data.copy()
    
    # Set expiration time for the token
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    
    # Create the token
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    
    return encoded_jwt

def verify_access_token(token: str, credentials_exception):
    """Verfies a JWT access token."""
    try:
        # Decode the token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        # Get the user ID from the payload
        user_id: str = payload.get("user_id")
        
        if user_id is None:
            raise credentials_exception
            
        # Validate the token data with our schema
        token_data = schemas.TokenData(id=str(user_id))
        
    except JWTError:
        raise credentials_exception
        
    return token_data