"""
Test Points and Coupons System
"""
import requests
import json

BASE_URL = "http://localhost:8000/api/v1"

def test_points_and_coupons():
    print("=" * 60)
    print("Testing Points and Coupons System")
    print("=" * 60)
    
    # Step 1: Login
    print("\n1. Login...")
    login_data = {
        "phone": "1234567890",
        "password": "password123"
    }
    response = requests.post(f"{BASE_URL}/auth/login", json=login_data)
    if response.status_code == 200:
        token = response.json()["access_token"]
        print(f"✅ Login successful")
        print(f"   Token: {token[:20]}...")
    else:
        print(f"❌ Login failed: {response.text}")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Step 2: Get points balance
    print("\n2. Get points balance...")
    response = requests.get(f"{BASE_URL}/points/balance", headers=headers)
    if response.status_code == 200:
        balance = response.json()
        print(f"✅ Points balance retrieved")
        print(f"   Available: {balance['available_points']}")
        print(f"   Total: {balance['total_points']}")
    else:
        print(f"❌ Failed: {response.text}")
    
    # Step 3: Award test points
    print("\n3. Award test points (100 points)...")
    response = requests.post(f"{BASE_URL}/points/test-award?amount=100", headers=headers)
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Points awarded")
        print(f"   Points awarded: {result['points_awarded']}")
        print(f"   New balance: {result['new_balance']}")
    else:
        print(f"❌ Failed: {response.text}")
    
    # Step 4: Get point transactions
    print("\n4. Get point transactions...")
    response = requests.get(f"{BASE_URL}/points/transactions", headers=headers)
    if response.status_code == 200:
        transactions = response.json()
        print(f"✅ Transactions retrieved: {len(transactions)} transactions")
        if transactions:
            latest = transactions[0]
            print(f"   Latest: {latest['reason']} ({latest['amount']} points)")
    else:
        print(f"❌ Failed: {response.text}")
    
    # Step 5: Create a test coupon (admin only - will fail for regular user)
    print("\n5. Create test coupon...")
    coupon_data = {
        "name": "Test $5 Coupon",
        "description": "Test coupon for 100 points",
        "type": "fixed_amount",
        "category": "normal",
        "discount_value": 5.0,
        "min_amount": 0,
        "valid_days": 30,
        "is_active": True,
        "points_required": 100
    }
    response = requests.post(f"{BASE_URL}/coupons/create", json=coupon_data, headers=headers)
    if response.status_code == 200:
        coupon = response.json()
        coupon_id = coupon['id']
        print(f"✅ Coupon created")
        print(f"   ID: {coupon_id}")
        print(f"   Name: {coupon['name']}")
    else:
        print(f"⚠️  Coupon creation skipped (requires admin): {response.status_code}")
        # Use existing coupon or skip exchange test
        print("   Skipping exchange test...")
        coupon_id = None
    
    # Step 6: Get exchangeable coupons
    print("\n6. Get exchangeable coupons...")
    response = requests.get(f"{BASE_URL}/coupons/exchangeable", headers=headers)
    if response.status_code == 200:
        coupons = response.json()
        print(f"✅ Exchangeable coupons: {len(coupons)}")
        if coupons and not coupon_id:
            coupon_id = coupons[0]['id']
            print(f"   Using coupon ID: {coupon_id}")
    else:
        print(f"❌ Failed: {response.text}")
    
    # Step 7: Exchange points for coupon
    if coupon_id:
        print(f"\n7. Exchange points for coupon (ID: {coupon_id})...")
        response = requests.post(f"{BASE_URL}/coupons/exchange/{coupon_id}", headers=headers)
        if response.status_code == 200:
            user_coupon = response.json()
            print(f"✅ Coupon exchanged")
            print(f"   User Coupon ID: {user_coupon['id']}")
            print(f"   Status: {user_coupon['status']}")
            print(f"   Expires: {user_coupon['expires_at']}")
        else:
            print(f"❌ Failed: {response.text}")
    else:
        print("\n7. Exchange points for coupon... SKIPPED (no coupon available)")
    
    # Step 8: Get my coupons
    print("\n8. Get my coupons...")
    response = requests.get(f"{BASE_URL}/coupons/my-coupons", headers=headers)
    if response.status_code == 200:
        my_coupons = response.json()
        print(f"✅ My coupons: {len(my_coupons)}")
        for uc in my_coupons[:3]:
            print(f"   - {uc['coupon']['name']} ({uc['status']})")
    else:
        print(f"❌ Failed: {response.text}")
    
    # Step 9: Check final points balance
    print("\n9. Check final points balance...")
    response = requests.get(f"{BASE_URL}/points/balance", headers=headers)
    if response.status_code == 200:
        balance = response.json()
        print(f"✅ Final balance")
        print(f"   Available: {balance['available_points']}")
        print(f"   Total: {balance['total_points']}")
    else:
        print(f"❌ Failed: {response.text}")
    
    print("\n" + "=" * 60)
    print("Test completed!")
    print("=" * 60)


if __name__ == "__main__":
    test_points_and_coupons()
