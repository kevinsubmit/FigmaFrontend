"""
Test script for Users API endpoints
"""
import requests
import json

BASE_URL = "http://localhost:8000/api/v1"

# Test credentials
TEST_PHONE = "15551234567"  # Using newly created test user
TEST_PASSWORD = "testpass123"

def test_login():
    """Test login to get access token"""
    print("\n=== Testing Login ===")
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json={
            "phone": TEST_PHONE,
            "password": TEST_PASSWORD
        }
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Access Token: {data['access_token'][:50]}...")
        return data['access_token']
    else:
        print(f"Error: {response.text}")
        return None

def test_get_current_user(token):
    """Test getting current user info"""
    print("\n=== Testing Get Current User ===")
    response = requests.get(
        f"{BASE_URL}/auth/me",
        headers={"Authorization": f"Bearer {token}"}
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"User: {json.dumps(data, indent=2)}")
        return data
    else:
        print(f"Error: {response.text}")
        return None

def test_update_profile(token):
    """Test updating user profile"""
    print("\n=== Testing Update Profile ===")
    response = requests.put(
        f"{BASE_URL}/users/profile",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "full_name": "Test User Updated",
            "gender": "male"
        }
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        return True
    else:
        print(f"Error: {response.text}")
        return False

def test_update_password(token):
    """Test updating password"""
    print("\n=== Testing Update Password ===")
    response = requests.put(
        f"{BASE_URL}/users/password",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "current_password": TEST_PASSWORD,
            "new_password": "newpass123456"
        }
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        
        # Change password back
        print("\n=== Changing Password Back ===")
        response2 = requests.put(
            f"{BASE_URL}/users/password",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "current_password": "newpass123456",
                "new_password": TEST_PASSWORD
            }
        )
        print(f"Status: {response2.status_code}")
        return True
    else:
        print(f"Error: {response.text}")
        return False

def test_update_settings(token):
    """Test updating user settings"""
    print("\n=== Testing Update Settings ===")
    response = requests.put(
        f"{BASE_URL}/users/settings",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "notification_enabled": True,
            "language": "en"
        }
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Response: {json.dumps(data, indent=2)}")
        return True
    else:
        print(f"Error: {response.text}")
        return False

def main():
    """Run all tests"""
    print("=" * 50)
    print("Testing Users API Endpoints")
    print("=" * 50)
    
    # Login first
    token = test_login()
    if not token:
        print("\n❌ Login failed, cannot proceed with tests")
        return
    
    # Get current user
    user = test_get_current_user(token)
    if not user:
        print("\n❌ Failed to get current user")
        return
    
    # Test update profile
    if test_update_profile(token):
        print("\n✅ Update profile test passed")
    else:
        print("\n❌ Update profile test failed")
    
    # Test update password
    if test_update_password(token):
        print("\n✅ Update password test passed")
    else:
        print("\n❌ Update password test failed")
    
    # Test update settings
    if test_update_settings(token):
        print("\n✅ Update settings test passed")
    else:
        print("\n❌ Update settings test failed")
    
    print("\n" + "=" * 50)
    print("All tests completed!")
    print("=" * 50)

if __name__ == "__main__":
    main()
