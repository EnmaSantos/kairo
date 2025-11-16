import bcrypt
import hashlib

def _prepare_password(password: str) -> bytes:
    """
    Prepares a password for bcrypt by handling the 72-byte limit.
    For passwords longer than 72 bytes, we hash them with SHA-256 first.
    This is a common pattern to work around bcrypt's limitation.
    """
    password_bytes = password.encode('utf-8')
    
    # If password is too long for bcrypt (>72 bytes), hash it first
    if len(password_bytes) > 72:
        # Use SHA-256 to create a fixed-length hash
        return hashlib.sha256(password_bytes).hexdigest().encode('utf-8')
    
    return password_bytes

def hash_password(password: str) -> str:
    """Hashes a plaintext password using bcrypt."""
    prepared_password = _prepare_password(password)
    # Generate a salt and hash the password
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(prepared_password, salt)
    # Return as string for storage in database
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies a plaintext password against a hash."""
    prepared_password = _prepare_password(plain_password)
    hashed_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(prepared_password, hashed_bytes)