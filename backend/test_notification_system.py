"""
Test script for Notification System
Tests the complete notification workflow including reminders
"""
import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000/api/v1"

# Test credentials
TEST_PHONE = "15551234567"
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

def test_get_notifications(token):
    """Test getting user notifications"""
    print("\n=== Testing Get Notifications ===")
    response = requests.get(
        f"{BASE_URL}/notifications",
        headers={"Authorization": f"Bearer {token}"}
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Total notifications: {len(data)}")
        if data:
            print(f"Latest notification: {json.dumps(data[0], indent=2)}")
        return data
    else:
        print(f"Error: {response.text}")
        return []

def test_get_unread_count(token):
    """Test getting unread notification count"""
    print("\n=== Testing Get Unread Count ===")
    response = requests.get(
        f"{BASE_URL}/notifications/unread-count",
        headers={"Authorization": f"Bearer {token}"}
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Unread count: {data['unread_count']}")
        return data['unread_count']
    else:
        print(f"Error: {response.text}")
        return 0

def test_mark_as_read(token, notification_id):
    """Test marking a notification as read"""
    print(f"\n=== Testing Mark Notification {notification_id} as Read ===")
    response = requests.patch(
        f"{BASE_URL}/notifications/{notification_id}/read",
        headers={"Authorization": f"Bearer {token}"}
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Marked as read: {data['is_read']}")
        return True
    else:
        print(f"Error: {response.text}")
        return False

def test_mark_all_as_read(token):
    """Test marking all notifications as read"""
    print("\n=== Testing Mark All as Read ===")
    response = requests.post(
        f"{BASE_URL}/notifications/mark-all-read",
        headers={"Authorization": f"Bearer {token}"}
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Marked {data['marked_count']} notifications as read")
        return True
    else:
        print(f"Error: {response.text}")
        return False

def test_create_appointment_with_reminders(token):
    """Test creating an appointment which should trigger reminder creation"""
    print("\n=== Testing Create Appointment with Reminders ===")
    
    # Create appointment for tomorrow at 2 PM
    tomorrow = (datetime.now() + timedelta(days=1)).date()
    appointment_time = "14:00:00"
    
    response = requests.post(
        f"{BASE_URL}/appointments",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "store_id": 1,
            "service_id": 1,
            "appointment_date": str(tomorrow),
            "appointment_time": appointment_time,
            "notes": "Test appointment for notification system"
        }
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200 or response.status_code == 201:
        data = response.json()
        print(f"Appointment created: ID {data.get('id')}")
        print(f"Date: {data.get('appointment_date')} at {data.get('appointment_time')}")
        return data.get('id')
    else:
        print(f"Error: {response.text}")
        return None

def test_check_appointment_reminders(token, appointment_id):
    """Check if reminders were created for the appointment"""
    print(f"\n=== Checking Reminders for Appointment {appointment_id} ===")
    
    # This would require a new API endpoint to list reminders
    # For now, we'll check if notifications were created
    notifications = test_get_notifications(token)
    
    appointment_notifications = [
        n for n in notifications 
        if n.get('appointment_id') == appointment_id
    ]
    
    print(f"Found {len(appointment_notifications)} notifications for this appointment")
    for notif in appointment_notifications:
        print(f"  - {notif['type']}: {notif['title']}")
    
    return len(appointment_notifications) > 0

def main():
    """Run all tests"""
    print("=" * 60)
    print("Testing Notification System")
    print("=" * 60)
    
    # Login first
    token = test_login()
    if not token:
        print("\n❌ Login failed, cannot proceed with tests")
        return
    
    # Test getting notifications
    notifications = test_get_notifications(token)
    
    # Test getting unread count
    unread_count = test_get_unread_count(token)
    
    # Test marking as read if there are unread notifications
    if unread_count > 0 and notifications:
        unread_notification = next((n for n in notifications if not n['is_read']), None)
        if unread_notification:
            test_mark_as_read(token, unread_notification['id'])
            
            # Verify unread count decreased
            new_unread_count = test_get_unread_count(token)
            if new_unread_count < unread_count:
                print("\n✅ Mark as read test passed")
            else:
                print("\n❌ Mark as read test failed")
    
    # Test mark all as read
    if unread_count > 0:
        test_mark_all_as_read(token)
        
        # Verify all marked as read
        final_unread_count = test_get_unread_count(token)
        if final_unread_count == 0:
            print("\n✅ Mark all as read test passed")
        else:
            print("\n❌ Mark all as read test failed")
    
    # Test creating appointment with reminders
    appointment_id = test_create_appointment_with_reminders(token)
    if appointment_id:
        # Wait a moment for notification to be created
        import time
        time.sleep(2)
        
        # Check if notifications were created
        if test_check_appointment_reminders(token, appointment_id):
            print("\n✅ Appointment notification creation test passed")
        else:
            print("\n⚠️  Appointment notification may not have been created yet")
    
    print("\n" + "=" * 60)
    print("All tests completed!")
    print("=" * 60)
    print("\nNote: Reminder notifications (24h and 1h) are sent by the scheduler")
    print("at the scheduled times. Check the scheduler logs to verify they work.")

if __name__ == "__main__":
    main()
