"""
Debug script to test password hashing
"""
from app.core.security import get_password_hash, verify_password

# Test passwords
test_passwords = [
    "12345678",
    "a" * 100,  # 100 characters
    "测试密码",  # Chinese characters
    "password123!@#",
]

print("=" * 60)
print("Password Hashing Debug Script")
print("=" * 60)

for password in test_passwords:
    print(f"\nTesting password: {repr(password)}")
    print(f"Length (chars): {len(password)}")
    print(f"Length (bytes): {len(password.encode('utf-8'))}")
    
    try:
        # Try to hash the password
        hashed = get_password_hash(password)
        print(f"✅ Hash successful: {hashed[:50]}...")
        
        # Try to verify the password
        is_valid = verify_password(password, hashed)
        print(f"✅ Verification: {is_valid}")
        
    except Exception as e:
        print(f"❌ Error: {type(e).__name__}: {str(e)}")

print("\n" + "=" * 60)
print("Debug complete")
print("=" * 60)
