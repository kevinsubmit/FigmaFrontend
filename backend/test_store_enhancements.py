"""
Test Store Enhancements (Portfolio & Holidays)
"""
import requests
import json
from datetime import date, timedelta

API_BASE_URL = "http://localhost:8000/api/v1"

def print_section(title):
    print("\n" + "=" * 60)
    print(title)
    print("=" * 60)

def test_portfolio_api():
    """Test Portfolio API endpoints"""
    print_section("Testing Store Portfolio API")
    
    # Test 1: Get portfolio for a store (should be empty initially)
    store_id = 4  # Luxury Nails Spa
    print(f"\n1. GET /stores/portfolio/{store_id}")
    response = requests.get(f"{API_BASE_URL}/stores/portfolio/{store_id}")
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        portfolio = response.json()
        print(f"✅ Found {len(portfolio)} portfolio items")
        if portfolio:
            print(f"   First item: {portfolio[0]}")
    else:
        print(f"❌ Error: {response.text}")
    
    return response.status_code == 200

def test_holidays_api():
    """Test Holidays API endpoints"""
    print_section("Testing Store Holidays API")
    
    # Test 1: Get holidays for a store
    store_id = 4  # Luxury Nails Spa
    print(f"\n1. GET /stores/holidays/{store_id}")
    response = requests.get(f"{API_BASE_URL}/stores/holidays/{store_id}")
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        holidays = response.json()
        print(f"✅ Found {len(holidays)} holidays")
        if holidays:
            print(f"   First holiday: {holidays[0]}")
    else:
        print(f"❌ Error: {response.text}")
    
    # Test 2: Check if today is a holiday
    today = date.today().isoformat()
    print(f"\n2. GET /stores/holidays/{store_id}/check/{today}")
    response = requests.get(f"{API_BASE_URL}/stores/holidays/{store_id}/check/{today}")
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        result = response.json()
        print(f"✅ Is holiday: {result['is_holiday']}")
    else:
        print(f"❌ Error: {response.text}")
    
    # Test 3: Get holidays with date range
    start_date = date.today().isoformat()
    end_date = (date.today() + timedelta(days=30)).isoformat()
    print(f"\n3. GET /stores/holidays/{store_id}?start_date={start_date}&end_date={end_date}")
    response = requests.get(
        f"{API_BASE_URL}/stores/holidays/{store_id}",
        params={"start_date": start_date, "end_date": end_date}
    )
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        holidays = response.json()
        print(f"✅ Found {len(holidays)} holidays in next 30 days")
    else:
        print(f"❌ Error: {response.text}")
    
    return response.status_code == 200

def test_store_details():
    """Test Store Details endpoint"""
    print_section("Testing Store Details API")
    
    store_id = 4  # Luxury Nails Spa
    print(f"\n1. GET /stores/{store_id}")
    response = requests.get(f"{API_BASE_URL}/stores/{store_id}")
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        store = response.json()
        print(f"✅ Store: {store['name']}")
        print(f"   Rating: {store.get('rating', 'N/A')}")
        print(f"   Review Count: {store.get('review_count', 0)}")
        print(f"   Address: {store.get('address', 'N/A')}")
        print(f"   Images: {len(store.get('images', []))}")
    else:
        print(f"❌ Error: {response.text}")
    
    return response.status_code == 200

def main():
    print("=" * 60)
    print("Store Enhancements - API Testing")
    print("=" * 60)
    
    results = {
        "Portfolio API": test_portfolio_api(),
        "Holidays API": test_holidays_api(),
        "Store Details": test_store_details()
    }
    
    print_section("Test Summary")
    for test_name, passed in results.items():
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{test_name}: {status}")
    
    all_passed = all(results.values())
    if all_passed:
        print("\n🎉 All tests passed!")
    else:
        print("\n⚠️  Some tests failed. Check the output above.")
    
    return all_passed

if __name__ == "__main__":
    main()
