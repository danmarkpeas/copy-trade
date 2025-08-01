import hashlib
import hmac
import requests
import time
import json
from datetime import datetime

class DeltaExchangeAPITester:
    def __init__(self, api_key, api_secret, environment='production'):
        self.api_key = api_key
        self.api_secret = api_secret
        
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
    
    def test_environment_mismatch(self):
        """Test for common environment mismatch issues"""
        print("\n" + "=" * 60)
        print("6. TESTING ENVIRONMENT MISMATCH")
        print("=" * 60)
        
        print(f"Current Environment: {self.base_url}")
        
        # Test both environments to see which one works
        environments = {
            'Production (India)': 'https://api.india.delta.exchange',
            'Testnet': 'https://cdn-ind.testnet.deltaex.org'
        }
        
        working_env = None
        
        for env_name, env_url in environments.items():
            try:
                print(f"\nTesting {env_name}: {env_url}")
                
                # Test public endpoint first
                response = requests.get(f"{env_url}/v2/products", timeout=5)
                if response.status_code != 200:
                    print(f"  ❌ {env_name} - Public endpoint failed")
                    continue
                
                # Test authentication
                method = 'GET'
                path = '/v2/profile'
                timestamp = str(int(time.time()))
                signature_data = method + timestamp + path
                signature = self.generate_signature(self.api_secret, signature_data)
                
                headers = {
                    'api-key': self.api_key,
                    'timestamp': timestamp,
                    'signature': signature,
                    'User-Agent': 'python-api-tester',
                    'Content-Type': 'application/json'
                }
                
                auth_response = requests.get(f"{env_url}{path}", headers=headers, timeout=5)
                
                if auth_response.status_code == 200:
                    print(f"  ✅ {env_name} - Authentication SUCCESS")
                    working_env = env_name
                elif auth_response.status_code == 401:
                    error_data = auth_response.json() if auth_response.content else {}
                    if 'InvalidApiKey' in str(error_data):
                        print(f"  ❌ {env_name} - Invalid API Key (wrong environment)")
                    else:
                        print(f"  ❌ {env_name} - Authentication failed: {error_data}")
                else:
                    print(f"  ❌ {env_name} - HTTP {auth_response.status_code}")
                    
            except Exception as e:
                print(f"  ❌ {env_name} - Error: {str(e)}")
        
        if working_env:
            print(f"\n✅ ENVIRONMENT CHECK: Your API key works with {working_env}")
            if working_env.lower() != ('production (india)' if 'india' in self.base_url else 'testnet'):
                print("⚠️  WARNING: You're using the wrong environment!")
                print(f"   Your API key works with {working_env}")
                print(f"   But you're connecting to {self.base_url}")
            return True
        else:
            print("\n❌ ENVIRONMENT CHECK: API key doesn't work with any environment")
            return False
    
    def run_all_tests(self):
        """Run all tests and provide summary"""
        print(f"DELTA EXCHANGE API TESTER (INDIA)")
        print(f"Environment: {self.base_url}")
        print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        results = {
            'public_endpoint': self.test_public_endpoint(),
            'signature_generation': self.test_signature_generation(),
            'environment_mismatch': self.test_environment_mismatch(),
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
        
        if not results['environment_mismatch']:
            print("❌ Environment mismatch. Your API key may be for a different environment.")
            print("   - Production keys: Created at https://www.delta.exchange/")
            print("   - Testnet keys: Created at testnet environment")
        
        if not results['ip_whitelist']:
            print("❌ IP not whitelisted. Add your IP to the API key whitelist.")
            print("   - Go to: https://www.delta.exchange/app/account/manageapikeys")
        
        if not results['authentication']:
            print("❌ Authentication failed. Check API key, secret, and environment.")
            print("   - Verify you're using the correct India API URL")
            print("   - Ensure API key and secret are correct")
            print("   - Check system time synchronization")
        
        if not results['trading_permissions']:
            print("❌ Trading permissions issue. Ensure API key has trading permissions.")
        
        if all(results.values()):
            print("✅ All tests passed! Your API key is working correctly with India API.")
        
        return results

# Usage example
def main():
    print("Delta Exchange API Key Tester (INDIA)")
    print("=" * 40)
    
    # Replace with your actual API credentials
    api_key = "your_api_key_here"
    api_secret = "your_api_secret_here"
    environment = "production"  # or "testnet"
    
    if api_key == "your_api_key_here" or api_secret == "your_api_secret_here":
        print("⚠️  Please replace 'your_api_key_here' and 'your_api_secret_here' with your actual credentials")
        print("\nTo get your API credentials:")
        print("1. Go to https://www.delta.exchange/app/account/manageapikeys")
        print("2. Create a new API key")
        print("3. Copy the API key and secret")
        print("4. Replace the placeholder values in this script")
        print("\n📍 IMPORTANT: This tester uses the INDIA API URL:")
        print("   Production: https://api.india.delta.exchange")
        print("   Testnet: https://cdn-ind.testnet.deltaex.org")
        return
    
    # Initialize tester
    tester = DeltaExchangeAPITester(api_key, api_secret, environment)
    
    # Run all tests
    results = tester.run_all_tests()
    
    return results

if __name__ == "__main__":
    main() 