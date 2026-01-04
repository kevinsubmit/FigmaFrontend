"""
Seed script to populate test data for stores, services, and appointments
"""
from datetime import datetime, timedelta
from sqlalchemy import text
from app.db.session import SessionLocal

def seed_data():
    db = SessionLocal()
    
    try:
        # 清空现有数据
        print("Clearing existing data...")
        db.execute(text("DELETE FROM appointments"))
        db.execute(text("DELETE FROM services"))
        db.execute(text("DELETE FROM store_images"))
        db.execute(text("DELETE FROM stores"))
        db.commit()
        
        # 创建店铺数据
        print("Creating stores...")
        stores_data = [
            {
                "name": "Luxury Nails Spa",
                "address": "123 Main Street",
                "city": "New York",
                "state": "NY",
                "zip_code": "10001",
                "latitude": 40.7589,
                "longitude": -73.9851,
                "phone": "+1-212-555-0101",
                "email": "contact@luxurynails.com",
                "rating": 4.8,
                "review_count": 256,
                "description": "Premium nail salon offering luxury manicure and pedicure services in the heart of Manhattan.",
                "opening_hours": '{"monday": "9:00-20:00", "tuesday": "9:00-20:00", "wednesday": "9:00-20:00", "thursday": "9:00-20:00", "friday": "9:00-21:00", "saturday": "10:00-21:00", "sunday": "10:00-19:00"}'
            },
            {
                "name": "Glamour Nails Studio",
                "address": "456 Broadway Avenue",
                "city": "Los Angeles",
                "state": "CA",
                "zip_code": "90012",
                "latitude": 34.0522,
                "longitude": -118.2437,
                "phone": "+1-213-555-0202",
                "email": "info@glamournails.com",
                "rating": 4.6,
                "review_count": 189,
                "description": "Modern nail studio specializing in artistic nail designs and gel manicures.",
                "opening_hours": '{"monday": "10:00-19:00", "tuesday": "10:00-19:00", "wednesday": "10:00-19:00", "thursday": "10:00-19:00", "friday": "10:00-20:00", "saturday": "10:00-20:00", "sunday": "11:00-18:00"}'
            },
            {
                "name": "Elegant Touch Nails",
                "address": "789 Oak Street",
                "city": "Chicago",
                "state": "IL",
                "zip_code": "60601",
                "latitude": 41.8781,
                "longitude": -87.6298,
                "phone": "+1-312-555-0303",
                "email": "hello@eleganttouch.com",
                "rating": 4.9,
                "review_count": 342,
                "description": "Elegant nail salon providing high-quality nail care services with a focus on customer satisfaction.",
                "opening_hours": '{"monday": "9:00-20:00", "tuesday": "9:00-20:00", "wednesday": "9:00-20:00", "thursday": "9:00-20:00", "friday": "9:00-21:00", "saturday": "9:00-21:00", "sunday": "10:00-19:00"}'
            }
        ]
        
        store_ids = []
        for store in stores_data:
            result = db.execute(text("""
                INSERT INTO stores (name, address, city, state, zip_code, latitude, longitude, 
                                  phone, email, rating, review_count, description, opening_hours)
                VALUES (:name, :address, :city, :state, :zip_code, :latitude, :longitude,
                       :phone, :email, :rating, :review_count, :description, :opening_hours)
            """), store)
            db.commit()
            # 获取最后插入的ID
            store_id = db.execute(text("SELECT LAST_INSERT_ID()")).scalar()
            store_ids.append(store_id)
            print(f"  Created store: {store['name']} (ID: {store_id})")
        
        # 为每个店铺添加图片
        print("\nAdding store images...")
        for store_id in store_ids:
            images = [
                {
                    "store_id": store_id,
                    "image_url": f"https://picsum.photos/seed/store{store_id}-1/800/600",
                    "is_primary": 1,
                    "display_order": 1
                },
                {
                    "store_id": store_id,
                    "image_url": f"https://picsum.photos/seed/store{store_id}-2/800/600",
                    "is_primary": 0,
                    "display_order": 2
                },
                {
                    "store_id": store_id,
                    "image_url": f"https://picsum.photos/seed/store{store_id}-3/800/600",
                    "is_primary": 0,
                    "display_order": 3
                }
            ]
            for img in images:
                db.execute(text("""
                    INSERT INTO store_images (store_id, image_url, is_primary, display_order)
                    VALUES (:store_id, :image_url, :is_primary, :display_order)
                """), img)
            db.commit()
            print(f"  Added 3 images for store ID {store_id}")
        
        # 创建服务数据
        print("\nCreating services...")
        services_data = [
            # Luxury Nails Spa services
            {"store_id": store_ids[0], "name": "Classic Manicure", "category": "Manicure", "description": "Traditional manicure with nail shaping, cuticle care, and polish", "price": 25.0, "duration_minutes": 30},
            {"store_id": store_ids[0], "name": "Gel Manicure", "category": "Manicure", "description": "Long-lasting gel polish manicure", "price": 45.0, "duration_minutes": 45},
            {"store_id": store_ids[0], "name": "Spa Pedicure", "category": "Pedicure", "description": "Relaxing pedicure with foot massage and exfoliation", "price": 55.0, "duration_minutes": 60},
            {"store_id": store_ids[0], "name": "Acrylic Full Set", "category": "Nail Extensions", "description": "Full set of acrylic nail extensions", "price": 65.0, "duration_minutes": 90},
            {"store_id": store_ids[0], "name": "Nail Art Design", "category": "Nail Art", "description": "Custom nail art design per nail", "price": 10.0, "duration_minutes": 15},
            
            # Glamour Nails Studio services
            {"store_id": store_ids[1], "name": "Express Manicure", "category": "Manicure", "description": "Quick manicure for busy schedules", "price": 20.0, "duration_minutes": 20},
            {"store_id": store_ids[1], "name": "Deluxe Gel Manicure", "category": "Manicure", "description": "Premium gel manicure with hand massage", "price": 50.0, "duration_minutes": 50},
            {"store_id": store_ids[1], "name": "Classic Pedicure", "category": "Pedicure", "description": "Basic pedicure with polish", "price": 35.0, "duration_minutes": 45},
            {"store_id": store_ids[1], "name": "Gel Extensions", "category": "Nail Extensions", "description": "Natural-looking gel nail extensions", "price": 75.0, "duration_minutes": 90},
            {"store_id": store_ids[1], "name": "3D Nail Art", "category": "Nail Art", "description": "Three-dimensional nail art designs", "price": 15.0, "duration_minutes": 20},
            
            # Elegant Touch Nails services
            {"store_id": store_ids[2], "name": "Signature Manicure", "category": "Manicure", "description": "Our signature manicure service", "price": 30.0, "duration_minutes": 35},
            {"store_id": store_ids[2], "name": "Shellac Manicure", "category": "Manicure", "description": "Chip-resistant shellac polish", "price": 48.0, "duration_minutes": 45},
            {"store_id": store_ids[2], "name": "Luxury Pedicure", "category": "Pedicure", "description": "Ultimate pedicure experience with hot stone massage", "price": 70.0, "duration_minutes": 75},
            {"store_id": store_ids[2], "name": "Dip Powder Nails", "category": "Nail Extensions", "description": "Durable dip powder nail application", "price": 60.0, "duration_minutes": 60},
            {"store_id": store_ids[2], "name": "Ombre Nails", "category": "Nail Art", "description": "Beautiful gradient ombre nail design", "price": 12.0, "duration_minutes": 25}
        ]
        
        service_ids = []
        for service in services_data:
            result = db.execute(text("""
                INSERT INTO services (store_id, name, category, description, price, duration_minutes, is_active)
                VALUES (:store_id, :name, :category, :description, :price, :duration_minutes, 1)
            """), service)
            db.commit()
            service_id = db.execute(text("SELECT LAST_INSERT_ID()")).scalar()
            service_ids.append(service_id)
            print(f"  Created service: {service['name']} (ID: {service_id})")
        
        # 创建预约数据（假设用户ID为30001）
        print("\nCreating appointments...")
        user_id = 30001
        
        # 创建一些过去和未来的预约
        appointments_data = [
            {
                "user_id": user_id,
                "store_id": store_ids[0],
                "service_id": service_ids[1],  # Gel Manicure
                "appointment_date": (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d"),
                "appointment_time": "14:00:00",
                "status": "confirmed",
                "notes": "Please use light pink color"
            },
            {
                "user_id": user_id,
                "store_id": store_ids[1],
                "service_id": service_ids[7],  # Classic Pedicure
                "appointment_date": (datetime.now() + timedelta(days=5)).strftime("%Y-%m-%d"),
                "appointment_time": "10:30:00",
                "status": "pending",
                "notes": None
            },
            {
                "user_id": user_id,
                "store_id": store_ids[2],
                "service_id": service_ids[12],  # Luxury Pedicure
                "appointment_date": (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d"),
                "appointment_time": "15:00:00",
                "status": "completed",
                "notes": "Great service!"
            }
        ]
        
        for appt in appointments_data:
            db.execute(text("""
                INSERT INTO appointments (user_id, store_id, service_id, appointment_date, 
                                        appointment_time, status, notes)
                VALUES (:user_id, :store_id, :service_id, :appointment_date,
                       :appointment_time, :status, :notes)
            """), appt)
            db.commit()
            print(f"  Created appointment for {appt['appointment_date']} at {appt['appointment_time']}")
        
        print("\n✅ Seed data created successfully!")
        print(f"  - {len(stores_data)} stores")
        print(f"  - {len(stores_data) * 3} store images")
        print(f"  - {len(services_data)} services")
        print(f"  - {len(appointments_data)} appointments")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_data()
