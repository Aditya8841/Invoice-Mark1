from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import resend

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Resend setup
resend.api_key = os.environ.get('RESEND_API_KEY')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'compnayname@mark1.com')

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============== MODELS ==============

class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    business_name: Optional[str] = None
    business_address: Optional[str] = None
    business_phone: Optional[str] = None
    business_email: Optional[str] = None
    invoice_template: Optional[str] = "standard"
    invoice_logo: Optional[str] = None
    invoice_terms: Optional[str] = None
    invoice_custom_fields: Optional[List[dict]] = None

class UserUpdate(BaseModel):
    business_name: Optional[str] = None
    business_address: Optional[str] = None
    business_phone: Optional[str] = None
    business_email: Optional[str] = None
    invoice_template: Optional[str] = None  # standard, modern, spreadsheet
    invoice_logo: Optional[str] = None  # base64 encoded logo
    invoice_terms: Optional[str] = None
    invoice_custom_fields: Optional[List[dict]] = None  # [{label, value}]

class Customer(BaseModel):
    customer_id: str = Field(default_factory=lambda: f"cust_{uuid.uuid4().hex[:12]}")
    user_id: str
    name: str
    company: Optional[str] = None
    email: EmailStr
    phone: Optional[str] = None
    # Address fields
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    # Business details
    gst_number: Optional[str] = None
    pan_number: Optional[str] = None
    # CRM fields
    onboarding_date: Optional[datetime] = None
    active_services: Optional[List[str]] = None  # List of item_ids
    notes: Optional[str] = None
    status: Optional[str] = "Active"  # Active, Follow-up Needed, Overdue, Inactive
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CustomerCreate(BaseModel):
    name: str
    company: Optional[str] = None
    email: EmailStr
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    gst_number: Optional[str] = None
    pan_number: Optional[str] = None
    onboarding_date: Optional[str] = None
    active_services: Optional[List[str]] = None
    notes: Optional[str] = None

class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    company: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    gst_number: Optional[str] = None
    pan_number: Optional[str] = None
    onboarding_date: Optional[str] = None
    active_services: Optional[List[str]] = None
    notes: Optional[str] = None
    status: Optional[str] = None

class CustomerNote(BaseModel):
    note_id: str = Field(default_factory=lambda: f"note_{uuid.uuid4().hex[:12]}")
    customer_id: str
    user_id: str
    content: str
    note_type: str = "note"  # note, call, meeting, email, status_change
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CustomerNoteCreate(BaseModel):
    content: str
    note_type: Optional[str] = "note"

class Item(BaseModel):
    item_id: str = Field(default_factory=lambda: f"item_{uuid.uuid4().hex[:12]}")
    user_id: str
    name: str
    rate: float
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ItemCreate(BaseModel):
    name: str
    rate: float
    description: Optional[str] = None

class ItemUpdate(BaseModel):
    name: Optional[str] = None
    rate: Optional[float] = None
    description: Optional[str] = None

class InvoiceItem(BaseModel):
    item_id: str
    name: str
    rate: float
    quantity: int = 1

class Invoice(BaseModel):
    invoice_id: str = Field(default_factory=lambda: f"inv_{uuid.uuid4().hex[:12]}")
    user_id: str
    invoice_number: str
    customer_id: str
    customer_name: str
    customer_email: str
    customer_address: Optional[str] = None
    customer_gst: Optional[str] = None
    items: List[InvoiceItem]
    subtotal: float
    tax: float = 0
    total: float
    balance_due: float
    amount_paid: float = 0
    status: str = "Draft"  # Draft, Sent, Overdue, Paid
    issue_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    due_date: datetime
    paid_date: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class InvoiceCreate(BaseModel):
    customer_id: str
    items: List[dict]  # [{item_id, quantity}]
    due_date: str  # ISO date string
    tax: float = 0
    notes: Optional[str] = None

class InvoiceUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    paid_date: Optional[str] = None

class Reminder(BaseModel):
    reminder_id: str = Field(default_factory=lambda: f"rem_{uuid.uuid4().hex[:12]}")
    user_id: str
    invoice_id: str
    customer_name: str
    customer_email: str
    amount: float
    tone: str  # Polite, Professional, Firm, Strict
    message: str
    status: str = "Pending"  # Pending, Approved, Sent
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    sent_at: Optional[datetime] = None

# ============== AUTH HELPERS ==============

async def get_current_user(request: Request) -> dict:
    """Get current user from session token cookie or Authorization header"""
    session_token = request.cookies.get("session_token")
    
    if not session_token:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    session = await db.user_sessions.find_one(
        {"session_token": session_token},
        {"_id": 0}
    )
    
    if not session:
        raise HTTPException(status_code=401, detail="Invalid session")
    
    # Check expiry
    expires_at = session.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    
    user = await db.users.find_one(
        {"user_id": session["user_id"]},
        {"_id": 0}
    )
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return user

# ============== AUTH ENDPOINTS ==============

@api_router.post("/auth/session")
async def exchange_session(request: Request, response: Response):
    """Exchange session_id for session_token"""
    import httpx
    
    body = await request.json()
    session_id = body.get("session_id")
    
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")
    
    # Call Emergent Auth to get session data
    async with httpx.AsyncClient() as client_http:
        resp = await client_http.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        
        if resp.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session_id")
        
        auth_data = resp.json()
    
    user_id = f"user_{uuid.uuid4().hex[:12]}"
    session_token = auth_data.get("session_token")
    
    # Check if user exists by email
    existing_user = await db.users.find_one(
        {"email": auth_data["email"]},
        {"_id": 0}
    )
    
    if existing_user:
        user_id = existing_user["user_id"]
        # Update user info
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {
                "name": auth_data["name"],
                "picture": auth_data.get("picture")
            }}
        )
    else:
        # Create new user
        new_user = {
            "user_id": user_id,
            "email": auth_data["email"],
            "name": auth_data["name"],
            "picture": auth_data.get("picture"),
            "business_name": None,
            "business_address": None,
            "business_phone": None,
            "business_email": None,
            "invoice_template": "standard",
            "invoice_logo": None,
            "invoice_terms": None,
            "invoice_custom_fields": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(new_user)
    
    # Store session
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Set cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60
    )
    
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return user

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    """Get current authenticated user"""
    return user

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout user"""
    session_token = request.cookies.get("session_token")
    
    if session_token:
        await db.user_sessions.delete_one({"session_token": session_token})
    
    response.delete_cookie(key="session_token", path="/")
    return {"message": "Logged out"}

@api_router.put("/auth/profile")
async def update_profile(update: UserUpdate, user: dict = Depends(get_current_user)):
    """Update user business profile"""
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    if update_data:
        await db.users.update_one(
            {"user_id": user["user_id"]},
            {"$set": update_data}
        )
    
    updated_user = await db.users.find_one({"user_id": user["user_id"]}, {"_id": 0})
    return updated_user

# ============== CUSTOMER ENDPOINTS ==============

def calculate_customer_status(invoices):
    """Calculate customer status based on invoice situation"""
    if not invoices:
        return "Inactive"
    
    has_overdue = any(inv.get("status") == "Overdue" for inv in invoices)
    has_unpaid = any(inv.get("balance_due", 0) > 0 and inv.get("status") != "Overdue" for inv in invoices)
    has_recent_activity = any(
        datetime.fromisoformat(inv.get("created_at", "2000-01-01").replace("Z", "+00:00")) > datetime.now(timezone.utc) - timedelta(days=90)
        for inv in invoices
    )
    
    if has_overdue:
        return "Overdue"
    elif has_unpaid:
        return "Follow-up Needed"
    elif has_recent_activity:
        return "Active"
    else:
        return "Inactive"

@api_router.get("/customers")
async def get_customers(user: dict = Depends(get_current_user)):
    """Get all customers for user with status calculation"""
    customers = await db.customers.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).to_list(1000)
    
    # Calculate receivables and status for each customer
    for customer in customers:
        invoices = await db.invoices.find(
            {"user_id": user["user_id"], "customer_id": customer["customer_id"]},
            {"_id": 0, "balance_due": 1, "status": 1, "total": 1, "created_at": 1}
        ).to_list(1000)
        
        customer["receivables"] = sum(inv.get("balance_due", 0) for inv in invoices if inv.get("status") != "Paid")
        customer["total_billed"] = sum(inv.get("total", 0) for inv in invoices)
        customer["total_paid"] = customer["total_billed"] - customer["receivables"]
        
        # Auto-calculate status
        customer["status"] = calculate_customer_status(invoices)
    
    return customers

@api_router.get("/customers/{customer_id}")
async def get_customer(customer_id: str, user: dict = Depends(get_current_user)):
    """Get single customer with full profile and stats"""
    customer = await db.customers.find_one(
        {"customer_id": customer_id, "user_id": user["user_id"]},
        {"_id": 0}
    )
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Get all invoices for this customer
    invoices = await db.invoices.find(
        {"user_id": user["user_id"], "customer_id": customer_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    # Calculate stats
    customer["total_billed"] = sum(inv.get("total", 0) for inv in invoices)
    customer["total_paid"] = sum(inv.get("total", 0) - inv.get("balance_due", 0) for inv in invoices)
    customer["balance_due"] = sum(inv.get("balance_due", 0) for inv in invoices)
    customer["invoice_count"] = len(invoices)
    customer["invoices"] = invoices
    
    # Auto-calculate status
    customer["status"] = calculate_customer_status(invoices)
    
    # Get reminders for this customer
    reminders = await db.reminders.find(
        {"user_id": user["user_id"], "invoice_id": {"$in": [inv["invoice_id"] for inv in invoices]}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    customer["reminders"] = reminders
    
    # Get activity notes
    notes = await db.customer_notes.find(
        {"customer_id": customer_id, "user_id": user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    customer["activity_notes"] = notes
    
    # Get active service details
    if customer.get("active_services"):
        services = await db.items.find(
            {"user_id": user["user_id"], "item_id": {"$in": customer["active_services"]}},
            {"_id": 0}
        ).to_list(100)
        customer["active_services_details"] = services
    else:
        customer["active_services_details"] = []
    
    return customer

@api_router.post("/customers")
async def create_customer(customer_data: CustomerCreate, user: dict = Depends(get_current_user)):
    """Create a new customer"""
    data = customer_data.model_dump()
    
    # Handle onboarding_date
    if data.get("onboarding_date"):
        data["onboarding_date"] = data["onboarding_date"]
    else:
        data["onboarding_date"] = datetime.now(timezone.utc).isoformat()
    
    customer = Customer(
        user_id=user["user_id"],
        **{k: v for k, v in data.items() if k != "onboarding_date"}
    )
    doc = customer.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["onboarding_date"] = data["onboarding_date"]
    if doc.get("onboarding_date") and isinstance(doc["onboarding_date"], datetime):
        doc["onboarding_date"] = doc["onboarding_date"].isoformat()
    
    await db.customers.insert_one(doc)
    
    # Add activity note for customer creation
    note_doc = {
        "note_id": f"note_{uuid.uuid4().hex[:12]}",
        "customer_id": doc["customer_id"],
        "user_id": user["user_id"],
        "content": "Customer profile created",
        "note_type": "status_change",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.customer_notes.insert_one(note_doc)
    
    return {k: v for k, v in doc.items() if k != "_id"}

@api_router.put("/customers/{customer_id}")
async def update_customer(customer_id: str, update: CustomerUpdate, user: dict = Depends(get_current_user)):
    """Update a customer"""
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    result = await db.customers.update_one(
        {"customer_id": customer_id, "user_id": user["user_id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    customer = await db.customers.find_one({"customer_id": customer_id}, {"_id": 0})
    return customer

@api_router.delete("/customers/{customer_id}")
async def delete_customer(customer_id: str, user: dict = Depends(get_current_user)):
    """Delete a customer"""
    result = await db.customers.delete_one(
        {"customer_id": customer_id, "user_id": user["user_id"]}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    return {"message": "Customer deleted"}

# ============== CUSTOMER NOTES/ACTIVITY ENDPOINTS ==============

@api_router.get("/customers/{customer_id}/notes")
async def get_customer_notes(customer_id: str, user: dict = Depends(get_current_user)):
    """Get all notes/activity for a customer"""
    notes = await db.customer_notes.find(
        {"customer_id": customer_id, "user_id": user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return notes

@api_router.post("/customers/{customer_id}/notes")
async def add_customer_note(customer_id: str, note_data: CustomerNoteCreate, user: dict = Depends(get_current_user)):
    """Add a note/activity to a customer"""
    # Verify customer exists
    customer = await db.customers.find_one(
        {"customer_id": customer_id, "user_id": user["user_id"]}
    )
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    note = CustomerNote(
        customer_id=customer_id,
        user_id=user["user_id"],
        **note_data.model_dump()
    )
    doc = note.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.customer_notes.insert_one(doc)
    
    return {k: v for k, v in doc.items() if k != "_id"}

@api_router.delete("/customers/{customer_id}/notes/{note_id}")
async def delete_customer_note(customer_id: str, note_id: str, user: dict = Depends(get_current_user)):
    """Delete a customer note"""
    result = await db.customer_notes.delete_one(
        {"note_id": note_id, "customer_id": customer_id, "user_id": user["user_id"]}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Note not found")
    
    return {"message": "Note deleted"}

# ============== ITEM ENDPOINTS ==============

@api_router.get("/items")
async def get_items(user: dict = Depends(get_current_user)):
    """Get all items for user"""
    items = await db.items.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).to_list(1000)
    return items

@api_router.post("/items")
async def create_item(item_data: ItemCreate, user: dict = Depends(get_current_user)):
    """Create a new item"""
    item = Item(
        user_id=user["user_id"],
        **item_data.model_dump()
    )
    doc = item.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.items.insert_one(doc)
    
    return {k: v for k, v in doc.items() if k != "_id"}

@api_router.put("/items/{item_id}")
async def update_item(item_id: str, update: ItemUpdate, user: dict = Depends(get_current_user)):
    """Update an item"""
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    result = await db.items.update_one(
        {"item_id": item_id, "user_id": user["user_id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    
    item = await db.items.find_one({"item_id": item_id}, {"_id": 0})
    return item

@api_router.delete("/items/{item_id}")
async def delete_item(item_id: str, user: dict = Depends(get_current_user)):
    """Delete an item"""
    result = await db.items.delete_one(
        {"item_id": item_id, "user_id": user["user_id"]}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    
    return {"message": "Item deleted"}

# ============== INVOICE ENDPOINTS ==============

async def get_next_invoice_number(user_id: str) -> str:
    """Generate next invoice number"""
    last_invoice = await db.invoices.find_one(
        {"user_id": user_id},
        {"_id": 0, "invoice_number": 1},
        sort=[("created_at", -1)]
    )
    
    if last_invoice:
        try:
            num = int(last_invoice["invoice_number"].replace("INV-", ""))
            return f"INV-{str(num + 1).zfill(3)}"
        except:
            pass
    
    return "INV-001"

@api_router.get("/invoices")
async def get_invoices(user: dict = Depends(get_current_user)):
    """Get all invoices for user"""
    invoices = await db.invoices.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    
    # Update overdue status
    now = datetime.now(timezone.utc)
    for inv in invoices:
        if inv["status"] not in ["Paid", "Draft"]:
            due_date = inv["due_date"]
            if isinstance(due_date, str):
                due_date = datetime.fromisoformat(due_date.replace("Z", "+00:00"))
            if due_date.tzinfo is None:
                due_date = due_date.replace(tzinfo=timezone.utc)
            if due_date < now:
                inv["status"] = "Overdue"
                await db.invoices.update_one(
                    {"invoice_id": inv["invoice_id"]},
                    {"$set": {"status": "Overdue"}}
                )
    
    return invoices

@api_router.get("/invoices/{invoice_id}")
async def get_invoice(invoice_id: str, user: dict = Depends(get_current_user)):
    """Get single invoice"""
    invoice = await db.invoices.find_one(
        {"invoice_id": invoice_id, "user_id": user["user_id"]},
        {"_id": 0}
    )
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    return invoice

@api_router.post("/invoices")
async def create_invoice(invoice_data: InvoiceCreate, user: dict = Depends(get_current_user)):
    """Create a new invoice"""
    # Get customer
    customer = await db.customers.find_one(
        {"customer_id": invoice_data.customer_id, "user_id": user["user_id"]},
        {"_id": 0}
    )
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Build full address
    address_parts = []
    if customer.get("address"):
        address_parts.append(customer["address"])
    if customer.get("city"):
        address_parts.append(customer["city"])
    if customer.get("state"):
        address_parts.append(customer["state"])
    if customer.get("pincode"):
        address_parts.append(customer["pincode"])
    full_address = ", ".join(address_parts) if address_parts else None
    
    # Get items and calculate totals
    invoice_items = []
    subtotal = 0
    
    for item_data in invoice_data.items:
        item = await db.items.find_one(
            {"item_id": item_data["item_id"], "user_id": user["user_id"]},
            {"_id": 0}
        )
        
        if not item:
            raise HTTPException(status_code=404, detail=f"Item {item_data['item_id']} not found")
        
        quantity = item_data.get("quantity", 1)
        invoice_items.append(InvoiceItem(
            item_id=item["item_id"],
            name=item["name"],
            rate=item["rate"],
            quantity=quantity
        ))
        subtotal += item["rate"] * quantity
    
    total = subtotal + invoice_data.tax
    invoice_number = await get_next_invoice_number(user["user_id"])
    
    due_date = datetime.fromisoformat(invoice_data.due_date.replace("Z", "+00:00"))
    if due_date.tzinfo is None:
        due_date = due_date.replace(tzinfo=timezone.utc)
    
    invoice = Invoice(
        user_id=user["user_id"],
        invoice_number=invoice_number,
        customer_id=customer["customer_id"],
        customer_name=customer["name"],
        customer_email=customer["email"],
        customer_address=full_address,
        customer_gst=customer.get("gst_number"),
        items=[item.model_dump() for item in invoice_items],
        subtotal=subtotal,
        tax=invoice_data.tax,
        total=total,
        balance_due=total,
        due_date=due_date,
        notes=invoice_data.notes
    )
    
    doc = invoice.model_dump()
    doc["issue_date"] = doc["issue_date"].isoformat()
    doc["due_date"] = doc["due_date"].isoformat()
    doc["created_at"] = doc["created_at"].isoformat()
    
    await db.invoices.insert_one(doc)
    
    # Add activity note for the customer
    note_doc = {
        "note_id": f"note_{uuid.uuid4().hex[:12]}",
        "customer_id": customer["customer_id"],
        "user_id": user["user_id"],
        "content": f"Invoice {invoice_number} created for {formatCurrency(total)}",
        "note_type": "invoice",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.customer_notes.insert_one(note_doc)
    
    return {k: v for k, v in doc.items() if k != "_id"}

def formatCurrency(amount):
    """Format currency for activity notes"""
    return f"₹{amount:,.0f}"

@api_router.put("/invoices/{invoice_id}")
async def update_invoice(invoice_id: str, update: InvoiceUpdate, user: dict = Depends(get_current_user)):
    """Update an invoice"""
    update_data = {}
    
    if update.status:
        update_data["status"] = update.status
        if update.status == "Paid":
            update_data["balance_due"] = 0
            update_data["paid_date"] = datetime.now(timezone.utc).isoformat()
    
    if update.notes is not None:
        update_data["notes"] = update.notes
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    result = await db.invoices.update_one(
        {"invoice_id": invoice_id, "user_id": user["user_id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    invoice = await db.invoices.find_one({"invoice_id": invoice_id}, {"_id": 0})
    return invoice

@api_router.delete("/invoices/{invoice_id}")
async def delete_invoice(invoice_id: str, user: dict = Depends(get_current_user)):
    """Delete an invoice"""
    result = await db.invoices.delete_one(
        {"invoice_id": invoice_id, "user_id": user["user_id"]}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    return {"message": "Invoice deleted"}

# ============== DASHBOARD ENDPOINTS ==============

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(user: dict = Depends(get_current_user)):
    """Get dashboard statistics"""
    now = datetime.now(timezone.utc)
    
    # Get all unpaid invoices
    invoices = await db.invoices.find(
        {"user_id": user["user_id"], "status": {"$ne": "Paid"}},
        {"_id": 0}
    ).to_list(1000)
    
    total_receivables = 0
    overdue_1_15 = 0
    overdue_16_30 = 0
    overdue_31_45 = 0
    overdue_45_plus = 0
    
    for inv in invoices:
        balance = inv.get("balance_due", 0)
        total_receivables += balance
        
        due_date = inv["due_date"]
        if isinstance(due_date, str):
            due_date = datetime.fromisoformat(due_date.replace("Z", "+00:00"))
        if due_date.tzinfo is None:
            due_date = due_date.replace(tzinfo=timezone.utc)
        
        if due_date < now:
            days_overdue = (now - due_date).days
            if 1 <= days_overdue <= 15:
                overdue_1_15 += balance
            elif 16 <= days_overdue <= 30:
                overdue_16_30 += balance
            elif 31 <= days_overdue <= 45:
                overdue_31_45 += balance
            elif days_overdue > 45:
                overdue_45_plus += balance
    
    return {
        "total_receivables": total_receivables,
        "overdue_1_15": overdue_1_15,
        "overdue_16_30": overdue_16_30,
        "overdue_31_45": overdue_31_45,
        "overdue_45_plus": overdue_45_plus
    }

# ============== REMINDER/APPROVAL QUEUE ENDPOINTS ==============

REMINDER_TEMPLATES = {
    "Polite": {
        "subject": "Friendly Reminder: Invoice {invoice_number} Due Soon",
        "body": """
