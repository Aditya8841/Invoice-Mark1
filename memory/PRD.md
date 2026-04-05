# InvoicePush - Product Requirements Document

## Original Problem Statement
Build a web app called InvoicePush that looks and works like Zoho Invoice but simpler with:
- Dashboard: Total receivables, overdue amounts by days (1-15, 16-30, 31-45, 45+)
- Customers: CRUD for clients with name, company, email, phone, receivables
- Items: CRUD for services with name and rate (₹)
- Invoices: CRUD with status (Draft/Sent/Overdue/Paid), PDF generation
- Approval Queue: Reminders pending approval before sending
- Reminder Logic: Day -2 (Polite), Day 0 (Professional), Day +5 (Firm), Day +10 (Strict)
- Single user Google login
- Dark sidebar like Zoho Invoice
- Currency in Indian Rupees (₹)

## User Personas
- **Primary User**: Business owner/freelancer managing invoices
- **Use Case**: Send invoices, track payments, send reminder emails

## Core Requirements (Static)
- Google OAuth authentication
- MongoDB database
- Resend API for emails
- jsPDF for PDF generation
- cron-job.org webhook endpoint ready
- Indian Rupee (₹) formatting

## What's Been Implemented (April 2026)

### Backend (FastAPI)
- ✅ Google OAuth via Emergent Auth
- ✅ Session management with cookies
- ✅ Customers CRUD API (`/api/customers`)
- ✅ Items CRUD API (`/api/items`)
- ✅ Invoices CRUD API (`/api/invoices`)
- ✅ Dashboard stats API (`/api/dashboard/stats`)
- ✅ Reminders/Approval Queue API (`/api/reminders`)
- ✅ Email sending via Resend API
- ✅ Cron webhook endpoint (`/api/webhook/cron`)
- ✅ Business profile update

### Frontend (React + Tailwind)
- ✅ Login page with Google OAuth
- ✅ Dark sidebar navigation
- ✅ Dashboard with receivables metrics
- ✅ Customers page with CRUD
- ✅ Items page with CRUD
- ✅ Invoices page with CRUD + PDF download
- ✅ Approval Queue with preview & approve/send
- ✅ Settings page for business profile
- ✅ Indian Rupee currency formatting
- ✅ Status badges (Draft, Sent, Overdue, Paid, Pending)
- ✅ Tone badges (Polite, Professional, Firm, Strict)

## Prioritized Backlog

### P0 (Critical)
- All core features implemented ✅

### P1 (High Priority)
- [ ] Set up cron-job.org to call `/api/webhook/cron` daily
- [ ] Email verification for Resend (domain verification)
- [ ] Partial payment support on invoices

### P2 (Medium Priority)
- [ ] Invoice templates/customization
- [ ] Email history tracking
- [ ] Customer payment portal
- [ ] Multi-currency support

### P3 (Nice to Have)
- [ ] Recurring invoices
- [ ] Analytics/reports
- [ ] Export to CSV/Excel
- [ ] Payment gateway integration (Razorpay)

## Next Tasks
1. Configure cron-job.org to call the webhook endpoint daily
2. Verify sender domain on Resend for production emails
3. Add partial payment tracking
