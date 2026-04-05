#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timedelta

class InvoicePushAPITester:
    def __init__(self, base_url="https://invoice-manager-463.preview.emergentagent.com"):
        self.base_url = base_url
        self.session_token = "test_session_for_screenshots"  # From review request
        self.tests_run = 0
        self.tests_passed = 0
        self.test_data = {}

    def run_test(self, name, method, endpoint, expected_status, data=None, description=""):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {
            'Content-Type': 'application/json',
            'Authorization': f'Bearer {self.session_token}'
        }

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        if description:
            print(f"   {description}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_detail = response.json()
                    print(f"   Error: {error_detail}")
                except:
                    print(f"   Response: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_auth(self):
        """Test authentication endpoints"""
        print("\n" + "="*50)
        print("TESTING AUTHENTICATION")
        print("="*50)
        
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200,
            description="Verify session token authentication"
        )
        
        if success and response:
            self.test_data['user'] = response
            print(f"   User: {response.get('name')} ({response.get('email')})")
        
        return success

    def test_dashboard(self):
        """Test dashboard statistics"""
        print("\n" + "="*50)
        print("TESTING DASHBOARD")
        print("="*50)
        
        success, response = self.run_test(
            "Dashboard Stats",
            "GET",
            "dashboard/stats",
            200,
            description="Get receivables and overdue statistics"
        )
        
        if success and response:
            print(f"   Total Receivables: ₹{response.get('total_receivables', 0)}")
            print(f"   Overdue 1-15 days: ₹{response.get('overdue_1_15', 0)}")
            print(f"   Overdue 16-30 days: ₹{response.get('overdue_16_30', 0)}")
            print(f"   Overdue 31-45 days: ₹{response.get('overdue_31_45', 0)}")
            print(f"   Overdue 45+ days: ₹{response.get('overdue_45_plus', 0)}")
        
        return success

    def test_customers_crud(self):
        """Test customer CRUD operations"""
        print("\n" + "="*50)
        print("TESTING CUSTOMERS CRUD")
        print("="*50)
        
        # Create customer
        customer_data = {
            "name": "Test Customer",
            "company": "Test Company Ltd",
            "email": "customer@test.com",
            "phone": "+91 98765 43210",
            "address": "123 Test Street, Mumbai"
        }
        
        success, response = self.run_test(
            "Create Customer",
            "POST",
            "customers",
            200,
            data=customer_data,
            description="Create a new customer"
        )
        
        if not success:
            return False
            
        customer_id = response.get('customer_id')
        self.test_data['customer_id'] = customer_id
        print(f"   Created customer ID: {customer_id}")
        
        # Get all customers
        success, response = self.run_test(
            "Get Customers",
            "GET",
            "customers",
            200,
            description="Fetch all customers"
        )
        
        if success and response:
            print(f"   Found {len(response)} customers")
        
        # Update customer
        update_data = {"company": "Updated Test Company"}
        success, response = self.run_test(
            "Update Customer",
            "PUT",
            f"customers/{customer_id}",
            200,
            data=update_data,
            description="Update customer information"
        )
        
        return success

    def test_items_crud(self):
        """Test items CRUD operations"""
        print("\n" + "="*50)
        print("TESTING ITEMS CRUD")
        print("="*50)
        
        # Create item
        item_data = {
            "name": "UGC Content Creation",
            "rate": 15000.0,
            "description": "User Generated Content for social media"
        }
        
        success, response = self.run_test(
            "Create Item",
            "POST",
            "items",
            200,
            data=item_data,
            description="Create a new service item"
        )
        
        if not success:
            return False
            
        item_id = response.get('item_id')
        self.test_data['item_id'] = item_id
        print(f"   Created item ID: {item_id}")
        
        # Get all items
        success, response = self.run_test(
            "Get Items",
            "GET",
            "items",
            200,
            description="Fetch all items"
        )
        
        if success and response:
            print(f"   Found {len(response)} items")
        
        # Update item
        update_data = {"rate": 18000.0}
        success, response = self.run_test(
            "Update Item",
            "PUT",
            f"items/{item_id}",
            200,
            data=update_data,
            description="Update item rate"
        )
        
        return success

    def test_invoices_crud(self):
        """Test invoice CRUD operations"""
        print("\n" + "="*50)
        print("TESTING INVOICES CRUD")
        print("="*50)
        
        customer_id = self.test_data.get('customer_id')
        item_id = self.test_data.get('item_id')
        
        if not customer_id or not item_id:
            print("❌ Cannot test invoices - missing customer or item")
            return False
        
        # Create invoice
        due_date = (datetime.now() + timedelta(days=30)).isoformat()
        invoice_data = {
            "customer_id": customer_id,
            "items": [{"item_id": item_id, "quantity": 2}],
            "due_date": due_date,
            "tax": 2700.0,
            "notes": "Test invoice for UGC services"
        }
        
        success, response = self.run_test(
            "Create Invoice",
            "POST",
            "invoices",
            200,
            data=invoice_data,
            description="Create a new invoice"
        )
        
        if not success:
            return False
            
        invoice_id = response.get('invoice_id')
        self.test_data['invoice_id'] = invoice_id
        print(f"   Created invoice ID: {invoice_id}")
        print(f"   Invoice number: {response.get('invoice_number')}")
        print(f"   Total amount: ₹{response.get('total', 0)}")
        
        # Get all invoices
        success, response = self.run_test(
            "Get Invoices",
            "GET",
            "invoices",
            200,
            description="Fetch all invoices"
        )
        
        if success and response:
            print(f"   Found {len(response)} invoices")
        
        # Get single invoice
        success, response = self.run_test(
            "Get Single Invoice",
            "GET",
            f"invoices/{invoice_id}",
            200,
            description="Fetch specific invoice"
        )
        
        # Update invoice status
        update_data = {"status": "Sent"}
        success, response = self.run_test(
            "Update Invoice Status",
            "PUT",
            f"invoices/{invoice_id}",
            200,
            data=update_data,
            description="Mark invoice as sent"
        )
        
        return success

    def test_reminders(self):
        """Test reminder/approval queue functionality"""
        print("\n" + "="*50)
        print("TESTING REMINDERS/APPROVAL QUEUE")
        print("="*50)
        
        # Get existing reminders
        success, response = self.run_test(
            "Get Reminders",
            "GET",
            "reminders",
            200,
            description="Fetch all reminders"
        )
        
        if success and response:
            print(f"   Found {len(response)} existing reminders")
        
        # Generate new reminders
        success, response = self.run_test(
            "Generate Reminders",
            "POST",
            "reminders/generate",
            200,
            description="Generate new reminder emails"
        )
        
        if success and response:
            print(f"   Generated {response.get('generated', 0)} new reminders")
            
            # If reminders were generated, test approval
            if response.get('reminders') and len(response['reminders']) > 0:
                reminder_id = response['reminders'][0]['reminder_id']
                self.test_data['reminder_id'] = reminder_id
                
                # Note: We won't actually send emails in testing
                print(f"   First reminder ID: {reminder_id}")
        
        return success

    def test_settings(self):
        """Test settings/profile update"""
        print("\n" + "="*50)
        print("TESTING SETTINGS/PROFILE")
        print("="*50)
        
        # Update business profile
        profile_data = {
            "business_name": "Updated Test Business",
            "business_address": "456 Updated Street, Delhi",
            "business_phone": "+91 87654 32109",
            "business_email": "updated@testbusiness.com"
        }
        
        success, response = self.run_test(
            "Update Business Profile",
            "PUT",
            "auth/profile",
            200,
            data=profile_data,
            description="Update business information"
        )
        
        if success and response:
            print(f"   Updated business name: {response.get('business_name')}")
        
        return success

    def test_customization_features(self):
        """Test new customization features"""
        print("\n" + "="*50)
        print("TESTING CUSTOMIZATION FEATURES")
        print("="*50)
        
        # Test template selection
        template_data = {"invoice_template": "modern"}
        success, response = self.run_test(
            "Update Invoice Template",
            "PUT",
            "auth/profile",
            200,
            data=template_data,
            description="Change invoice template to modern"
        )
        
        if success and response:
            print(f"   Template updated to: {response.get('invoice_template')}")
        
        # Test logo upload (base64 encoded sample)
        logo_data = {
            "invoice_logo": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
        }
        success, response = self.run_test(
            "Upload Invoice Logo",
            "PUT",
            "auth/profile",
            200,
            data=logo_data,
            description="Upload business logo for invoices"
        )
        
        if success and response:
            print(f"   Logo uploaded: {'Yes' if response.get('invoice_logo') else 'No'}")
        
        # Test terms & conditions
        terms_data = {
            "invoice_terms": "Payment is due within 30 days. Late payments may incur additional charges."
        }
        success, response = self.run_test(
            "Update Terms & Conditions",
            "PUT",
            "auth/profile",
            200,
            data=terms_data,
            description="Set invoice terms and conditions"
        )
        
        if success and response:
            print(f"   Terms updated: {'Yes' if response.get('invoice_terms') else 'No'}")
        
        # Test custom fields
        custom_fields_data = {
            "invoice_custom_fields": [
                {"label": "GST Number", "value": "27AABCU9603R1ZX"},
                {"label": "PAN Number", "value": "AABCU9603R"}
            ]
        }
        success, response = self.run_test(
            "Update Custom Fields",
            "PUT",
            "auth/profile",
            200,
            data=custom_fields_data,
            description="Add custom fields to invoices"
        )
        
        if success and response:
            custom_fields = response.get('invoice_custom_fields', [])
            print(f"   Custom fields added: {len(custom_fields)}")
            for field in custom_fields:
                print(f"     - {field.get('label')}: {field.get('value')}")
        
        # Test template change to spreadsheet
        template_data = {"invoice_template": "spreadsheet"}
        success, response = self.run_test(
            "Change Template to Spreadsheet",
            "PUT",
            "auth/profile",
            200,
            data=template_data,
            description="Change invoice template to spreadsheet"
        )
        
        # Verify all customizations are saved
        success, response = self.run_test(
            "Verify Customizations",
            "GET",
            "auth/me",
            200,
            description="Verify all customizations are persisted"
        )
        
        if success and response:
            print(f"   Final template: {response.get('invoice_template')}")
            print(f"   Logo present: {'Yes' if response.get('invoice_logo') else 'No'}")
            print(f"   Terms present: {'Yes' if response.get('invoice_terms') else 'No'}")
            print(f"   Custom fields: {len(response.get('invoice_custom_fields', []))}")
        
        return success

    def cleanup_test_data(self):
        """Clean up test data"""
        print("\n" + "="*50)
        print("CLEANING UP TEST DATA")
        print("="*50)
        
        # Delete invoice
        if 'invoice_id' in self.test_data:
            self.run_test(
                "Delete Invoice",
                "DELETE",
                f"invoices/{self.test_data['invoice_id']}",
                200,
                description="Clean up test invoice"
            )
        
        # Delete customer
        if 'customer_id' in self.test_data:
            self.run_test(
                "Delete Customer",
                "DELETE",
                f"customers/{self.test_data['customer_id']}",
                200,
                description="Clean up test customer"
            )
        
        # Delete item
        if 'item_id' in self.test_data:
            self.run_test(
                "Delete Item",
                "DELETE",
                f"items/{self.test_data['item_id']}",
                200,
                description="Clean up test item"
            )
        
        # Delete reminder
        if 'reminder_id' in self.test_data:
            self.run_test(
                "Delete Reminder",
                "DELETE",
                f"reminders/{self.test_data['reminder_id']}",
                200,
                description="Clean up test reminder"
            )

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting InvoicePush API Tests")
        print(f"📍 Base URL: {self.base_url}")
        print(f"🔑 Session Token: {self.session_token[:20]}...")
        
        # Test authentication first
        if not self.test_auth():
            print("\n❌ Authentication failed - stopping tests")
            return False
        
        # Test all features
        tests = [
            self.test_dashboard,
            self.test_customers_crud,
            self.test_items_crud,
            self.test_invoices_crud,
            self.test_reminders,
            self.test_settings,
            self.test_customization_features
        ]
        
        for test in tests:
            try:
                test()
            except Exception as e:
                print(f"❌ Test failed with exception: {str(e)}")
        
        # Clean up
        self.cleanup_test_data()
        
        # Print results
        print("\n" + "="*50)
        print("TEST RESULTS")
        print("="*50)
        print(f"📊 Tests passed: {self.tests_passed}/{self.tests_run}")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"📈 Success rate: {success_rate:.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print("⚠️  Some tests failed")
            return False

def main():
    tester = InvoicePushAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())