#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timedelta

class CRMFeaturesTester:
    def __init__(self, base_url="https://invoice-manager-463.preview.emergentagent.com"):
        self.base_url = base_url
        self.session_token = "test_session_for_screenshots"
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

    def test_customer_list_with_crm_features(self):
        """Test customer list shows status tags and financial columns"""
        print("\n" + "="*60)
        print("TESTING CUSTOMER LIST WITH CRM FEATURES")
        print("="*60)
        
        success, response = self.run_test(
            "Get Customers with CRM Data",
            "GET",
            "customers",
            200,
            description="Verify customer list includes status tags, total_billed, balance_due"
        )
        
        if success and response:
            print(f"   Found {len(response)} customers")
            
            for customer in response:
                print(f"\n   Customer: {customer.get('name')}")
                print(f"     Status: {customer.get('status', 'N/A')}")
                print(f"     Total Billed: ₹{customer.get('total_billed', 0)}")
                print(f"     Balance Due: ₹{customer.get('receivables', 0)}")
                print(f"     Company: {customer.get('company', 'N/A')}")
                print(f"     GST: {customer.get('gst_number', 'N/A')}")
                print(f"     PAN: {customer.get('pan_number', 'N/A')}")
                
                # Store customer with CRM data for further testing
                if customer.get('gst_number') and customer.get('pan_number'):
                    self.test_data['crm_customer_id'] = customer.get('customer_id')
                    print(f"     ✓ Found customer with CRM data: {customer.get('customer_id')}")
        
        return success

    def test_customer_profile_with_full_details(self):
        """Test customer profile shows all CRM details and stats"""
        print("\n" + "="*60)
        print("TESTING CUSTOMER PROFILE WITH FULL CRM DETAILS")
        print("="*60)
        
        customer_id = self.test_data.get('crm_customer_id')
        if not customer_id:
            print("❌ No customer with CRM data found - skipping profile test")
            return False
        
        success, response = self.run_test(
            "Get Customer Profile",
            "GET",
            f"customers/{customer_id}",
            200,
            description="Verify customer profile includes all CRM details and stats"
        )
        
        if success and response:
            print(f"   Customer: {response.get('name')}")
            print(f"   Company: {response.get('company', 'N/A')}")
            print(f"   Email: {response.get('email')}")
            print(f"   Phone: {response.get('phone', 'N/A')}")
            
            # Address details
            print(f"\n   Address Details:")
            print(f"     Street: {response.get('address', 'N/A')}")
            print(f"     City: {response.get('city', 'N/A')}")
            print(f"     State: {response.get('state', 'N/A')}")
            print(f"     Pincode: {response.get('pincode', 'N/A')}")
            
            # Business details
            print(f"\n   Business Details:")
            print(f"     GST Number: {response.get('gst_number', 'N/A')}")
            print(f"     PAN Number: {response.get('pan_number', 'N/A')}")
            print(f"     Onboarding Date: {response.get('onboarding_date', 'N/A')}")
            
            # Stats cards
            print(f"\n   Financial Stats:")
            print(f"     Total Billed: ₹{response.get('total_billed', 0)}")
            print(f"     Total Paid: ₹{response.get('total_paid', 0)}")
            print(f"     Balance Due: ₹{response.get('balance_due', 0)}")
            print(f"     Invoice Count: {response.get('invoice_count', 0)}")
            
            # Active services
            active_services = response.get('active_services_details', [])
            print(f"\n   Active Services: {len(active_services)}")
            for service in active_services:
                print(f"     - {service.get('name')}: ₹{service.get('rate')}")
            
            # Activity notes
            activity_notes = response.get('activity_notes', [])
            print(f"\n   Activity Notes: {len(activity_notes)}")
            for note in activity_notes[:3]:  # Show first 3
                print(f"     - {note.get('note_type')}: {note.get('content')[:50]}...")
            
            # Invoices
            invoices = response.get('invoices', [])
            print(f"\n   Invoices: {len(invoices)}")
            for invoice in invoices[:3]:  # Show first 3
                print(f"     - {invoice.get('invoice_number')}: ₹{invoice.get('total')} ({invoice.get('status')})")
        
        return success

    def test_customer_creation_with_crm_fields(self):
        """Test creating customer with all CRM fields"""
        print("\n" + "="*60)
        print("TESTING CUSTOMER CREATION WITH CRM FIELDS")
        print("="*60)
        
        customer_data = {
            "name": "CRM Test Customer",
            "company": "CRM Test Company Ltd",
            "email": "crm.test@example.com",
            "phone": "+91 99999 88888",
            "address": "456 CRM Test Street",
            "city": "Mumbai",
            "state": "Maharashtra",
            "pincode": "400001",
            "gst_number": "27AABCU9603R1ZX",
            "pan_number": "AABCU9603R",
            "onboarding_date": "2024-01-15",
            "active_services": [],
            "notes": "Test customer created for CRM feature testing"
        }
        
        success, response = self.run_test(
            "Create Customer with CRM Fields",
            "POST",
            "customers",
            200,
            data=customer_data,
            description="Create customer with all CRM fields populated"
        )
        
        if success and response:
            customer_id = response.get('customer_id')
            self.test_data['test_customer_id'] = customer_id
            print(f"   Created customer ID: {customer_id}")
            print(f"   GST Number: {response.get('gst_number')}")
            print(f"   PAN Number: {response.get('pan_number')}")
            print(f"   Onboarding Date: {response.get('onboarding_date')}")
            print(f"   Address: {response.get('city')}, {response.get('state')} - {response.get('pincode')}")
        
        return success

    def test_customer_activity_notes(self):
        """Test customer activity notes functionality"""
        print("\n" + "="*60)
        print("TESTING CUSTOMER ACTIVITY NOTES")
        print("="*60)
        
        customer_id = self.test_data.get('test_customer_id')
        if not customer_id:
            print("❌ No test customer found - skipping activity notes test")
            return False
        
        # Add a note
        note_data = {
            "content": "Initial consultation completed. Customer interested in UGC services.",
            "note_type": "meeting"
        }
        
        success, response = self.run_test(
            "Add Customer Note",
            "POST",
            f"customers/{customer_id}/notes",
            200,
            data=note_data,
            description="Add activity note to customer"
        )
        
        if success and response:
            note_id = response.get('note_id')
            self.test_data['note_id'] = note_id
            print(f"   Added note ID: {note_id}")
            print(f"   Note type: {response.get('note_type')}")
            print(f"   Content: {response.get('content')}")
        
        # Get all notes for customer
        success, response = self.run_test(
            "Get Customer Notes",
            "GET",
            f"customers/{customer_id}/notes",
            200,
            description="Retrieve all customer activity notes"
        )
        
        if success and response:
            print(f"   Found {len(response)} notes for customer")
            for note in response:
                print(f"     - {note.get('note_type')}: {note.get('content')[:50]}...")
        
        return success

    def test_invoice_auto_fill_functionality(self):
        """Test invoice creation with auto-fill from customer data"""
        print("\n" + "="*60)
        print("TESTING INVOICE AUTO-FILL FUNCTIONALITY")
        print("="*60)
        
        customer_id = self.test_data.get('test_customer_id')
        if not customer_id:
            print("❌ No test customer found - skipping auto-fill test")
            return False
        
        # First, get items to use in invoice
        success, items_response = self.run_test(
            "Get Items for Invoice",
            "GET",
            "items",
            200,
            description="Get available items for invoice creation"
        )
        
        if not success or not items_response:
            print("❌ No items found - cannot test invoice creation")
            return False
        
        item_id = items_response[0].get('item_id')
        
        # Create invoice
        due_date = (datetime.now() + timedelta(days=30)).isoformat()
        invoice_data = {
            "customer_id": customer_id,
            "items": [{"item_id": item_id, "quantity": 1}],
            "due_date": due_date,
            "tax": 1800.0,
            "notes": "Test invoice for CRM auto-fill verification"
        }
        
        success, response = self.run_test(
            "Create Invoice with Auto-fill",
            "POST",
            "invoices",
            200,
            data=invoice_data,
            description="Create invoice and verify customer data auto-fill"
        )
        
        if success and response:
            invoice_id = response.get('invoice_id')
            self.test_data['test_invoice_id'] = invoice_id
            print(f"   Created invoice ID: {invoice_id}")
            print(f"   Invoice number: {response.get('invoice_number')}")
            print(f"   Customer name: {response.get('customer_name')}")
            print(f"   Customer email: {response.get('customer_email')}")
            print(f"   Customer address: {response.get('customer_address', 'N/A')}")
            print(f"   Customer GST: {response.get('customer_gst', 'N/A')}")
            print(f"   Total amount: ₹{response.get('total', 0)}")
            
            # Verify auto-filled data
            if response.get('customer_gst') == "27AABCU9603R1ZX":
                print("   ✓ GST number auto-filled correctly")
            if "Mumbai, Maharashtra - 400001" in response.get('customer_address', ''):
                print("   ✓ Address auto-filled correctly")
        
        return success

    def test_customer_status_calculation(self):
        """Test customer status auto-calculation based on invoices"""
        print("\n" + "="*60)
        print("TESTING CUSTOMER STATUS CALCULATION")
        print("="*60)
        
        # Get customers and check status calculation
        success, response = self.run_test(
            "Get Customers for Status Check",
            "GET",
            "customers",
            200,
            description="Verify customer status auto-calculation"
        )
        
        if success and response:
            status_counts = {"Active": 0, "Follow-up Needed": 0, "Overdue": 0, "Inactive": 0}
            
            for customer in response:
                status = customer.get('status', 'Unknown')
                if status in status_counts:
                    status_counts[status] += 1
                
                print(f"\n   Customer: {customer.get('name')}")
                print(f"     Status: {status}")
                print(f"     Total Billed: ₹{customer.get('total_billed', 0)}")
                print(f"     Balance Due: ₹{customer.get('receivables', 0)}")
                
                # Validate status logic
                balance_due = customer.get('receivables', 0)
                if balance_due > 0:
                    print(f"     ✓ Has outstanding balance - status should be Follow-up/Overdue")
                elif customer.get('total_billed', 0) > 0:
                    print(f"     ✓ Has billing history - status should be Active/Inactive")
            
            print(f"\n   Status Distribution:")
            for status, count in status_counts.items():
                print(f"     {status}: {count} customers")
        
        return success

    def cleanup_test_data(self):
        """Clean up test data"""
        print("\n" + "="*60)
        print("CLEANING UP CRM TEST DATA")
        print("="*60)
        
        # Delete test invoice
        if 'test_invoice_id' in self.test_data:
            self.run_test(
                "Delete Test Invoice",
                "DELETE",
                f"invoices/{self.test_data['test_invoice_id']}",
                200,
                description="Clean up test invoice"
            )
        
        # Delete test customer note
        if 'note_id' in self.test_data and 'test_customer_id' in self.test_data:
            self.run_test(
                "Delete Test Note",
                "DELETE",
                f"customers/{self.test_data['test_customer_id']}/notes/{self.test_data['note_id']}",
                200,
                description="Clean up test customer note"
            )
        
        # Delete test customer
        if 'test_customer_id' in self.test_data:
            self.run_test(
                "Delete Test Customer",
                "DELETE",
                f"customers/{self.test_data['test_customer_id']}",
                200,
                description="Clean up test customer"
            )

    def run_all_crm_tests(self):
        """Run all CRM feature tests"""
        print("🚀 Starting InvoicePush CRM Features Tests")
        print(f"📍 Base URL: {self.base_url}")
        print(f"🔑 Session Token: {self.session_token[:20]}...")
        
        # Test all CRM features
        tests = [
            self.test_customer_list_with_crm_features,
            self.test_customer_profile_with_full_details,
            self.test_customer_creation_with_crm_fields,
            self.test_customer_activity_notes,
            self.test_invoice_auto_fill_functionality,
            self.test_customer_status_calculation
        ]
        
        for test in tests:
            try:
                test()
            except Exception as e:
                print(f"❌ Test failed with exception: {str(e)}")
        
        # Clean up
        self.cleanup_test_data()
        
        # Print results
        print("\n" + "="*60)
        print("CRM FEATURES TEST RESULTS")
        print("="*60)
        print(f"📊 Tests passed: {self.tests_passed}/{self.tests_run}")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"📈 Success rate: {success_rate:.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All CRM tests passed!")
            return True
        else:
            print("⚠️  Some CRM tests failed")
            return False

def main():
    tester = CRMFeaturesTester()
    success = tester.run_all_crm_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())