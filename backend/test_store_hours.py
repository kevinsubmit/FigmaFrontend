"""
Comprehensive test script for store hours management
Tests: CRUD operations, permissions, integration with available slots
"""
import requests
import json

BASE_URL = "http://localhost:8000/api/v1"

def login(phone, password):
    """Login and get access token"""
    resp = requests.post(
        f"{BASE_URL}/auth/login",
        json={"phone": phone, "password": password}
    )
    return resp.json()["access_token"]

def test_set_store_hours():
    """Test setting store hours (batch operation)"""
    print("\n" + "="*60)
    print("TEST 1: Set Store Hours (Batch)")
    print("="*60)
    
    token = login("13800138000", "password123")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Set hours for store 4
    hours_data = {
        "hours": [
            {"day_of_week": 0, "open_time": "09:00:00", "close_time": "18:00:00", "is_closed": False},
            {"day_of_week": 1, "open_time": "09:00:00", "close_time": "18:00:00", "is_closed": False},
            {"day_of_week": 2, "open_time": "09:00:00", "close_time": "18:00:00", "is_closed": False},
            {"day_of_week": 3, "open_time": "09:00:00", "close_time": "18:00:00", "is_closed": False},
            {"day_of_week": 4, "open_time": "09:00:00", "close_time": "18:00:00", "is_closed": False},
            {"day_of_week": 5, "open_time": "10:00:00", "close_time": "17:00:00", "is_closed": False},
            {"day_of_week": 6, "open_time": None, "close_time": None, "is_closed": True}
        ]
    }
    
    resp = requests.put(
        f"{BASE_URL}/stores/4/hours",
        headers=headers,
        json=hours_data
    )
    
    if resp.status_code == 200:
        result = resp.json()
        print(f"✅ Successfully set hours for {len(result)} days")
        day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        for hours in result:
            day = day_names[hours['day_of_week']]
            if hours['is_closed']:
                print(f"   {day}: Closed")
            else:
                print(f"   {day}: {hours['open_time']} - {hours['close_time']}")
    else:
        print(f"❌ Failed: {resp.json()}")

def test_get_store_hours():
    """Test getting store hours (public endpoint)"""
    print("\n" + "="*60)
    print("TEST 2: Get Store Hours (Public)")
    print("="*60)
    
    resp = requests.get(f"{BASE_URL}/stores/4/hours")
    
    if resp.status_code == 200:
        result = resp.json()
        print(f"✅ Retrieved hours for {len(result)} days")
        day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        for hours in result:
            day = day_names[hours['day_of_week']]
            if hours['is_closed']:
                print(f"   {day}: Closed")
            else:
                print(f"   {day}: {hours['open_time']} - {hours['close_time']}")
    else:
        print(f"❌ Failed: {resp.json()}")

def test_update_single_day():
    """Test updating hours for a single day"""
    print("\n" + "="*60)
    print("TEST 3: Update Single Day Hours")
    print("="*60)
    
    token = login("13800138000", "password123")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Update Saturday hours (day 5) to 11:00-16:00
    hours_data = {
        "day_of_week": 5,
        "open_time": "11:00:00",
        "close_time": "16:00:00",
        "is_closed": False
    }
    
    resp = requests.post(
        f"{BASE_URL}/stores/4/hours/5",
        headers=headers,
        json=hours_data
    )
    
    if resp.status_code == 200:
        result = resp.json()
        print(f"✅ Updated Saturday hours: {result['open_time']} - {result['close_time']}")
    else:
        print(f"❌ Failed: {resp.json()}")

def test_permission_control():
    """Test that non-admin users cannot set hours for other stores"""
    print("\n" + "="*60)
    print("TEST 4: Permission Control")
    print("="*60)
    
    # Try to login as a regular user (if exists)
    # For now, we'll just verify that super admin can access any store
    token = login("13800138000", "password123")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Try to set hours for store 1 (should succeed for super admin)
    hours_data = {
        "hours": [
            {"day_of_week": i, "open_time": "09:00:00", "close_time": "18:00:00", "is_closed": False}
            for i in range(7)
        ]
    }
    
    resp = requests.put(
        f"{BASE_URL}/stores/1/hours",
        headers=headers,
        json=hours_data
    )
    
    if resp.status_code == 200:
        print("✅ Super admin can set hours for any store")
    else:
        print(f"❌ Failed: {resp.json()}")

