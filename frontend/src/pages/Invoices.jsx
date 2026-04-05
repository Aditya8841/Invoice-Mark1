import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import axios from "axios";
import { API, useAuth } from "@/App";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import {
  Plus,
  MoreHorizontal,
  Trash2,
  FileText,
  Download,
  Send,
  CheckCircle,
  X,
  Settings2,
  Palette,
  Image,
  FileEdit,
  List,
  ScrollText,
  AlertTriangle,
  CreditCard,
  ChevronRight,
  Search,
  Filter,
  Pencil,
  Save,
  Percent,
} from "lucide-react";

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// PDF-safe currency formatter (jsPDF Helvetica can't render ₹)
const formatCurrencyPDF = (amount) => {
  const num = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
  return `Rs. ${num}`;
};

const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const numberToWords = (num) => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  if (num === 0) return 'Zero';
  const convertLessThanThousand = (n) => {
    if (n === 0) return '';
    if (n < 10) return ones[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertLessThanThousand(n % 100) : '');
  };
  let result = '';
  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const remainder = num % 1000;
  if (crore) result += convertLessThanThousand(crore) + ' Crore ';
  if (lakh) result += convertLessThanThousand(lakh) + ' Lakh ';
  if (thousand) result += convertLessThanThousand(thousand) + ' Thousand ';
  if (remainder) result += convertLessThanThousand(remainder);
  return result.trim() + ' Rupees Only';
};

const statusConfig = {
  Draft: { bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-200", dot: "bg-gray-400" },
  Sent: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", dot: "bg-blue-500" },
  Overdue: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", dot: "bg-red-500" },
  Paid: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" },
};

const getStatusBadge = (status) => {
  const cfg = statusConfig[status] || statusConfig.Draft;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text} border ${cfg.border}`} data-testid={`status-badge-${status?.toLowerCase()}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}></span>
      {status}
    </span>
  );
};

// ======================== MAIN COMPONENT ========================

