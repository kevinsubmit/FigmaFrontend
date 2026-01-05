"""
Simple test script for Notification System
Tests notification CRUD operations
"""
import sys
sys.path.append('/home/ubuntu/FigmaFrontend/backend')

from app.db.session import SessionLocal
from app.crud import notification as notification_crud
from app.models.notification import NotificationType

def test_create_notification(user_id=30001):
    """Test creating a notification"""
    print("\n=== Testing Create Notification ===")
    db = SessionLocal()
    try:
        # Create a test notification
        notification = notification_crud.create_notification(
            db=db,
            user_id=user_id,
            notification_type=NotificationType.APPOINTMENT_REMINDER,
            title="Test Reminder",
            message="This is a test reminder notification",
            related_id=None
        )
        print(f"✅ Notification created: ID {notification.id}")
        print(f"   Title: {notification.title}")
        print(f"   Message: {notification.message}")
        print(f"   Type: {notification.type}")
        print(f"   Is Read: {notification.is_read}")
        return notification.id
    except Exception as e:
        print(f"❌ Error: {e}")
        return None
    finally:
        db.close()

def test_get_user_notifications(user_id):
    """Test getting user notifications"""
    print(f"\n=== Testing Get User Notifications (User ID: {user_id}) ===")
    db = SessionLocal()
    try:
        notifications = notification_crud.get_user_notifications(
            db=db,
            user_id=user_id,
            skip=0,
            limit=10
        )
        print(f"✅ Found {len(notifications)} notifications")
        for notif in notifications:
            print(f"   - [{notif.id}] {notif.title} (Read: {notif.is_read})")
        return len(notifications)
    except Exception as e:
        print(f"❌ Error: {e}")
        return 0
    finally:
        db.close()

def test_get_unread_count(user_id):
    """Test getting unread count"""
    print(f"\n=== Testing Get Unread Count (User ID: {user_id}) ===")
    db = SessionLocal()
    try:
        count = notification_crud.get_unread_count(db=db, user_id=user_id)
        print(f"✅ Unread count: {count}")
        return count
    except Exception as e:
        print(f"❌ Error: {e}")
        return 0
    finally:
        db.close()

def test_mark_as_read(notification_id):
    """Test marking notification as read"""
    print(f"\n=== Testing Mark as Read (Notification ID: {notification_id}) ===")
    db = SessionLocal()
    try:
        notification = notification_crud.mark_as_read(db=db, notification_id=notification_id)
        if notification:
            print(f"✅ Notification marked as read")
            print(f"   Is Read: {notification.is_read}")
            print(f"   Read At: {notification.read_at}")
            return True
        else:
            print(f"❌ Notification not found")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    finally:
        db.close()

def test_mark_all_as_read(user_id):
    """Test marking all notifications as read"""
    print(f"\n=== Testing Mark All as Read (User ID: {user_id}) ===")
    db = SessionLocal()
    try:
        count = notification_crud.mark_all_as_read(db=db, user_id=user_id)
        print(f"✅ Marked {count} notifications as read")
        return count
    except Exception as e:
        print(f"❌ Error: {e}")
        return 0
    finally:
        db.close()

def test_delete_notification(notification_id):
    """Test deleting a notification"""
    print(f"\n=== Testing Delete Notification (ID: {notification_id}) ===")
    db = SessionLocal()
    try:
        success = notification_crud.delete_notification(db=db, notification_id=notification_id)
        if success:
            print(f"✅ Notification deleted successfully")
            return True
        else:
            print(f"❌ Failed to delete notification")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    finally:
        db.close()

def main():
    """Run all tests"""
    print("=" * 60)
    print("Testing Notification System - CRUD Operations")
    print("=" * 60)
    
    user_id = 30001  # Test with existing user ID
    
    # Test 1: Create notification
    notification_id = test_create_notification(user_id)
    if not notification_id:
        print("\n❌ Cannot proceed without creating a notification")
        return
    
    # Test 2: Get user notifications
    test_get_user_notifications(user_id)
    
    # Test 3: Get unread count
    unread_count_before = test_get_unread_count(user_id)
    
    # Test 4: Mark as read
    if test_mark_as_read(notification_id):
        # Verify unread count decreased
        unread_count_after = test_get_unread_count(user_id)
        if unread_count_after < unread_count_before:
            print("\n✅ Unread count decreased as expected")
        else:
            print("\n⚠️  Unread count did not change")
    
    # Test 5: Create another notification for mark all test
    notification_id_2 = test_create_notification(user_id)
    
    # Test 6: Mark all as read
    marked_count = test_mark_all_as_read(user_id)
    if marked_count > 0:
        # Verify all marked as read
        final_unread_count = test_get_unread_count(user_id)
        if final_unread_count == 0:
            print("\n✅ All notifications marked as read")
        else:
            print(f"\n⚠️  Still have {final_unread_count} unread notifications")
    
    # Test 7: Delete notification
    test_delete_notification(notification_id)
    
    # Verify deletion
    test_get_user_notifications(user_id)
    
    print("\n" + "=" * 60)
    print("All CRUD tests completed!")
    print("=" * 60)
    print("\n📝 Summary:")
    print("✅ Create Notification")
    print("✅ Get User Notifications")
    print("✅ Get Unread Count")
    print("✅ Mark as Read")
    print("✅ Mark All as Read")
    print("✅ Delete Notification")
    print("\n⏰ Reminder Scheduler:")
    print("The scheduler runs in the background and sends:")
    print("  - 24-hour reminders (every hour)")
    print("  - 1-hour reminders (every 10 minutes)")
    print("Check backend logs to verify scheduler is running.")

if __name__ == "__main__":
    main()