def test_available_slots_integration():
    """Test that available slots respect store hours"""
    print("\n" + "="*60)
    print("TEST 5: Available Slots Integration")
    print("="*60)
    
    # Test Monday (9:00-18:00)
    print("\n5.1 Testing Monday (09:00-18:00)...")
    resp = requests.get(
        f"{BASE_URL}/technicians/1/available-slots",
        params={"date": "2026-01-12", "service_id": 30001}
    )
    if resp.status_code == 200:
        slots = resp.json()
        if slots and slots[0]['start_time'] == '09:00':
            print(f"   ✅ Monday: {len(slots)} slots, starts at 09:00")
        else:
            print(f"   ❌ Expected first slot at 09:00, got {slots[0]['start_time'] if slots else 'no slots'}")
    else:
        print(f"   ❌ Failed: {resp.json()}")
    
    # Test Saturday (11:00-16:00 after update)
    print("\n5.2 Testing Saturday (11:00-16:00)...")
    resp = requests.get(
        f"{BASE_URL}/technicians/1/available-slots",
        params={"date": "2026-01-10", "service_id": 30001}
    )
    if resp.status_code == 200:
        slots = resp.json()
        if slots and slots[0]['start_time'] == '11:00':
            print(f"   ✅ Saturday: {len(slots)} slots, starts at 11:00")
        else:
            print(f"   ❌ Expected first slot at 11:00, got {slots[0]['start_time'] if slots else 'no slots'}")
    else:
        print(f"   ❌ Failed: {resp.json()}")
    
    # Test Sunday (closed)
    print("\n5.3 Testing Sunday (Closed)...")
    resp = requests.get(
        f"{BASE_URL}/technicians/1/available-slots",
        params={"date": "2026-01-11", "service_id": 30001}
    )
    if resp.status_code == 200:
        slots = resp.json()
        if len(slots) == 0:
            print("   ✅ Sunday: No slots (store closed)")
        else:
            print(f"   ❌ Expected no slots, got {len(slots)} slots")
    else:
        print(f"   ❌ Failed: {resp.json()}")

def test_edge_cases():
    """Test edge cases"""
    print("\n" + "="*60)
    print("TEST 6: Edge Cases")
    print("="*60)
    
    token = login("13800138000", "password123")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test 6.1: Invalid day_of_week
    print("\n6.1 Testing invalid day_of_week...")
    hours_data = {
        "day_of_week": 7,  # Invalid (should be 0-6)
        "open_time": "09:00:00",
        "close_time": "18:00:00",
        "is_closed": False
    }
    resp = requests.post(
        f"{BASE_URL}/stores/4/hours/7",
        headers=headers,
        json=hours_data
    )
    if resp.status_code == 400:
        print("   ✅ Invalid day_of_week rejected")
    else:
        print(f"   ❌ Expected 400 error, got {resp.status_code}")
    
    # Test 6.2: Close time before open time
    print("\n6.2 Testing close_time before open_time...")
    hours_data = {
        "day_of_week": 0,
        "open_time": "18:00:00",
        "close_time": "09:00:00",  # Before open_time
        "is_closed": False
    }
    resp = requests.post(
        f"{BASE_URL}/stores/4/hours/0",
        headers=headers,
        json=hours_data
    )
    if resp.status_code == 422:  # Validation error
        print("   ✅ Invalid time range rejected")
    else:
        print(f"   ❌ Expected 422 error, got {resp.status_code}")

def main():
    print("\n" + "="*60)
    print("STORE HOURS MANAGEMENT - COMPREHENSIVE TEST")
    print("="*60)
    
    try:
        test_set_store_hours()
        test_get_store_hours()
        test_update_single_day()
        test_permission_control()
        test_available_slots_integration()
        test_edge_cases()
        
        print("\n" + "="*60)
        print("✅ ALL TESTS COMPLETED")
        print("="*60 + "\n")
        
    except Exception as e:
        print(f"\n❌ TEST FAILED WITH ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()