const Invoices = () => {
  const { user, setUser } = useAuth();
  const location = useLocation();
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [selectedCustomerData, setSelectedCustomerData] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);
  const [dueDate, setDueDate] = useState("");
  const [tax, setTax] = useState("0");
  const [notes, setNotes] = useState("");
  const [orderNumber, setOrderNumber] = useState("");

  // Split-panel state
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("Bank Transfer");
  const [paymentReference, setPaymentReference] = useState("");

  // Edit mode
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [editSaving, setEditSaving] = useState(false);

  // Customization modals
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showCustomFieldsModal, setShowCustomFieldsModal] = useState(false);

  // Customization state
  const [selectedTemplate, setSelectedTemplate] = useState(user?.invoice_template || "standard");
  const [logoPreview, setLogoPreview] = useState(user?.invoice_logo || null);
  const [termsText, setTermsText] = useState(user?.invoice_terms || "");
  const [customFields, setCustomFields] = useState(user?.invoice_custom_fields || []);

  const fetchData = useCallback(async () => {
    try {
      const [invoicesRes, customersRes, itemsRes] = await Promise.all([
        axios.get(`${API}/invoices`, { withCredentials: true }),
        axios.get(`${API}/customers`, { withCredentials: true }),
        axios.get(`${API}/items`, { withCredentials: true }),
      ]);
      setInvoices(invoicesRes.data);
      setCustomers(customersRes.data);
      setItems(itemsRes.data);
      // Auto-select first invoice if none selected
      if (!selectedInvoice && invoicesRes.data.length > 0) {
        setSelectedInvoice(invoicesRes.data[0]);
      }
    } catch (error) {
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (location.state?.selectedCustomerId && customers.length > 0 && !loading) {
      const customerId = location.state.selectedCustomerId;
      setSelectedCustomer(customerId);
      handleCustomerSelect(customerId);
      setIsDialogOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state, customers, loading]);

  useEffect(() => {
    if (user) {
      setSelectedTemplate(user.invoice_template || "standard");
      setLogoPreview(user.invoice_logo || null);
      setTermsText(user.invoice_terms || "");
      setCustomFields(user.invoice_custom_fields || []);
    }
  }, [user]);

  // ======================== FILTERS ========================

  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      !searchQuery ||
      inv.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.order_number?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "All" || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // ======================== INVOICE FORM HANDLERS ========================

  const handleOpenDialog = () => {
    setSelectedCustomer("");
    setSelectedCustomerData(null);
    setSelectedItems([]);
    setDueDate("");
    setTax("0");
    setNotes("");
    setOrderNumber("");
    setIsDialogOpen(true);
  };

  const handleCustomerSelect = (customerId) => {
    setSelectedCustomer(customerId);
    const customer = customers.find(c => c.customer_id === customerId);
    setSelectedCustomerData(customer);
    if (customer?.active_services?.length > 0) {
      const preSelectedItems = [];
      customer.active_services.forEach(itemId => {
        const item = items.find(i => i.item_id === itemId);
        if (item) {
          preSelectedItems.push({ item_id: item.item_id, name: item.name, rate: item.rate, quantity: 1, description: item.description || "" });
        }
      });
      if (preSelectedItems.length > 0) setSelectedItems(preSelectedItems);
    }
  };

  const handleAddItem = (itemId) => {
    const item = items.find((i) => i.item_id === itemId);
    if (!item) return;
    const existing = selectedItems.find((i) => i.item_id === itemId);
    if (existing) {
      setSelectedItems(selectedItems.map((i) => i.item_id === itemId ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setSelectedItems([...selectedItems, { item_id: item.item_id, name: item.name, rate: item.rate, quantity: 1, description: item.description || "" }]);
    }
  };

  const handleRemoveItem = (itemId) => { setSelectedItems(selectedItems.filter((i) => i.item_id !== itemId)); };

  const handleQuantityChange = (itemId, quantity) => {
    setSelectedItems(selectedItems.map((i) => i.item_id === itemId ? { ...i, quantity: Math.max(1, quantity) } : i));
  };

  const calculateSubtotal = () => selectedItems.reduce((sum, item) => sum + item.rate * item.quantity, 0);
  const calculateTotal = () => calculateSubtotal() + parseFloat(tax || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCustomer || selectedItems.length === 0 || !dueDate) {
      toast.error("Please fill all required fields");
      return;
    }
    try {
      const res = await axios.post(`${API}/invoices`, {
        customer_id: selectedCustomer,
        order_number: orderNumber || null,
        items: selectedItems.map((i) => ({ item_id: i.item_id, quantity: i.quantity })),
        due_date: new Date(dueDate).toISOString(),
        tax: parseFloat(tax || 0),
        notes: notes || null,
      }, { withCredentials: true });
      toast.success("Invoice created successfully");
      setIsDialogOpen(false);
      await fetchData();
      setSelectedInvoice(res.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create invoice");
    }
  };

  // ======================== INVOICE ACTIONS ========================

  const handleStatusChange = async (invoice, status) => {
    try {
      const res = await axios.put(`${API}/invoices/${invoice.invoice_id}`, { status }, { withCredentials: true });
      toast.success(`Invoice marked as ${status}`);
      await fetchData();
      setSelectedInvoice(res.data);
    } catch (error) {
      toast.error("Failed to update invoice");
    }
  };

  const handleDelete = async (invoice) => {
    if (!window.confirm(`Delete invoice ${invoice.invoice_number}?`)) return;
    try {
      await axios.delete(`${API}/invoices/${invoice.invoice_id}`, { withCredentials: true });
      toast.success("Invoice deleted");
      setSelectedInvoice(null);
      fetchData();
    } catch (error) {
      toast.error("Failed to delete invoice");
    }
  };

  const handleRecordPayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error("Enter a valid payment amount");
      return;
    }
    try {
      const res = await axios.post(`${API}/invoices/${selectedInvoice.invoice_id}/record-payment`, {
        amount: parseFloat(paymentAmount),
        payment_mode: paymentMode,
        reference: paymentReference || null,
      }, { withCredentials: true });
      toast.success("Payment recorded");
      setShowPaymentModal(false);
      setPaymentAmount("");
      setPaymentReference("");
      await fetchData();
      setSelectedInvoice(res.data);
    } catch (error) {
      toast.error("Failed to record payment");
    }
  };

  // ======================== EDIT INVOICE ========================

  const startEdit = (inv) => {
    setEditForm({
      customer_id: inv.customer_id,
      invoice_number: inv.invoice_number,
      order_number: inv.order_number || "",
      due_date: inv.due_date ? new Date(inv.due_date).toISOString().split("T")[0] : "",
      items: inv.items.map(i => ({ ...i })),
      discount: inv.discount || 0,
      discount_type: inv.discount_type || "flat",
      tax: inv.tax || 0,
      tax_type: inv.tax_type || "flat",
      notes: inv.notes || "",
    });
    setEditMode(true);
  };

  const cancelEdit = () => { setEditMode(false); setEditForm(null); };

  const editSubtotal = () => (editForm?.items || []).reduce((s, i) => s + (i.rate || 0) * (i.quantity || 0), 0);

  const editDiscountAmount = () => {
    const sub = editSubtotal();
    return editForm?.discount_type === "percent" ? sub * (editForm?.discount || 0) / 100 : (editForm?.discount || 0);
  };

  const editTaxAmount = () => {
    const afterDisc = editSubtotal() - editDiscountAmount();
    return editForm?.tax_type === "percent" ? afterDisc * (editForm?.tax || 0) / 100 : (editForm?.tax || 0);
  };

  const editTotal = () => editSubtotal() - editDiscountAmount() + editTaxAmount();

  const editUpdateItem = (idx, field, value) => {
    const updated = [...editForm.items];
    updated[idx] = { ...updated[idx], [field]: field === "name" ? value : Number(value) || 0 };
    setEditForm({ ...editForm, items: updated });
  };

  const editAddRow = () => {
    setEditForm({ ...editForm, items: [...editForm.items, { item_id: "", name: "", rate: 0, quantity: 1 }] });
  };

  const editRemoveRow = (idx) => {
    setEditForm({ ...editForm, items: editForm.items.filter((_, i) => i !== idx) });
  };

  const editAddFromCatalog = (itemId) => {
    const item = items.find(i => i.item_id === itemId);
    if (!item) return;
    setEditForm({ ...editForm, items: [...editForm.items, { item_id: item.item_id, name: item.name, rate: item.rate, quantity: 1 }] });
  };

  const handleSaveEdit = async () => {
    if (!editForm.items.length) { toast.error("Add at least one item"); return; }
    setEditSaving(true);
    try {
      const res = await axios.put(`${API}/invoices/${selectedInvoice.invoice_id}`, {
        customer_id: editForm.customer_id,
        invoice_number: editForm.invoice_number,
        order_number: editForm.order_number || null,
        due_date: editForm.due_date ? new Date(editForm.due_date).toISOString() : undefined,
        items: editForm.items.map(i => ({ item_id: i.item_id, name: i.name, rate: i.rate, quantity: i.quantity })),
        discount: editForm.discount,
        discount_type: editForm.discount_type,
        tax: editForm.tax,
        tax_type: editForm.tax_type,
        notes: editForm.notes || null,
      }, { withCredentials: true });
      toast.success("Invoice updated");
      setEditMode(false);
      setEditForm(null);
      await fetchData();
      setSelectedInvoice(res.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update invoice");
    } finally {
      setEditSaving(false);
    }
  };

  // ======================== CUSTOMIZATION HANDLERS ========================

  const handleSaveTemplate = async () => {
    try {
      const response = await axios.put(`${API}/auth/profile`, { invoice_template: selectedTemplate }, { withCredentials: true });
      setUser(response.data);
      toast.success("Template saved");
      setShowTemplateModal(false);
    } catch (error) { toast.error("Failed to save template"); }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 500000) { toast.error("Logo must be less than 500KB"); return; }
      const reader = new FileReader();
      reader.onloadend = () => { setLogoPreview(reader.result); };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveLogo = async () => {
    try {
      const response = await axios.put(`${API}/auth/profile`, { invoice_logo: logoPreview }, { withCredentials: true });
      setUser(response.data);
      toast.success("Logo saved");
      setShowLogoModal(false);
    } catch (error) { toast.error("Failed to save logo"); }
  };

  const handleSaveTerms = async () => {
    try {
      const response = await axios.put(`${API}/auth/profile`, { invoice_terms: termsText }, { withCredentials: true });
      setUser(response.data);
      toast.success("Terms saved");
      setShowTermsModal(false);
    } catch (error) { toast.error("Failed to save terms"); }
  };

  const addCustomField = () => setCustomFields([...customFields, { label: "", value: "" }]);
  const updateCustomField = (index, field, value) => { const updated = [...customFields]; updated[index][field] = value; setCustomFields(updated); };
  const removeCustomField = (index) => setCustomFields(customFields.filter((_, i) => i !== index));

  const handleSaveCustomFields = async () => {
    try {
      const response = await axios.put(`${API}/auth/profile`, { invoice_custom_fields: customFields.filter(f => f.label && f.value) }, { withCredentials: true });
      setUser(response.data);
      toast.success("Custom fields saved");
      setShowCustomFieldsModal(false);
    } catch (error) { toast.error("Failed to save custom fields"); }
  };

  // ======================== PDF GENERATION ========================

  const generatePDF = (invoice) => {
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.width;
    const m = 20; // margin
    const cw = pw - 2 * m; // content width
    const isOverdue = invoice.status === "Overdue";
    const isPaid = invoice.status === "Paid";

    // Derive computed discount/tax amounts
    const discType = invoice.discount_type || "flat";
    const discVal = invoice.discount || 0;
    const taxType = invoice.tax_type || "flat";
    const taxVal = invoice.tax || 0;
    const discountAmt = discType === "percent" ? invoice.subtotal * discVal / 100 : discVal;
    const afterDisc = invoice.subtotal - discountAmt;
    const taxAmt = taxType === "percent" ? afterDisc * taxVal / 100 : taxVal;

    let y = 20;

    // ---- Header: Logo + Business info left, TAX INVOICE right ----
    if (user?.org_logo || user?.invoice_logo) {
      try { doc.addImage(user.org_logo || user.invoice_logo, 'PNG', m, y, 28, 28); } catch (e) { /* skip */ }
      y += 32;
    }
    doc.setFont("helvetica", "bold"); doc.setFontSize(13);
    doc.text(user?.business_name || user?.name || "Your Business", m, y);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(120, 120, 120);
    const addressParts = [user?.street1, user?.street2, user?.city, user?.state, user?.pin_code].filter(Boolean);
    const fullAddr = addressParts.length > 0 ? addressParts.join(", ") : user?.business_address;
    if (fullAddr) { y += 5; doc.text(fullAddr, m, y); }
    if (user?.business_email || user?.email) { y += 4; doc.text(user?.business_email || user?.email, m, y); }
    if (user?.business_phone) { y += 4; doc.text(user.business_phone, m, y); }
    doc.setTextColor(0, 0, 0);

    // Right side: TAX INVOICE title
    doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.setTextColor(40, 40, 40);
    doc.text("TAX INVOICE", pw - m, 25, { align: "right" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(120, 120, 120);
    doc.text(invoice.invoice_number, pw - m, 33, { align: "right" });
    if (invoice.order_number) { doc.text(`Order: ${invoice.order_number}`, pw - m, 39, { align: "right" }); }
    doc.setTextColor(0, 0, 0);

    // ---- Separator line ----
    y += 8;
    doc.setDrawColor(230, 230, 230); doc.line(m, y, pw - m, y);
    y += 8;

    // ---- Bill To (left) + Invoice Meta (right) ----
    doc.setFontSize(7); doc.setTextColor(160, 160, 160); doc.setFont("helvetica", "bold");
    doc.text("BILL TO", m, y);
    doc.setTextColor(29, 78, 216); doc.setFontSize(10); doc.setFont("helvetica", "bold");
    doc.text(invoice.customer_name, m, y + 6);
    doc.setTextColor(120, 120, 120); doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    let billY = y + 11;
    if (invoice.customer_address) { doc.text(invoice.customer_address, m, billY); billY += 4; }
    doc.text(invoice.customer_email, m, billY); billY += 4;
    if (invoice.customer_gst) { doc.text(`GST: ${invoice.customer_gst}`, m, billY); }

    // Right meta
    doc.setTextColor(160, 160, 160); doc.setFontSize(8);
    const metaX = pw - m;
    doc.text("Invoice Date", metaX - 50, y); doc.setTextColor(60, 60, 60); doc.text(formatDate(invoice.issue_date), metaX, y, { align: "right" });
    doc.setTextColor(160, 160, 160);
    doc.text("Due Date", metaX - 50, y + 6); doc.setTextColor(isOverdue ? 234 : 60, isOverdue ? 88 : 60, isOverdue ? 12 : 60); doc.text(formatDate(invoice.due_date), metaX, y + 6, { align: "right" });
    doc.setTextColor(160, 160, 160);
    doc.text("Status", metaX - 50, y + 12); doc.setTextColor(isOverdue ? 185 : isPaid ? 16 : 29, isOverdue ? 28 : isPaid ? 128 : 78, isOverdue ? 28 : isPaid ? 61 : 216);
    doc.setFont("helvetica", "bold"); doc.text(invoice.status, metaX, y + 12, { align: "right" });

    // Balance Due highlight
    doc.setDrawColor(230, 230, 230); doc.line(metaX - 55, y + 17, metaX, y + 17);
    doc.setTextColor(160, 160, 160); doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    doc.text("Balance Due", metaX - 50, y + 24);
    doc.setFont("helvetica", "bold"); doc.setFontSize(16);
    doc.setTextColor(isOverdue ? 185 : isPaid ? 16 : 0, isOverdue ? 28 : isPaid ? 128 : 0, isOverdue ? 28 : isPaid ? 61 : 0);
    doc.text(formatCurrencyPDF(invoice.balance_due), metaX, y + 25, { align: "right" });
    doc.setTextColor(0, 0, 0);

    // ---- Items Table ----
    y = Math.max(billY, y + 30) + 12;
    // Table header (dark bg)
    const cols = [12, null, 18, 28, 32]; // #, name(flex), qty, rate, amount
    const nameW = cw - cols[0] - cols[2] - cols[3] - cols[4];
    cols[1] = nameW;
    doc.setFillColor(31, 41, 55); doc.rect(m, y, cw, 9, 'F');
    doc.setTextColor(255, 255, 255); doc.setFontSize(7); doc.setFont("helvetica", "bold");
    let cx = m + 3;
    doc.text("#", cx, y + 6); cx += cols[0];
    doc.text("Item & Description", cx, y + 6); cx += cols[1];
    doc.text("Qty", cx + cols[2] / 2, y + 6, { align: "center" }); cx += cols[2];
    doc.text("Rate", cx + cols[3] - 2, y + 6, { align: "right" }); cx += cols[3];
    doc.text("Amount", cx + cols[4] - 2, y + 6, { align: "right" });
    doc.setTextColor(0, 0, 0); y += 9;

    // Table rows
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    invoice.items.forEach((item, i) => {
      const rowY = y + 7;
      cx = m + 3;
      doc.setTextColor(160, 160, 160); doc.text((i + 1).toString(), cx, rowY); cx += cols[0];
      doc.setTextColor(40, 40, 40); doc.setFont("helvetica", "bold"); doc.text(item.name, cx, rowY); doc.setFont("helvetica", "normal"); cx += cols[1];
      doc.setTextColor(80, 80, 80); doc.text(item.quantity.toString(), cx + cols[2] / 2, rowY, { align: "center" }); cx += cols[2];
      doc.text(formatCurrencyPDF(item.rate), cx + cols[3] - 2, rowY, { align: "right" }); cx += cols[3];
      doc.setFont("helvetica", "bold"); doc.text(formatCurrencyPDF(item.rate * item.quantity), cx + cols[4] - 2, rowY, { align: "right" });
      doc.setFont("helvetica", "normal");
      y += 10;
      doc.setDrawColor(240, 240, 240); doc.line(m, y, pw - m, y);
    });

    // ---- Totals (right-aligned block) ----
    y += 8;
    const totX = pw - m;
    const totLabelX = totX - 60;
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(80, 80, 80);
    doc.text("Sub Total", totLabelX, y); doc.text(formatCurrencyPDF(invoice.subtotal), totX, y, { align: "right" });
    y += 7;

    if (discountAmt > 0) {
      doc.setTextColor(220, 38, 38);
      const discLabel = discType === "percent" ? `Discount (${discVal}%)` : "Discount";
      doc.text(discLabel, totLabelX, y); doc.text(`-${formatCurrencyPDF(discountAmt)}`, totX, y, { align: "right" });
      y += 7; doc.setTextColor(80, 80, 80);
    }

    if (taxAmt > 0) {
      const taxLabel = taxType === "percent" ? `Tax (${taxVal}%)` : "Tax";
      doc.text(taxLabel, totLabelX, y); doc.text(formatCurrencyPDF(taxAmt), totX, y, { align: "right" });
      y += 7;
    }

    doc.setDrawColor(200, 200, 200); doc.line(totLabelX - 2, y - 2, totX, y - 2);
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(40, 40, 40);
    doc.text("Total", totLabelX, y + 3); doc.text(formatCurrencyPDF(invoice.total), totX, y + 3, { align: "right" });
    y += 10;

    if ((invoice.amount_paid || 0) > 0) {
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(16, 128, 61);
      doc.text("Amount Paid", totLabelX, y); doc.text(`-${formatCurrencyPDF(invoice.amount_paid)}`, totX, y, { align: "right" });
      y += 7;
    }

    doc.setDrawColor(200, 200, 200); doc.line(totLabelX - 2, y - 2, totX, y - 2);
    doc.setFont("helvetica", "bold"); doc.setFontSize(11);
    doc.setTextColor(isOverdue ? 185 : isPaid ? 16 : 0, isOverdue ? 28 : isPaid ? 128 : 0, isOverdue ? 28 : isPaid ? 61 : 0);
    doc.text("Balance Due", totLabelX, y + 3); doc.text(formatCurrencyPDF(invoice.balance_due), totX, y + 3, { align: "right" });
    doc.setTextColor(0, 0, 0);

    // ---- Amount in words ----
    y += 15;
    doc.setFont("helvetica", "italic"); doc.setFontSize(8); doc.setTextColor(160, 160, 160);
    doc.text(`Total In Words: ${numberToWords(Math.round(invoice.total))}`, m, y);

    // ---- Custom fields ----
    if (user?.invoice_custom_fields?.length > 0) {
      y += 10; doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(120, 120, 120);
      doc.text("Additional Information", m, y); doc.setFont("helvetica", "normal"); doc.setTextColor(60, 60, 60); y += 5;
      user.invoice_custom_fields.forEach(f => { doc.text(`${f.label}: ${f.value}`, m, y); y += 4; });
    }

    // ---- Notes / Terms ----
    if (invoice.notes) {
      y += 8; doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(120, 120, 120);
      doc.text("Notes", m, y); doc.setFont("helvetica", "normal"); doc.setTextColor(60, 60, 60); y += 5;
      const noteLines = doc.splitTextToSize(invoice.notes, cw);
      doc.text(noteLines, m, y); y += noteLines.length * 4;
    }
    if (user?.invoice_terms) {
      y += 6; doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(120, 120, 120);
      doc.text("Terms & Conditions", m, y); doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(100, 100, 100); y += 5;
      const termLines = doc.splitTextToSize(user.invoice_terms, cw);
      doc.text(termLines, m, y);
    }

    doc.save(`${invoice.invoice_number}.pdf`);
    toast.success("PDF downloaded");
  };

  // ======================== RENDER ========================

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-700"></div>
        </div>
      </Layout>
    );
  }

  const daysOverdue = (inv) => {
    const due = new Date(inv.due_date);
    const now = new Date();
    return Math.floor((now - due) / (1000 * 60 * 60 * 24));
  };

  return (
    <Layout>
      <div data-testid="invoices-page">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Invoices</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage and track all your invoices</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleOpenDialog} className="bg-[#1d4ed8] hover:bg-[#1e40af]" size="sm" data-testid="create-invoice-btn">
              <Plus className="w-4 h-4 mr-1.5" /> New Invoice
            </Button>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 mb-4 border-b border-gray-200 pb-0" data-testid="status-filter-tabs">
          {["All", "Draft", "Sent", "Overdue", "Paid"].map((s) => {
            const count = s === "All" ? invoices.length : invoices.filter(i => i.status === s).length;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${statusFilter === s ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                data-testid={`filter-${s.toLowerCase()}`}
              >
                {s} {count > 0 && <span className="ml-1 text-xs bg-gray-100 text-gray-600 rounded-full px-1.5 py-0.5">{count}</span>}
              </button>
            );
          })}
          <div className="ml-auto flex items-center gap-2 pb-1">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-400" />
              <Input
                placeholder="Search invoices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 w-52 text-sm"
                data-testid="search-invoices"
              />
            </div>
          </div>
        </div>

        {/* Split Panel Layout */}
        <div className="flex gap-0 border border-gray-200 rounded-lg overflow-hidden bg-white" style={{ height: "calc(100vh - 230px)" }}>
          {/* LEFT PANEL - Invoice List */}
          <div className="w-[480px] min-w-[480px] border-r border-gray-200 flex flex-col" data-testid="invoice-list-panel">
            {filteredInvoices.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
                <FileText className="w-12 h-12 mb-3 opacity-40" />
                <p className="font-medium text-gray-500">No invoices found</p>
                <p className="text-sm">Create your first invoice to get started</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto">
                {filteredInvoices.map((inv) => {
                  const isSelected = selectedInvoice?.invoice_id === inv.invoice_id;
                  const isOverdue = inv.status === "Overdue";
                  return (
                    <div
                      key={inv.invoice_id}
                      onClick={() => { setSelectedInvoice(inv); setEditMode(false); setEditForm(null); }}
                      className={`px-4 py-3 border-b border-gray-100 cursor-pointer transition-colors ${isSelected ? "bg-blue-50 border-l-[3px] border-l-blue-600" : "hover:bg-gray-50 border-l-[3px] border-l-transparent"}`}
                      data-testid={`invoice-row-${inv.invoice_id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900">{inv.customer_name}</span>
                            {getStatusBadge(inv.status)}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <span className="font-mono">{inv.invoice_number}</span>
                            {inv.order_number && <span>Order: {inv.order_number}</span>}
                            <span>{formatDate(inv.issue_date)}</span>
                          </div>
                        </div>
                        <div className="text-right ml-3 shrink-0">
                          <div className="text-sm font-bold font-mono text-gray-900">{formatCurrency(inv.total)}</div>
                          {inv.balance_due > 0 && inv.balance_due !== inv.total && (
                            <div className={`text-xs font-mono ${isOverdue ? "text-red-600 font-semibold" : "text-gray-500"}`}>
                              Bal: {formatCurrency(inv.balance_due)}
                            </div>
                          )}
                          {isOverdue && (
                            <div className="text-[10px] text-orange-600 font-semibold mt-0.5">{daysOverdue(inv)} days overdue</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
                        <span>Due: <span className={isOverdue ? "text-orange-600 font-medium" : ""}>{formatDate(inv.due_date)}</span></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT PANEL - Invoice Detail */}
          <div className="flex-1 flex flex-col overflow-hidden" data-testid="invoice-detail-panel">
            {selectedInvoice ? (
              <div className="flex-1 overflow-y-auto">
                {/* WHAT'S NEXT Banner for overdue */}
                {!editMode && selectedInvoice.status === "Overdue" && (
                  <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-200 px-6 py-3" data-testid="whats-next-banner">
                    <div className="flex items-center gap-3">
                      <div className="bg-orange-100 rounded-full p-1.5"><AlertTriangle className="w-4 h-4 text-orange-600" /></div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-orange-800">WHAT'S NEXT?</p>
                        <p className="text-xs text-orange-600">This invoice is {daysOverdue(selectedInvoice)} days overdue. Send a reminder or record payment.</p>
                      </div>
                      <Button size="sm" variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-100" onClick={() => { setShowPaymentModal(true); setPaymentAmount(String(selectedInvoice.balance_due)); }}>
                        <CreditCard className="w-3.5 h-3.5 mr-1.5" /> Record Payment
                      </Button>
                    </div>
                  </div>
                )}

                {/* Action Bar */}
                <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 bg-gray-50/50">
                  {editMode ? (
                    <>
                      <div className="text-sm font-semibold text-gray-700">Editing: {selectedInvoice.invoice_number}</div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={cancelEdit} data-testid="cancel-edit-btn"><X className="w-3.5 h-3.5 mr-1.5" /> Cancel</Button>
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSaveEdit} disabled={editSaving} data-testid="save-edit-btn">
                          <Save className="w-3.5 h-3.5 mr-1.5" /> {editSaving ? "Saving..." : "Save"}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => startEdit(selectedInvoice)} data-testid="edit-invoice-btn">
                          <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit
                        </Button>
                        {selectedInvoice.status === "Draft" && (
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => handleStatusChange(selectedInvoice, "Sent")} data-testid="mark-sent-btn">
                            <Send className="w-3.5 h-3.5 mr-1.5" /> Mark as Sent
                          </Button>
                        )}
                        {selectedInvoice.status !== "Paid" && (
                          <Button size="sm" variant="outline" onClick={() => { setShowPaymentModal(true); setPaymentAmount(String(selectedInvoice.balance_due)); }} data-testid="record-payment-btn">
                            <CreditCard className="w-3.5 h-3.5 mr-1.5" /> Record Payment
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => generatePDF(selectedInvoice)} data-testid="download-pdf-btn">
                          <Download className="w-3.5 h-3.5 mr-1.5" /> PDF
                        </Button>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" data-testid="invoice-more-actions"><MoreHorizontal className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {selectedInvoice.status !== "Paid" && (
                            <DropdownMenuItem onClick={() => handleStatusChange(selectedInvoice, "Paid")}><CheckCircle className="w-4 h-4 mr-2" />Mark as Paid</DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => handleDelete(selectedInvoice)} className="text-red-600"><Trash2 className="w-4 h-4 mr-2" />Delete Invoice</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </>
                  )}
                </div>

                {editMode && editForm ? (
                  /* =================== EDIT FORM =================== */
                  <div className="p-6 space-y-5" data-testid="edit-invoice-form">
                    {/* Customer + Invoice # */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-gray-500 mb-1">Customer</Label>
                        <Select value={editForm.customer_id} onValueChange={(v) => setEditForm({ ...editForm, customer_id: v })}>
                          <SelectTrigger data-testid="edit-customer-select"><SelectValue placeholder="Select customer" /></SelectTrigger>
                          <SelectContent>
                            {customers.map((c) => (
                              <SelectItem key={c.customer_id} value={c.customer_id}>
                                {c.display_name || c.name || `${c.first_name || ""} ${c.last_name || ""}`.trim()} ({c.company || c.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500 mb-1">Invoice #</Label>
                        <Input value={editForm.invoice_number} onChange={(e) => setEditForm({ ...editForm, invoice_number: e.target.value })} data-testid="edit-invoice-number" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-gray-500 mb-1">Order Number</Label>
                        <Input value={editForm.order_number} onChange={(e) => setEditForm({ ...editForm, order_number: e.target.value })} placeholder="e.g. PO-001" data-testid="edit-order-number" />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500 mb-1">Due Date</Label>
                        <Input type="date" value={editForm.due_date} onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })} data-testid="edit-due-date" />
                      </div>
                    </div>

                    {/* Items Table */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-xs text-gray-500">Items</Label>
                        <div className="flex gap-2">
                          <Select onValueChange={editAddFromCatalog} value="">
                            <SelectTrigger className="h-7 text-xs w-44" data-testid="edit-add-catalog-item"><SelectValue placeholder="Add from catalog" /></SelectTrigger>
                            <SelectContent>
                              {items.map((item) => (
                                <SelectItem key={item.item_id} value={item.item_id}>{item.name} - {formatCurrency(item.rate)}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={editAddRow} data-testid="edit-add-row-btn">
                            <Plus className="w-3 h-3 mr-1" /> Add Row
                          </Button>
                        </div>
                      </div>
                      <div className="border rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="text-left p-2.5 text-xs font-medium text-gray-500">Item Name</th>
                              <th className="text-center p-2.5 text-xs font-medium text-gray-500 w-20">Qty</th>
                              <th className="text-right p-2.5 text-xs font-medium text-gray-500 w-28">Rate (₹)</th>
                              <th className="text-right p-2.5 text-xs font-medium text-gray-500 w-28">Amount</th>
                              <th className="w-8"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {editForm.items.map((item, idx) => (
                              <tr key={idx} className="border-t border-gray-100">
                                <td className="p-2"><Input value={item.name} onChange={(e) => editUpdateItem(idx, "name", e.target.value)} className="h-8 text-sm" data-testid={`edit-item-name-${idx}`} /></td>
                                <td className="p-2"><Input type="number" min="1" value={item.quantity} onChange={(e) => editUpdateItem(idx, "quantity", e.target.value)} className="h-8 text-sm text-center" data-testid={`edit-item-qty-${idx}`} /></td>
                                <td className="p-2"><Input type="number" min="0" step="0.01" value={item.rate} onChange={(e) => editUpdateItem(idx, "rate", e.target.value)} className="h-8 text-sm text-right" data-testid={`edit-item-rate-${idx}`} /></td>
                                <td className="p-2 text-right font-mono text-sm font-medium text-gray-700">{formatCurrency((item.rate || 0) * (item.quantity || 0))}</td>
                                <td className="p-2"><Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-600" onClick={() => editRemoveRow(idx)} data-testid={`edit-remove-row-${idx}`}><X className="w-3.5 h-3.5" /></Button></td>
                              </tr>
                            ))}
                            {editForm.items.length === 0 && (
                              <tr><td colSpan={5} className="p-4 text-center text-gray-400 text-sm">No items — add a row or pick from catalog</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Discount + Tax */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <Label className="text-xs text-gray-500">Discount</Label>
                          <button
                            type="button"
                            onClick={() => setEditForm({ ...editForm, discount_type: editForm.discount_type === "flat" ? "percent" : "flat" })}
                            className={`text-[10px] px-2 py-0.5 rounded-full border font-medium transition-colors ${editForm.discount_type === "percent" ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}
                            data-testid="edit-discount-type-toggle"
                          >
                            {editForm.discount_type === "percent" ? "%" : "₹ Flat"}
                          </button>
                        </div>
                        <Input type="number" min="0" step="0.01" value={editForm.discount} onChange={(e) => setEditForm({ ...editForm, discount: parseFloat(e.target.value) || 0 })} data-testid="edit-discount-input" />
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <Label className="text-xs text-gray-500">Tax</Label>
                          <button
                            type="button"
                            onClick={() => setEditForm({ ...editForm, tax_type: editForm.tax_type === "flat" ? "percent" : "flat" })}
                            className={`text-[10px] px-2 py-0.5 rounded-full border font-medium transition-colors ${editForm.tax_type === "percent" ? "bg-blue-50 text-blue-600 border-blue-200" : "bg-gray-50 text-gray-500 border-gray-200"}`}
                            data-testid="edit-tax-type-toggle"
                          >
                            {editForm.tax_type === "percent" ? "%" : "₹ Flat"}
                          </button>
                        </div>
                        <Input type="number" min="0" step="0.01" value={editForm.tax} onChange={(e) => setEditForm({ ...editForm, tax: parseFloat(e.target.value) || 0 })} data-testid="edit-tax-input" />
                      </div>
                    </div>

                    {/* Totals */}
                    <div className="bg-gray-50 rounded-lg p-4 space-y-1.5">
                      <div className="flex justify-between text-sm text-gray-600"><span>Sub Total</span><span className="font-mono">{formatCurrency(editSubtotal())}</span></div>
                      {editDiscountAmount() > 0 && (
                        <div className="flex justify-between text-sm text-red-500"><span>Discount {editForm.discount_type === "percent" ? `(${editForm.discount}%)` : ""}</span><span className="font-mono">-{formatCurrency(editDiscountAmount())}</span></div>
                      )}
                      {editTaxAmount() > 0 && (
                        <div className="flex justify-between text-sm text-gray-600"><span>Tax {editForm.tax_type === "percent" ? `(${editForm.tax}%)` : ""}</span><span className="font-mono">+{formatCurrency(editTaxAmount())}</span></div>
                      )}
                      <div className="flex justify-between text-base font-extrabold text-gray-900 pt-2 border-t border-gray-200"><span>Total</span><span className="font-mono">{formatCurrency(editTotal())}</span></div>
                      <div className="flex justify-between text-sm text-gray-500"><span>Balance Due</span><span className="font-mono">{formatCurrency(Math.max(0, editTotal() - (selectedInvoice.amount_paid || 0)))}</span></div>
                    </div>

                    {/* Notes */}
                    <div>
                      <Label className="text-xs text-gray-500 mb-1">Notes</Label>
                      <Textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={3} placeholder="Additional notes..." data-testid="edit-notes" />
                    </div>

                    {/* Customize */}
                    <div className="pt-1">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button type="button" variant="outline" size="sm" data-testid="edit-customize-btn">
                            <Settings2 className="w-4 h-4 mr-1.5" /> Customize Invoice
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-56">
                          <DropdownMenuItem onClick={() => setShowTemplateModal(true)}><Palette className="w-4 h-4 mr-2" />Change Template</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setShowTemplateModal(true)}><FileEdit className="w-4 h-4 mr-2" />Edit Template</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setShowLogoModal(true)}><Image className="w-4 h-4 mr-2" />Update Logo</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setShowCustomFieldsModal(true)}><List className="w-4 h-4 mr-2" />Custom Fields</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setShowTermsModal(true)}><ScrollText className="w-4 h-4 mr-2" />Terms & Conditions</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ) : (
                  /* =================== VIEW MODE =================== */
                  <div className="p-6">
                  <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                    {/* Invoice Header */}
                    <div className="p-6 border-b border-gray-100">
                      <div className="flex justify-between items-start">
                        <div>
                          {(user?.org_logo || user?.invoice_logo) && (
                            <img src={user.org_logo || user.invoice_logo} alt="Logo" className="h-10 mb-3 object-contain" />
                          )}
                          <h3 className="font-bold text-lg text-gray-900">{user?.business_name || user?.name}</h3>
                          {user?.business_address && <p className="text-sm text-gray-500 mt-0.5">{user.business_address}</p>}
                          {(user?.business_email || user?.email) && <p className="text-sm text-gray-500">{user?.business_email || user?.email}</p>}
                          {user?.business_phone && <p className="text-sm text-gray-500">{user.business_phone}</p>}
                        </div>
                        <div className="text-right">
                          <h2 className="text-2xl font-extrabold text-gray-800 tracking-tight">TAX INVOICE</h2>
                          <p className="text-sm font-mono text-gray-500 mt-1">{selectedInvoice.invoice_number}</p>
                          {selectedInvoice.order_number && (
                            <p className="text-xs text-gray-400 mt-0.5">Order: {selectedInvoice.order_number}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bill To + Invoice Meta */}
                    <div className="grid grid-cols-2 gap-6 p-6 border-b border-gray-100">
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Bill To</p>
                        <p className="text-sm font-bold text-blue-700">{selectedInvoice.customer_name}</p>
                        {selectedInvoice.customer_address && <p className="text-xs text-gray-500 mt-0.5">{selectedInvoice.customer_address}</p>}
                        <p className="text-xs text-gray-500">{selectedInvoice.customer_email}</p>
                        {selectedInvoice.customer_gst && <p className="text-xs text-gray-500 mt-1">GST: {selectedInvoice.customer_gst}</p>}
                      </div>
                      <div className="text-right space-y-1">
                        <div className="flex justify-end gap-8 text-xs">
                          <span className="text-gray-400">Invoice Date</span>
                          <span className="text-gray-700 font-medium">{formatDate(selectedInvoice.issue_date)}</span>
                        </div>
                        <div className="flex justify-end gap-8 text-xs">
                          <span className="text-gray-400">Due Date</span>
                          <span className={`font-medium ${selectedInvoice.status === "Overdue" ? "text-orange-600" : "text-gray-700"}`}>{formatDate(selectedInvoice.due_date)}</span>
                        </div>
                        <div className="flex justify-end gap-8 text-xs">
                          <span className="text-gray-400">Status</span>
                          {getStatusBadge(selectedInvoice.status)}
                        </div>
                        <div className="flex justify-end gap-8 items-baseline pt-2 border-t border-gray-100 mt-2">
                          <span className="text-xs text-gray-400">Balance Due</span>
                          <span className={`text-xl font-extrabold font-mono ${selectedInvoice.status === "Overdue" ? "text-red-600" : selectedInvoice.status === "Paid" ? "text-emerald-600" : "text-gray-900"}`}>
                            {formatCurrency(selectedInvoice.balance_due)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Items Table */}
                    <div className="p-6">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-800 text-white text-xs">
                            <th className="text-left py-2.5 px-3 rounded-l font-semibold w-10">#</th>
                            <th className="text-left py-2.5 px-3 font-semibold">Item & Description</th>
                            <th className="text-center py-2.5 px-3 font-semibold w-16">Qty</th>
                            <th className="text-right py-2.5 px-3 font-semibold w-24">Rate</th>
                            <th className="text-right py-2.5 px-3 rounded-r font-semibold w-28">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedInvoice.items.map((item, i) => (
                            <tr key={i} className="border-b border-gray-100 last:border-0">
                              <td className="py-3 px-3 text-gray-400">{i + 1}</td>
                              <td className="py-3 px-3 font-medium text-gray-800">{item.name}</td>
                              <td className="py-3 px-3 text-center text-gray-600">{item.quantity}</td>
                              <td className="py-3 px-3 text-right font-mono text-gray-600">{formatCurrency(item.rate)}</td>
                              <td className="py-3 px-3 text-right font-mono font-semibold text-gray-800">{formatCurrency(item.rate * item.quantity)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Totals */}
                      <div className="mt-4 flex justify-end">
                        <div className="w-64 space-y-2">
                          <div className="flex justify-between text-sm text-gray-600">
                            <span>Sub Total</span>
                            <span className="font-mono">{formatCurrency(selectedInvoice.subtotal)}</span>
                          </div>
                          {(selectedInvoice.discount || 0) > 0 && (
                            <div className="flex justify-between text-sm text-red-500">
                              <span>Discount {selectedInvoice.discount_type === "percent" ? `(${selectedInvoice.discount}%)` : ""}</span>
                              <span className="font-mono">-{formatCurrency(selectedInvoice.discount_type === "percent" ? selectedInvoice.subtotal * selectedInvoice.discount / 100 : selectedInvoice.discount)}</span>
                            </div>
                          )}
                          {selectedInvoice.tax > 0 && (
                            <div className="flex justify-between text-sm text-gray-600">
                              <span>Tax {selectedInvoice.tax_type === "percent" ? `(${selectedInvoice.tax}%)` : ""}</span>
                              <span className="font-mono">{formatCurrency(selectedInvoice.tax_type === "percent" ? (selectedInvoice.subtotal - (selectedInvoice.discount_type === "percent" ? selectedInvoice.subtotal * (selectedInvoice.discount || 0) / 100 : (selectedInvoice.discount || 0))) * selectedInvoice.tax / 100 : selectedInvoice.tax)}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-sm font-bold text-gray-800 pt-2 border-t border-gray-200">
                            <span>Total</span>
                            <span className="font-mono">{formatCurrency(selectedInvoice.total)}</span>
                          </div>
                          {selectedInvoice.amount_paid > 0 && (
                            <div className="flex justify-between text-sm text-emerald-600">
                              <span>Amount Paid</span>
                              <span className="font-mono">-{formatCurrency(selectedInvoice.amount_paid)}</span>
                            </div>
                          )}
                          <div className={`flex justify-between text-base font-extrabold pt-2 border-t border-gray-200 ${selectedInvoice.status === "Overdue" ? "text-red-600" : selectedInvoice.status === "Paid" ? "text-emerald-600" : "text-gray-900"}`}>
                            <span>Balance Due</span>
                            <span className="font-mono">{formatCurrency(selectedInvoice.balance_due)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Notes / Amount in Words */}
                    <div className="px-6 pb-6 space-y-3">
                      <p className="text-xs text-gray-400 italic">Total In Words: {numberToWords(Math.round(selectedInvoice.total))}</p>
                      {selectedInvoice.notes && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500">Notes</p>
                          <p className="text-sm text-gray-600">{selectedInvoice.notes}</p>
                        </div>
                      )}
                      {user?.invoice_terms && (
                        <div>
                          <p className="text-xs font-semibold text-gray-500">Terms & Conditions</p>
                          <p className="text-xs text-gray-500">{user.invoice_terms}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
                <FileText className="w-16 h-16 mb-4 opacity-30" />
                <p className="font-medium text-gray-500">Select an invoice</p>
                <p className="text-sm mt-1">Click on an invoice from the list to view details</p>
              </div>
            )}
          </div>
        </div>

        {/* =================== MODALS =================== */}

        {/* Create Invoice Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Invoice</DialogTitle>
              <DialogDescription>Select a customer and add items to create a new invoice.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Customer *</Label>
                  <Select value={selectedCustomer} onValueChange={handleCustomerSelect}>
                    <SelectTrigger data-testid="select-customer"><SelectValue placeholder="Select a customer" /></SelectTrigger>
                    <SelectContent>
                      {customers.map((customer) => (
                        <SelectItem key={customer.customer_id} value={customer.customer_id}>
                          {customer.display_name || customer.name || `${customer.first_name} ${customer.last_name || ""}`} ({customer.company || customer.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="orderNumber">Order Number</Label>
                  <Input id="orderNumber" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value)} placeholder="e.g. PO-001" data-testid="order-number-input" />
                </div>
              </div>

              {selectedCustomerData && (
                <div className="p-3 bg-gray-50 rounded-lg text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-gray-500 text-xs">Bill To:</span>
                      <p className="font-medium">{selectedCustomerData.display_name || selectedCustomerData.name}</p>
                      {selectedCustomerData.company && <p className="text-gray-600 text-xs">{selectedCustomerData.company}</p>}
                    </div>
                    {selectedCustomerData.gst_number && (
                      <div>
                        <span className="text-gray-500 text-xs">GST Number:</span>
                        <p className="font-mono text-xs font-medium">{selectedCustomerData.gst_number}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <Label>Add Items *</Label>
                <Select onValueChange={handleAddItem} value="">
                  <SelectTrigger data-testid="select-item"><SelectValue placeholder="Select an item to add" /></SelectTrigger>
                  <SelectContent>
                    {items.map((item) => (
                      <SelectItem key={item.item_id} value={item.item_id}>{item.name} - {formatCurrency(item.rate)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedItems.length > 0 && (
                  <div className="mt-3 border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50"><tr><th className="text-left p-2.5 font-medium text-xs">Item</th><th className="text-center p-2.5 font-medium text-xs w-20">Qty</th><th className="text-right p-2.5 font-medium text-xs">Rate</th><th className="text-right p-2.5 font-medium text-xs">Amount</th><th className="w-8"></th></tr></thead>
                      <tbody>
                        {selectedItems.map((item) => (
                          <tr key={item.item_id} className="border-t">
                            <td className="p-2.5 text-sm">{item.name}</td>
                            <td className="p-2.5"><Input type="number" min="1" value={item.quantity} onChange={(e) => handleQuantityChange(item.item_id, parseInt(e.target.value) || 1)} className="w-16 text-center mx-auto h-8 text-sm" /></td>
                            <td className="p-2.5 text-right font-mono text-sm">{formatCurrency(item.rate)}</td>
                            <td className="p-2.5 text-right font-mono font-medium text-sm">{formatCurrency(item.rate * item.quantity)}</td>
                            <td className="p-2.5"><Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveItem(item.item_id)} className="h-7 w-7 p-0"><X className="w-3.5 h-3.5" /></Button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dueDate">Due Date *</Label>
                  <Input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} min={new Date().toISOString().split("T")[0]} required data-testid="due-date-input" />
                </div>
                <div>
                  <Label htmlFor="tax">Tax Amount (₹)</Label>
                  <Input id="tax" type="number" min="0" step="0.01" value={tax} onChange={(e) => setTax(e.target.value)} data-testid="tax-input" />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes for the invoice" rows={2} data-testid="notes-input" />
              </div>

              {selectedItems.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg space-y-1.5">
                  <div className="flex justify-between text-sm"><span>Subtotal</span><span className="font-mono">{formatCurrency(calculateSubtotal())}</span></div>
                  {parseFloat(tax) > 0 && <div className="flex justify-between text-sm"><span>Tax</span><span className="font-mono">{formatCurrency(parseFloat(tax))}</span></div>}
                  <div className="flex justify-between font-semibold text-base pt-2 border-t"><span>Total</span><span className="font-mono">{formatCurrency(calculateTotal())}</span></div>
                </div>
              )}

              <div className="flex justify-between items-center pt-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" size="sm" data-testid="customize-invoice-btn">
                      <Settings2 className="w-4 h-4 mr-1.5" /> Customize
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    <DropdownMenuItem onClick={() => setShowTemplateModal(true)}><Palette className="w-4 h-4 mr-2" />Change Template</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowTemplateModal(true)}><FileEdit className="w-4 h-4 mr-2" />Edit Template</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setShowLogoModal(true)}><Image className="w-4 h-4 mr-2" />Update Logo</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowCustomFieldsModal(true)}><List className="w-4 h-4 mr-2" />Custom Fields</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowTermsModal(true)}><ScrollText className="w-4 h-4 mr-2" />Terms & Conditions</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" className="bg-[#1d4ed8] hover:bg-[#1e40af]" data-testid="save-invoice-btn">Create Invoice</Button>
                </div>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Record Payment Modal */}
        <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
              <DialogDescription>Record a payment for {selectedInvoice?.invoice_number}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Amount (₹) *</Label>
                <Input type="number" min="0" step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="Enter amount" data-testid="payment-amount-input" />
              </div>
              <div>
                <Label>Payment Mode</Label>
                <Select value={paymentMode} onValueChange={setPaymentMode}>
                  <SelectTrigger data-testid="payment-mode-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Bank Transfer", "UPI", "Cash", "Cheque", "Credit Card", "Other"].map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Reference / Transaction ID</Label>
                <Input value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} placeholder="Optional" data-testid="payment-reference-input" />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowPaymentModal(false)}>Cancel</Button>
              <Button onClick={handleRecordPayment} className="bg-emerald-600 hover:bg-emerald-700" data-testid="submit-payment-btn">Record Payment</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Template Picker Modal */}
        <Dialog open={showTemplateModal} onOpenChange={setShowTemplateModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Invoice Template</DialogTitle><DialogDescription>Your invoices use a professional TAX INVOICE layout.</DialogDescription></DialogHeader>
            <div className="py-4">
              <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded flex items-center justify-center">
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">Standard Template</p>
                    <p className="text-xs text-gray-500">Professional TAX INVOICE layout with dark header, Bill To section, and itemized totals</p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">This template is used for all invoice PDFs and previews.</p>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowTemplateModal(false)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Logo Upload Modal */}
        <Dialog open={showLogoModal} onOpenChange={setShowLogoModal}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Update Logo</DialogTitle><DialogDescription>Upload your business logo for invoices.</DialogDescription></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4">
                {logoPreview ? (
                  <div className="relative"><img src={logoPreview} alt="Logo" className="w-20 h-20 object-contain border rounded" /><button onClick={() => setLogoPreview(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">x</button></div>
                ) : (
                  <div className="w-20 h-20 border-2 border-dashed rounded flex items-center justify-center text-gray-400"><Image className="w-8 h-8" /></div>
                )}
                <div><Input type="file" accept="image/*" onChange={handleLogoUpload} data-testid="logo-upload-input" /><p className="text-xs text-gray-500 mt-1">PNG, JPG up to 500KB</p></div>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowLogoModal(false)}>Cancel</Button>
              <Button onClick={handleSaveLogo} className="bg-[#1d4ed8] hover:bg-[#1e40af]">Save Logo</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Terms Modal */}
        <Dialog open={showTermsModal} onOpenChange={setShowTermsModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Terms & Conditions</DialogTitle><DialogDescription>These terms appear on all invoices.</DialogDescription></DialogHeader>
            <Textarea value={termsText} onChange={(e) => setTermsText(e.target.value)} placeholder="Enter your terms..." rows={6} data-testid="terms-textarea" />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowTermsModal(false)}>Cancel</Button>
              <Button onClick={handleSaveTerms} className="bg-[#1d4ed8] hover:bg-[#1e40af]">Save Terms</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Custom Fields Modal */}
        <Dialog open={showCustomFieldsModal} onOpenChange={setShowCustomFieldsModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Custom Fields</DialogTitle><DialogDescription>Add fields to display on invoices (e.g., GST, PAN).</DialogDescription></DialogHeader>
            <div className="py-4 space-y-3">
              {customFields.map((field, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input placeholder="Label" value={field.label} onChange={(e) => updateCustomField(index, "label", e.target.value)} className="flex-1" />
                  <Input placeholder="Value" value={field.value} onChange={(e) => updateCustomField(index, "value", e.target.value)} className="flex-1" />
                  <Button variant="ghost" size="sm" onClick={() => removeCustomField(index)} className="text-red-500"><Trash2 className="w-4 h-4" /></Button>
                </div>
              ))}
              <Button variant="outline" onClick={addCustomField} className="w-full"><Plus className="w-4 h-4 mr-2" />Add Field</Button>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowCustomFieldsModal(false)}>Cancel</Button>
              <Button onClick={handleSaveCustomFields} className="bg-[#1d4ed8] hover:bg-[#1e40af]">Save Fields</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Invoices;