<p>Dear {customer_name},</p>
<p>I hope this email finds you well. This is a friendly reminder that Invoice {invoice_number} for <strong>₹{amount}</strong> is due on {due_date}.</p>
<p>If you've already made the payment, please disregard this message. Otherwise, we kindly request you to process the payment at your earliest convenience.</p>
<p>Thank you for your business!</p>
<p>Best regards</p>
"""
    },
    "Professional": {
        "subject": "Payment Reminder: Invoice {invoice_number} Due Today",
        "body": """
<p>Dear {customer_name},</p>
<p>This is a reminder that Invoice {invoice_number} for <strong>₹{amount}</strong> is due today ({due_date}).</p>
<p>Please ensure the payment is processed today to avoid any late fees or service interruptions.</p>
<p>If you have any questions about this invoice, please don't hesitate to contact us.</p>
<p>Best regards</p>
"""
    },
    "Firm": {
        "subject": "Overdue Notice: Invoice {invoice_number} - Immediate Attention Required",
        "body": """
<p>Dear {customer_name},</p>
<p>Our records indicate that Invoice {invoice_number} for <strong>₹{amount}</strong> is now 5 days overdue. The original due date was {due_date}.</p>
<p>We request immediate payment to bring your account current. Please process the payment within the next 48 hours.</p>
<p>If there are any issues with the invoice or payment, please contact us immediately so we can resolve them.</p>
<p>Regards</p>
"""
    },
    "Strict": {
        "subject": "URGENT: Invoice {invoice_number} - 10 Days Overdue - Final Notice",
        "body": """
