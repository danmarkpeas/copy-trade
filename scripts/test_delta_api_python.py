import hashlib
import hmac
import requests
import time
import json
import os
from datetime import datetime
from supabase import create_client, Client

class DeltaExchangeAPITester:
    def __init__(self, api_key, api_secret, follower_name, environment='production'):
        self.api_key = api_key
        self.api_secret = api_secret
        self.follower_name = follower_name
        
        # Set base URL based on environment - CORRECTED FOR INDIA
        if environment.lower() == 'testnet':
            self.base_url = 'https://cdn-ind.testnet.deltaex.org'
        else:
            self.base_url = 'https://api.india.delta.exchange'  # INDIA API URL
        
        self.session = requests.Session()
        
    def generate_signature(self, secret, message):
        """Generate HMAC SHA256 signature"""
        message = bytes(message, 'utf-8')
        secret = bytes(secret, 'utf-8')
        hash = hmac.new(secret, message, hashlib.sha256)
        return hash.hexdigest()
    
    def get_headers(self, method, path, query_string='', payload=''):
        """Generate authentication headers"""
        timestamp = str(int(time.time()))
        signature_data = method + timestamp + path + query_string + payload
        signature = self.generate_signature(self.api_secret, signature_data)
        
        return {
            'api-key': self.api_key,
            'timestamp': timestamp,
            'signature': signature,
            'User-Agent': 'python-api-tester',
            'Content-Type': 'application/json'
        }
    
    def test_public_endpoint(self):
        """Test public endpoint (no authentication required)"""
        print("=" * 60)
        print("1. TESTING PUBLIC ENDPOINT (No Authentication)")
        print("=" * 60)
        
        try:
            url = f"{self.base_url}/v2/products"
            response = self.session.get(url, timeout=10)
            
            print(f"URL: {url}")
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print("✅ PUBLIC ENDPOINT SUCCESS")
                print(f"Found {len(data.get('result', []))} products")
                return True
            else:
                print("❌ PUBLIC ENDPOINT FAILED")
                print(f"Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ PUBLIC ENDPOINT ERROR: {str(e)}")
            return False
    
    def test_authentication(self):
        """Test basic authentication with wallet endpoint"""
        print("\n" + "=" * 60)
        print("2. TESTING AUTHENTICATION")
        print("=" * 60)
        
        try:
            method = 'GET'
            path = '/v2/wallet/balances'
            url = f"{self.base_url}{path}"
            
            headers = self.get_headers(method, path)
            
            print(f"URL: {url}")
            print(f"API Key: {self.api_key[:8]}...{self.api_key[-4:]}")
            print(f"Timestamp: {headers['timestamp']}")
            print(f"Signature: {headers['signature'][:16]}...")
            
            response = self.session.get(url, headers=headers, timeout=10)
            
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 200:
                print("✅ AUTHENTICATION SUCCESS")
                data = response.json()
                print(f"Wallet balances retrieved successfully")
                return True
            else:
                print("❌ AUTHENTICATION FAILED")
                try:
                    error_data = response.json()
                    print(f"Error: {json.dumps(error_data, indent=2)}")
                except:
                    print(f"Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ AUTHENTICATION ERROR: {str(e)}")
            return False
    
    def test_trading_permissions(self):
        """Test trading permissions by fetching open orders"""
        print("\n" + "=" * 60)
        print("3. TESTING TRADING PERMISSIONS")
        print("=" * 60)
        
        try:
            method = 'GET'
            path = '/v2/orders'
            query_string = '?state=open'
            url = f"{self.base_url}{path}"
            
            headers = self.get_headers(method, path, query_string)
            params = {'state': 'open'}
            
            print(f"URL: {url}")
            print(f"Query: {query_string}")
            
            response = self.session.get(url, headers=headers, params=params, timeout=10)
            
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 200:
                print("✅ TRADING PERMISSIONS SUCCESS")
                data = response.json()
                orders = data.get('result', [])
                print(f"Found {len(orders)} open orders")
                return True
            else:
                print("❌ TRADING PERMISSIONS FAILED")
                try:
                    error_data = response.json()
                    print(f"Error: {json.dumps(error_data, indent=2)}")
                except:
                    print(f"Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ TRADING PERMISSIONS ERROR: {str(e)}")
            return False
    
    def test_ip_whitelist(self):
        """Test if IP is properly whitelisted"""
        print("\n" + "=" * 60)
        print("4. TESTING IP WHITELIST")
        print("=" * 60)
        
        try:
            # Get public IP
            ip_response = requests.get('https://api.ipify.org', timeout=5)
            public_ip = ip_response.text
            print(f"Your Public IP: {public_ip}")
            
            # Test with a simple authenticated endpoint
            method = 'GET'
            path = '/v2/profile'
            url = f"{self.base_url}{path}"
            
            headers = self.get_headers(method, path)
            response = self.session.get(url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                print("✅ IP WHITELIST SUCCESS")
                return True
            elif 'ip_blocked' in response.text.lower():
                print("❌ IP NOT WHITELISTED")
                print(f"Your IP {public_ip} is not whitelisted for this API key")
                print("Add this IP to your API key whitelist at:")
                print("https://www.delta.exchange/app/account/manageapikeys")
                return False
            else:
                print("❌ IP WHITELIST TEST INCONCLUSIVE")
                try:
                    error_data = response.json()
                    print(f"Error: {json.dumps(error_data, indent=2)}")
                except:
                    print(f"Response: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ IP WHITELIST ERROR: {str(e)}")
            return False
    
    def test_signature_generation(self):
        """Test signature generation with known values"""
        print("\n" + "=" * 60)
        print("5. TESTING SIGNATURE GENERATION")
        print("=" * 60)
        
        # Test with known values
        test_secret = "test_secret"
        test_message = "GET1234567890/v2/wallet/balances"
        expected_signature = hmac.new(
            test_secret.encode('utf-8'), 
            test_message.encode('utf-8'), 
            hashlib.sha256
        ).hexdigest()
        
        generated_signature = self.generate_signature(test_secret, test_message)
        
        print(f"Test Message: {test_message}")
        print(f"Expected: {expected_signature}")
        print(f"Generated: {generated_signature}")
        
        if expected_signature == generated_signature:
            print("✅ SIGNATURE GENERATION SUCCESS")
            return True
        else:
            print("❌ SIGNATURE GENERATION FAILED")
            return False
    
    def run_all_tests(self):
        """Run all tests and provide summary"""
        print(f"DELTA EXCHANGE API TESTER (INDIA) - {self.follower_name}")
        print(f"Environment: {self.base_url}")
        print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        results = {
            'public_endpoint': self.test_public_endpoint(),
            'signature_generation': self.test_signature_generation(),
            'ip_whitelist': self.test_ip_whitelist(),
            'authentication': self.test_authentication(),
            'trading_permissions': self.test_trading_permissions()
        }
        
        # Summary
        print("\n" + "=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(results.values())
        total = len(results)
        
        for test_name, result in results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            print(f"{test_name.replace('_', ' ').title()}: {status}")
        
        print(f"\nOverall: {passed}/{total} tests passed")
        
        # Recommendations
        print("\n" + "=" * 60)
        print("RECOMMENDATIONS")
        print("=" * 60)
        
        if not results['public_endpoint']:
            print("❌ Network connectivity issue. Check your internet connection.")
        
        if not results['signature_generation']:
            print("❌ Signature generation issue. Check your HMAC implementation.")
        
        if not results['ip_whitelist']:
            print("❌ IP not whitelisted. Add your IP to the API key whitelist.")
        
        if not results['authentication']:
            print("❌ Authentication failed. Check API key, secret, and environment.")
            print("   - Verify you're using the correct environment (production/testnet)")
            print("   - Ensure API key and secret are correct")
            print("   - Check system time synchronization")
        
        if not results['trading_permissions']:
            print("❌ Trading permissions issue. Ensure API key has trading permissions.")
        
        if all(results.values()):
            print("✅ All tests passed! Your API key is working correctly with India API.")
        
        return results

def test_all_followers():
    """Test all followers from the database"""
    print("🧪 COMPREHENSIVE DELTA EXCHANGE API TESTING (INDIA)")
    print("=" * 60)
    
    # Initialize Supabase client
    supabase_url = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    
    if not supabase_url or not supabase_key:
        print("❌ Missing Supabase environment variables")
        print("Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY")
        return
    
    supabase: Client = create_client(supabase_url, supabase_key)
    
    try:
        # Get all active followers
        response = supabase.table('followers').select('*').eq('account_status', 'active').execute()
        followers = response.data
        
        if not followers:
            print("❌ No active followers found in database")
            return
        
        print(f"📊 Found {len(followers)} active followers\n")
        
        all_results = {}
        
        for follower in followers:
            print(f"\n{'='*80}")
            print(f"TESTING FOLLOWER: {follower['follower_name']}")
            print(f"{'='*80}")
            
            if not follower.get('api_key') or not follower.get('api_secret'):
                print(f"❌ No API credentials for {follower['follower_name']}")
                all_results[follower['follower_name']] = {
                    'status': 'NO_CREDENTIALS',
                    'working': False,
                    'error': 'API credentials not set'
                }
                continue
            
            # Test this follower
            tester = DeltaExchangeAPITester(
                follower['api_key'],
                follower['api_secret'],
                follower['follower_name']
            )
            
            results = tester.run_all_tests()
            all_results[follower['follower_name']] = {
                'status': 'TESTED',
                'working': results.get('authentication', False),
                'results': results
            }
        
        # Final summary
        print(f"\n{'='*80}")
        print("FINAL SUMMARY - ALL FOLLOWERS")
        print(f"{'='*80}")
        
        working_count = sum(1 for r in all_results.values() if r['working'])
        total_count = len(all_results)
        
        print(f"📊 Total Followers Tested: {total_count}")
        print(f"✅ Working: {working_count}")
        print(f"❌ Failed: {total_count - working_count}")
        print(f"📈 Success Rate: {(working_count/total_count)*100:.1f}%")
        
        print(f"\n📋 DETAILED RESULTS:")
        for name, result in all_results.items():
            if result['status'] == 'NO_CREDENTIALS':
                print(f"   {name}: ❌ NO CREDENTIALS")
            elif result['working']:
                print(f"   {name}: ✅ WORKING")
            else:
                print(f"   {name}: ❌ FAILED")
        
        if working_count == 0:
            print(f"\n🚨 CRITICAL ISSUE: No followers have working API credentials!")
            print("   • Copy trading will NOT work")
            print("   • All followers need valid API credentials")
        elif working_count < total_count:
            print(f"\n⚠️  PARTIAL ISSUE: {working_count}/{total_count} followers working")
            print("   • Copy trading will work with reduced capacity")
        else:
            print(f"\n🎉 ALL SYSTEMS GO: All followers working!")
            print("   • Copy trading should work perfectly")
        
        return all_results
        
    except Exception as e:
        print(f"❌ Error testing followers: {str(e)}")
        return None

if __name__ == "__main__":
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()
    
    test_all_followers() 