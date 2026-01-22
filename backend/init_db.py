"""
Initialize database tables
"""
from app.db.session import engine, Base
# Import all models to ensure tables are registered with SQLAlchemy metadata.
import app.models  # noqa: F401

def init_db():
    """Create all database tables"""
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully!")

if __name__ == "__main__":
    init_db()