<p>Dear {customer_name},</p>
<p><strong>This is a final notice regarding Invoice {invoice_number} for ₹{amount}, which is now 10 days overdue.</strong></p>
<p>Despite our previous reminders, payment has not been received. The original due date was {due_date}.</p>
<p>Please make the payment immediately to avoid any further action on your account. Failure to pay may result in service suspension and additional collection measures.</p>
<p>If you have already made this payment, please send us the confirmation immediately.</p>
<p>Regards</p>
"""
    }
}

def get_reminder_tone(days_from_due: int) -> str:
    """Determine reminder tone based on days from due date"""
    if days_from_due <= -2:
        return "Polite"
    elif days_from_due == 0:
        return "Professional"
    elif days_from_due >= 5 and days_from_due < 10:
        return "Firm"
    elif days_from_due >= 10:
        return "Strict"
    return None

@api_router.get("/reminders")
async def get_reminders(user: dict = Depends(get_current_user)):
    """Get all reminders in approval queue"""
    reminders = await db.reminders.find(
        {"user_id": user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    return reminders

@api_router.post("/reminders/generate")
async def generate_reminders(user: dict = Depends(get_current_user)):
    """Generate reminders for invoices (called by cron job or manually)"""
    now = datetime.now(timezone.utc)
    
    # Get all Sent/Overdue invoices
    invoices = await db.invoices.find(
        {"user_id": user["user_id"], "status": {"$in": ["Sent", "Overdue"]}},
        {"_id": 0}
    ).to_list(1000)
    
    generated = []
    
    for inv in invoices:
        due_date = inv["due_date"]
        if isinstance(due_date, str):
            due_date = datetime.fromisoformat(due_date.replace("Z", "+00:00"))
        if due_date.tzinfo is None:
            due_date = due_date.replace(tzinfo=timezone.utc)
        
        days_from_due = (now - due_date).days
        tone = get_reminder_tone(days_from_due)
        
        if not tone:
            continue
        
        # Check if reminder already exists for this invoice and tone
        existing = await db.reminders.find_one({
            "invoice_id": inv["invoice_id"],
            "tone": tone,
            "status": {"$in": ["Pending", "Sent"]}
        })
        
        if existing:
            continue
        
        template = REMINDER_TEMPLATES[tone]
        due_date_str = due_date.strftime("%d %b %Y")
        amount_str = f"{inv['balance_due']:,.2f}"
        
        message = template["body"].format(
            customer_name=inv["customer_name"],
            invoice_number=inv["invoice_number"],
            amount=amount_str,
            due_date=due_date_str
        )
        
        reminder = Reminder(
            user_id=user["user_id"],
            invoice_id=inv["invoice_id"],
            customer_name=inv["customer_name"],
            customer_email=inv["customer_email"],
            amount=inv["balance_due"],
            tone=tone,
            message=message
        )
        
        doc = reminder.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        await db.reminders.insert_one(doc)
        
        generated.append({k: v for k, v in doc.items() if k != "_id"})
    
    return {"generated": len(generated), "reminders": generated}

@api_router.post("/reminders/{reminder_id}/approve")
async def approve_and_send_reminder(reminder_id: str, user: dict = Depends(get_current_user)):
    """Approve and send a reminder email"""
    reminder = await db.reminders.find_one(
        {"reminder_id": reminder_id, "user_id": user["user_id"]},
        {"_id": 0}
    )
    
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    
    if reminder["status"] != "Pending":
        raise HTTPException(status_code=400, detail="Reminder already processed")
    
    # Get invoice for subject
    invoice = await db.invoices.find_one(
        {"invoice_id": reminder["invoice_id"]},
        {"_id": 0}
    )
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    template = REMINDER_TEMPLATES[reminder["tone"]]
    subject = template["subject"].format(
        invoice_number=invoice["invoice_number"],
        amount=f"{reminder['amount']:,.2f}"
    )
    
    # Send email via Resend
    try:
        params = {
            "from": SENDER_EMAIL,
            "to": [reminder["customer_email"]],
            "subject": subject,
            "html": reminder["message"]
        }
        
        email_result = await asyncio.to_thread(resend.Emails.send, params)
        
        # Update reminder status
        await db.reminders.update_one(
            {"reminder_id": reminder_id},
            {"$set": {
                "status": "Sent",
                "sent_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {"message": "Email sent successfully", "email_id": email_result.get("id")}
    
    except Exception as e:
        logger.error(f"Failed to send email: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

@api_router.delete("/reminders/{reminder_id}")
async def delete_reminder(reminder_id: str, user: dict = Depends(get_current_user)):
    """Delete a reminder"""
    result = await db.reminders.delete_one(
        {"reminder_id": reminder_id, "user_id": user["user_id"]}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Reminder not found")
    
    return {"message": "Reminder deleted"}

# ============== CRON WEBHOOK ==============

@api_router.post("/webhook/cron")
async def cron_webhook(request: Request):
    """Webhook endpoint for cron-job.org to trigger reminder generation"""
    # Get all users and generate reminders for each
    users = await db.users.find({}, {"_id": 0, "user_id": 1}).to_list(1000)
    
    total_generated = 0
    for user in users:
        try:
            # Call generate_reminders logic
            now = datetime.now(timezone.utc)
            invoices = await db.invoices.find(
                {"user_id": user["user_id"], "status": {"$in": ["Sent", "Overdue"]}},
                {"_id": 0}
            ).to_list(1000)
            
            for inv in invoices:
                due_date = inv["due_date"]
                if isinstance(due_date, str):
                    due_date = datetime.fromisoformat(due_date.replace("Z", "+00:00"))
                if due_date.tzinfo is None:
                    due_date = due_date.replace(tzinfo=timezone.utc)
                
                days_from_due = (now - due_date).days
                tone = get_reminder_tone(days_from_due)
                
                if not tone:
                    continue
                
                existing = await db.reminders.find_one({
                    "invoice_id": inv["invoice_id"],
                    "tone": tone,
                    "status": {"$in": ["Pending", "Sent"]}
                })
                
                if existing:
                    continue
                
                template = REMINDER_TEMPLATES[tone]
                due_date_str = due_date.strftime("%d %b %Y")
                amount_str = f"{inv['balance_due']:,.2f}"
                
                message = template["body"].format(
                    customer_name=inv["customer_name"],
                    invoice_number=inv["invoice_number"],
                    amount=amount_str,
                    due_date=due_date_str
                )
                
                reminder = Reminder(
                    user_id=user["user_id"],
                    invoice_id=inv["invoice_id"],
                    customer_name=inv["customer_name"],
                    customer_email=inv["customer_email"],
                    amount=inv["balance_due"],
                    tone=tone,
                    message=message
                )
                
                doc = reminder.model_dump()
                doc["created_at"] = doc["created_at"].isoformat()
                await db.reminders.insert_one(doc)
                total_generated += 1
        
        except Exception as e:
            logger.error(f"Error generating reminders for user {user['user_id']}: {str(e)}")
    
    return {"message": f"Generated {total_generated} reminders"}

# Root endpoint
@api_router.get("/")
async def root():
    return {"message": "InvoicePush API"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
