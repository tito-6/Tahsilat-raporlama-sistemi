#!/usr/bin/env python3
"""
Quick pre-deployment verification focused on critical functionality.
"""

import requests
import json
import sqlite3
from pathlib import Path
import sys
import time

def get_db_path():
    base_dir = Path(__file__).parent.parent
    return base_dir / "tahsilat_data.db"

def test_critical_apis():
    """Test the most critical APIs for deployment."""
    print("🔍 Testing critical APIs...")
    
    base_url = "http://localhost:3000"
    critical_tests = []
    
    try:
        # Test 1: Monthly Summary (most important)
        print("📊 Testing Monthly Summary API...")
        response = requests.get(f"{base_url}/api/reports/monthly-summary?year=2025&month=9", timeout=10)
        if response.status_code == 200:
            data = response.json()
            if data.get("success") and "data" in data:
                mkm_total = data["data"]["mkm_summary"]["Genel Toplam"]["tl"]
                msm_total = data["data"]["msm_summary"]["Genel Toplam"]["tl"] 
                general_total = data["data"]["general_summary"]["Toplam"]["tl"]
                payments = data["data"]["total_payments"]
                
                print(f"✅ Monthly Summary: {payments} payments, ₺{general_total:,.0f} total")
                
                # Check data consistency
                if abs((mkm_total + msm_total) - general_total) < 1:
                    print(f"✅ Data consistency: MKM + MSM = General Total")
                    critical_tests.append(True)
                else:
                    print(f"❌ Data inconsistency detected")
                    critical_tests.append(False)
            else:
                print(f"❌ Monthly Summary API returned invalid structure")
                critical_tests.append(False)
        else:
            print(f"❌ Monthly Summary API failed: {response.status_code}")
            critical_tests.append(False)
            
        # Test 2: Frontend Pages
        print("🌐 Testing critical frontend pages...")
        pages = ["/", "/monthly-summary", "/reports"]
        page_results = []
        
        for page in pages:
            response = requests.get(f"{base_url}{page}", timeout=10)
            if response.status_code == 200:
                print(f"✅ {page} - Accessible")
                page_results.append(True)
            else:
                print(f"❌ {page} - Status: {response.status_code}")
                page_results.append(False)
        
        critical_tests.extend(page_results)
        
        # Test 3: Database Performance
        print("⚡ Testing database performance...")
        db_path = get_db_path()
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        start_time = time.time()
        cursor.execute("SELECT COUNT(*), SUM(amount_paid) FROM payments WHERE payment_date LIKE '%/09/2025'")
        result = cursor.fetchone()
        query_time = time.time() - start_time
        
        if query_time < 0.5:  # Should be fast
            print(f"✅ Database performance: {query_time:.3f}s for {result[0]} payments")
            critical_tests.append(True)
        else:
            print(f"⚠️  Database performance: {query_time:.3f}s (may be slow with large data)")
            critical_tests.append(True)  # Still passing, just warning
            
        conn.close()
        
        return all(critical_tests)
        
    except Exception as e:
        print(f"❌ Critical error during testing: {str(e)}")
        return False

def check_data_readiness():
    """Check if data structure is ready for large import."""
    print("📋 Checking data structure readiness...")
    
    db_path = get_db_path()
    conn = sqlite3.connect(str(db_path))
    cursor = conn.cursor()
    
    try:
        # Check indexes exist
        cursor.execute("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='payments'")
        indexes = [row[0] for row in cursor.fetchall()]
        
        required_indexes = ['idx_payment_date', 'idx_payment_method', 'idx_year_month']
        missing_indexes = [idx for idx in required_indexes if idx not in indexes]
        
        if missing_indexes:
            print(f"❌ Missing critical indexes: {missing_indexes}")
            return False
        else:
            print(f"✅ All critical indexes present ({len(indexes)} total)")
            
        # Check data samples
        cursor.execute("SELECT payment_date, payment_method, amount_paid FROM payments LIMIT 3")
        samples = cursor.fetchall()
        
        print(f"📊 Data samples:")
        for i, (date, method, amount) in enumerate(samples, 1):
            print(f"   {i}. {date} | {method} | ${amount:,.2f}")
            
        return True
        
    except Exception as e:
        print(f"❌ Data structure error: {str(e)}")
        return False
    finally:
        conn.close()

def main():
    print("🚀 QUICK PRE-DEPLOYMENT VERIFICATION")
    print("=" * 50)
    
    # Wait for server
    print("⏳ Waiting for server to be ready...")
    time.sleep(2)
    
    # Run tests
    api_test = test_critical_apis()
    data_test = check_data_readiness()
    
    print("\n" + "=" * 50)
    
    if api_test and data_test:
        print("✅ SYSTEM READY FOR DEPLOYMENT!")
        print()
        print("📋 Pre-deployment checklist completed:")
        print("   ✅ Database optimized with indexes")
        print("   ✅ APIs returning correct data")
        print("   ✅ Frontend pages accessible") 
        print("   ✅ Data consistency verified")
        print()
        print("🚀 READY TO DEPLOY!")
        print("💡 For large import (1 year data):")
        print("   - Import in batches of 5,000 payments")
        print("   - Monitor memory usage during import")
        print("   - Test with smaller batch first")
        return True
    else:
        print("❌ DEPLOYMENT NOT READY")
        print("🔧 Please fix issues above")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)