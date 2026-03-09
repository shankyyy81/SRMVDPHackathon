from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

try:
    print("Attempting to hash 'password123'...")
    hash = pwd_context.hash("password123")
    print(f"Success: {hash}")
except Exception as e:
    print(f"Error: {e}")
