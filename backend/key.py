import secrets
import string

# Define the characters to include: uppercase, lowercase, and digits
characters = string.ascii_letters + string.digits

# Generate a random 60-character secret key
secret_key = ''.join(secrets.choice(characters) for _ in range(60))

print(secret_key)
