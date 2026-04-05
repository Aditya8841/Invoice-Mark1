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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
} from "lucide-react";

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
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

const getStatusBadge = (status) => {
  const statusClasses = {
    Draft: "status-draft",
    Sent: "status-sent",
    Overdue: "status-overdue",
    Paid: "status-paid",
  };
  return (
    <span className={`status-badge ${statusClasses[status] || "status-draft"}`}>
      {status}
    </span>
  );
};

// Template Preview Components
const TemplatePreviewStandard = ({ selected }) => (
  <div className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${selected ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
    <div className="bg-white rounded shadow-sm p-2 text-[6px] leading-tight">
      <div className="flex justify-between mb-2">
        <div>
          <div className="font-bold text-[7px]">Company Name</div>
          <div className="text-gray-500">Address Line</div>
        </div>
        <div className="text-right">
          <div className="font-bold text-[8px] text-gray-800">TAX INVOICE</div>
          <div className="text-gray-500">INV-001</div>
        </div>
      </div>
      <div className="flex justify-between mb-2">
        <div>
          <div className="text-gray-500">Bill To:</div>
          <div className="text-blue-600 font-medium">Client Name</div>
        </div>
        <div className="text-right">
          <div className="text-[8px] font-bold">₹10,000</div>
          <div className="text-gray-500">Balance Due</div>
        </div>
      </div>
      <div className="bg-gray-800 text-white p-1 rounded text-[5px] flex">
        <span className="w-4">#</span>
        <span className="flex-1">Item</span>
        <span className="w-6 text-right">Amt</span>
      </div>
      <div className="border-b p-1 flex text-[5px]">
        <span className="w-4">1</span>
        <span className="flex-1">Service</span>
        <span className="w-6 text-right">₹10K</span>
      </div>
      <div className="text-right mt-1 text-[5px]">
        <div>Total: ₹10,000</div>
      </div>
    </div>
    <div className="text-center mt-2 font-medium text-sm">Standard</div>
    <div className="text-center text-xs text-gray-500">Classic professional layout</div>
  </div>
);

const TemplatePreviewModern = ({ selected }) => (
  <div className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${selected ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
    <div className="bg-white rounded shadow-sm overflow-hidden text-[6px] leading-tight">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-2">
        <div className="flex justify-between items-center">
          <div className="w-6 h-6 bg-white/20 rounded"></div>
          <div className="text-right">
            <div className="font-bold text-[8px]">INVOICE</div>
            <div className="text-blue-100">INV-001</div>
          </div>
        </div>
      </div>
      <div className="p-2">
        <div className="flex justify-between mb-2">
          <div>
            <div className="text-gray-500">Billed To</div>
            <div className="font-medium">Client Name</div>
          </div>
          <div className="text-right">
            <div className="text-[8px] font-bold text-blue-600">₹10,000</div>
          </div>
        </div>
        <div className="border rounded p-1 text-[5px]">
          <div className="flex border-b pb-1 font-medium text-gray-600">
            <span className="flex-1">Description</span>
            <span className="w-8 text-right">Amount</span>
          </div>
          <div className="flex pt-1">
            <span className="flex-1">Service Item</span>
            <span className="w-8 text-right">₹10K</span>
          </div>
        </div>
      </div>
    </div>
    <div className="text-center mt-2 font-medium text-sm">Modern</div>
    <div className="text-center text-xs text-gray-500">Clean minimal design</div>
  </div>
);

const TemplatePreviewSpreadsheet = ({ selected }) => (
  <div className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${selected ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
    <div className="bg-white rounded shadow-sm p-2 text-[6px] leading-tight">
      <div className="border-b pb-1 mb-1 flex justify-between">
        <span className="font-bold">INVOICE</span>
        <span>INV-001</span>
      </div>
      <div className="grid grid-cols-2 gap-1 text-[5px] mb-2">
        <div className="border p-1"><span className="text-gray-500">From:</span> Company</div>
        <div className="border p-1"><span className="text-gray-500">To:</span> Client</div>
        <div className="border p-1"><span className="text-gray-500">Date:</span> 01/01/24</div>
        <div className="border p-1"><span className="text-gray-500">Due:</span> 15/01/24</div>
      </div>
      <table className="w-full border text-[5px]">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-0.5 text-left">#</th>
            <th className="border p-0.5 text-left">Item</th>
            <th className="border p-0.5 text-right">Qty</th>
            <th className="border p-0.5 text-right">Rate</th>
            <th className="border p-0.5 text-right">Amt</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="border p-0.5">1</td>
            <td className="border p-0.5">Service</td>
            <td className="border p-0.5 text-right">1</td>
            <td className="border p-0.5 text-right">10K</td>
            <td className="border p-0.5 text-right">10K</td>
          </tr>
        </tbody>
      </table>
      <div className="text-right mt-1 font-bold">Total: ₹10,000</div>
    </div>
    <div className="text-center mt-2 font-medium text-sm">Spreadsheet</div>
    <div className="text-center text-xs text-gray-500">Grid-based layout</div>
  </div>
);

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
    } catch (error) {
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Open dialog with pre-selected customer if coming from customer profile
  useEffect(() => {
    if (location.state?.selectedCustomerId && customers.length > 0 && !loading) {
      const customerId = location.state.selectedCustomerId;
      setSelectedCustomer(customerId);
      handleCustomerSelect(customerId);
      setIsDialogOpen(true);
      // Clear the state so it doesn't re-trigger
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

  const handleOpenDialog = () => {
    setSelectedCustomer("");
    setSelectedCustomerData(null);
    setSelectedItems([]);
    setDueDate("");
    setTax("0");
    setNotes("");
    setIsDialogOpen(true);
  };

  // Auto-fill when customer is selected
  const handleCustomerSelect = (customerId) => {
    setSelectedCustomer(customerId);
    const customer = customers.find(c => c.customer_id === customerId);
    setSelectedCustomerData(customer);
    
    if (customer) {
      // Auto-fill active services as pre-selected items
      if (customer.active_services?.length > 0) {
        const preSelectedItems = [];
        customer.active_services.forEach(itemId => {
          const item = items.find(i => i.item_id === itemId);
          if (item) {
            preSelectedItems.push({
              item_id: item.item_id,
              name: item.name,
              rate: item.rate,
              quantity: 1,
              description: item.description || ""
            });
          }
        });
        if (preSelectedItems.length > 0) {
          setSelectedItems(preSelectedItems);
        }
      }
    }
  };

  const handleAddItem = (itemId) => {
    const item = items.find((i) => i.item_id === itemId);
    if (!item) return;

    const existing = selectedItems.find((i) => i.item_id === itemId);
    if (existing) {
      setSelectedItems(
        selectedItems.map((i) =>
          i.item_id === itemId ? { ...i, quantity: i.quantity + 1 } : i
        )
      );
    } else {
      setSelectedItems([
        ...selectedItems,
        { item_id: item.item_id, name: item.name, rate: item.rate, quantity: 1, description: item.description || "" },
      ]);
    }
  };

  const handleRemoveItem = (itemId) => {
    setSelectedItems(selectedItems.filter((i) => i.item_id !== itemId));
  };

  const handleQuantityChange = (itemId, quantity) => {
    setSelectedItems(
      selectedItems.map((i) =>
        i.item_id === itemId ? { ...i, quantity: Math.max(1, quantity) } : i
      )
    );
  };

  const calculateSubtotal = () => {
    return selectedItems.reduce((sum, item) => sum + item.rate * item.quantity, 0);
  };

  const calculateTotal = () => {
    return calculateSubtotal() + parseFloat(tax || 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedCustomer || selectedItems.length === 0 || !dueDate) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      await axios.post(
        `${API}/invoices`,
        {
          customer_id: selectedCustomer,
          items: selectedItems.map((i) => ({
            item_id: i.item_id,
            quantity: i.quantity,
          })),
          due_date: new Date(dueDate).toISOString(),
          tax: parseFloat(tax || 0),
          notes: notes || null,
        },
        { withCredentials: true }
      );
      toast.success("Invoice created successfully");
      setIsDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to create invoice");
    }
  };

  const handleStatusChange = async (invoice, status) => {
    try {
      await axios.put(
        `${API}/invoices/${invoice.invoice_id}`,
        { status },
        { withCredentials: true }
      );
      toast.success(`Invoice marked as ${status}`);
      fetchData();
    } catch (error) {
      toast.error("Failed to update invoice");
    }
  };

  const handleDelete = async (invoice) => {
    if (!window.confirm(`Delete invoice ${invoice.invoice_number}?`)) return;

    try {
      await axios.delete(`${API}/invoices/${invoice.invoice_id}`, {
        withCredentials: true,
      });
      toast.success("Invoice deleted");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete invoice");
    }
  };

  // Save template preference
  const handleSaveTemplate = async () => {
    try {
      const response = await axios.put(
        `${API}/auth/profile`,
        { invoice_template: selectedTemplate },
        { withCredentials: true }
      );
      setUser(response.data);
      toast.success("Template saved");
      setShowTemplateModal(false);
    } catch (error) {
      toast.error("Failed to save template");
    }
  };

  // Handle logo upload
  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 500000) {
        toast.error("Logo must be less than 500KB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveLogo = async () => {
    try {
      const response = await axios.put(
        `${API}/auth/profile`,
        { invoice_logo: logoPreview },
        { withCredentials: true }
      );
      setUser(response.data);
      toast.success("Logo saved");
      setShowLogoModal(false);
    } catch (error) {
      toast.error("Failed to save logo");
    }
  };

  // Save terms
  const handleSaveTerms = async () => {
    try {
      const response = await axios.put(
        `${API}/auth/profile`,
        { invoice_terms: termsText },
        { withCredentials: true }
      );
      setUser(response.data);
      toast.success("Terms saved");
      setShowTermsModal(false);
    } catch (error) {
      toast.error("Failed to save terms");
    }
  };

  // Custom fields
  const addCustomField = () => {
    setCustomFields([...customFields, { label: "", value: "" }]);
  };

  const updateCustomField = (index, field, value) => {
    const updated = [...customFields];
    updated[index][field] = value;
    setCustomFields(updated);
  };

  const removeCustomField = (index) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const handleSaveCustomFields = async () => {
    try {
      const response = await axios.put(
        `${API}/auth/profile`,
        { invoice_custom_fields: customFields.filter(f => f.label && f.value) },
        { withCredentials: true }
      );
      setUser(response.data);
      toast.success("Custom fields saved");
      setShowCustomFieldsModal(false);
    } catch (error) {
      toast.error("Failed to save custom fields");
    }
  };

  // PDF Generation with Templates
  const generatePDF = (invoice) => {
    const template = user?.invoice_template || "standard";
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const isOverdue = invoice.status === "Overdue";

    if (template === "standard") {
      generateStandardTemplate(doc, invoice, pageWidth, isOverdue);
    } else if (template === "modern") {
      generateModernTemplate(doc, invoice, pageWidth, isOverdue);
    } else {
      generateSpreadsheetTemplate(doc, invoice, pageWidth, isOverdue);
    }

    doc.save(`${invoice.invoice_number}.pdf`);
    toast.success("PDF downloaded");
  };

  const generateStandardTemplate = (doc, invoice, pageWidth, isOverdue) => {
    // Overdue ribbon
    if (isOverdue) {
      doc.setFillColor(234, 88, 12);
      doc.triangle(0, 0, 60, 0, 0, 60, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("OVERDUE", 8, 25, { angle: 45 });
      doc.setTextColor(0, 0, 0);
    }

    // Logo
    if (user?.invoice_logo) {
      try {
        doc.addImage(user.invoice_logo, 'PNG', 20, 15, 30, 30);
      } catch (e) {
        console.log("Logo error:", e);
      }
    }

    // Company info - top left
    let leftY = user?.invoice_logo ? 50 : 20;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(user?.business_name || user?.name || "Your Business", 20, leftY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    if (user?.business_address) {
      leftY += 5;
      const addressLines = user.business_address.split('\n');
      addressLines.forEach(line => {
        doc.text(line, 20, leftY);
        leftY += 4;
      });
    }
    if (user?.business_email || user?.email) {
      doc.text(user?.business_email || user?.email, 20, leftY);
      leftY += 4;
    }
    if (user?.business_phone) {
      doc.text(user.business_phone, 20, leftY);
    }

    // TAX INVOICE - top right
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("TAX INVOICE", pageWidth - 20, 25, { align: "right" });
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(invoice.invoice_number, pageWidth - 20, 33, { align: "right" });

    // Balance Due - top right
    doc.setFontSize(10);
    doc.text("Balance Due", pageWidth - 20, 45, { align: "right" });
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(isOverdue ? 185 : 0, isOverdue ? 28 : 0, isOverdue ? 28 : 0);
    doc.text(formatCurrency(invoice.balance_due), pageWidth - 20, 53, { align: "right" });
    doc.setTextColor(0, 0, 0);

    // Invoice details - right aligned
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Invoice Date: ${formatDate(invoice.issue_date)}`, pageWidth - 20, 65, { align: "right" });
    doc.text(`Terms: Due on Receipt`, pageWidth - 20, 71, { align: "right" });
    doc.text(`Due Date: ${formatDate(invoice.due_date)}`, pageWidth - 20, 77, { align: "right" });

    // Bill To
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text("Bill To", 20, 75);
    doc.setTextColor(29, 78, 216);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(invoice.customer_name, 20, 82);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    if (invoice.customer_address) {
      doc.text(invoice.customer_address, 20, 88);
    }
    doc.text(invoice.customer_email, 20, invoice.customer_address ? 94 : 88);

    // Items table header - dark background
    let tableY = 105;
    doc.setFillColor(31, 41, 55);
    doc.rect(20, tableY, pageWidth - 40, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("#", 25, tableY + 7);
    doc.text("Item & Description", 35, tableY + 7);
    doc.text("Qty", 120, tableY + 7);
    doc.text("Rate", 140, tableY + 7);
    doc.text("Amount", pageWidth - 25, tableY + 7, { align: "right" });
    doc.setTextColor(0, 0, 0);

    // Items
    doc.setFont("helvetica", "normal");
    tableY += 15;
    invoice.items.forEach((item, index) => {
      doc.setFontSize(9);
      doc.text((index + 1).toString(), 25, tableY);
      doc.setFont("helvetica", "bold");
      doc.text(item.name, 35, tableY);
      doc.setFont("helvetica", "normal");
      doc.text(item.quantity.toString(), 120, tableY);
      doc.text(formatCurrency(item.rate), 140, tableY);
      doc.text(formatCurrency(item.rate * item.quantity), pageWidth - 25, tableY, { align: "right" });
      doc.setDrawColor(229, 231, 235);
      doc.line(20, tableY + 4, pageWidth - 20, tableY + 4);
      tableY += 12;
    });

    // Totals
    tableY += 5;
    doc.setFontSize(9);
    doc.text("Sub Total", 140, tableY);
    doc.text(formatCurrency(invoice.subtotal), pageWidth - 25, tableY, { align: "right" });
    tableY += 7;

    if (invoice.tax > 0) {
      doc.text("Tax", 140, tableY);
      doc.text(formatCurrency(invoice.tax), pageWidth - 25, tableY, { align: "right" });
      tableY += 7;
    }

    doc.text("Discount", 140, tableY);
    doc.text("₹0", pageWidth - 25, tableY, { align: "right" });
    tableY += 10;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Total", 140, tableY);
    doc.text(formatCurrency(invoice.total), pageWidth - 25, tableY, { align: "right" });
    tableY += 8;

    doc.setTextColor(isOverdue ? 185 : 21, isOverdue ? 28 : 128, isOverdue ? 28 : 61);
    doc.text("Balance Due", 140, tableY);
    doc.text(formatCurrency(invoice.balance_due), pageWidth - 25, tableY, { align: "right" });
    doc.setTextColor(0, 0, 0);

    // Total in words
    tableY += 15;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.text(`Total In Words: ${numberToWords(Math.round(invoice.total))}`, 20, tableY);

    // Custom fields
    if (user?.invoice_custom_fields?.length > 0) {
      tableY += 15;
      doc.setFont("helvetica", "bold");
      doc.text("Additional Information", 20, tableY);
      doc.setFont("helvetica", "normal");
      tableY += 7;
      user.invoice_custom_fields.forEach(field => {
        doc.text(`${field.label}: ${field.value}`, 20, tableY);
        tableY += 5;
      });
    }

    // Notes
    if (invoice.notes || user?.invoice_terms) {
      tableY += 10;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text("Notes", 20, tableY);
      doc.setFont("helvetica", "normal");
      tableY += 6;
      if (invoice.notes) {
        doc.text(invoice.notes, 20, tableY);
        tableY += 6;
      }
      if (user?.invoice_terms) {
        doc.setFontSize(8);
        doc.text("Terms & Conditions:", 20, tableY);
        tableY += 5;
        const terms = doc.splitTextToSize(user.invoice_terms, pageWidth - 40);
        doc.text(terms, 20, tableY);
      }
    }

    // Authorized signature
    const sigY = doc.internal.pageSize.height - 30;
    doc.setDrawColor(0, 0, 0);
    doc.line(pageWidth - 70, sigY, pageWidth - 20, sigY);
    doc.setFontSize(8);
    doc.text("Authorized Signature", pageWidth - 45, sigY + 5, { align: "center" });
  };

  const generateModernTemplate = (doc, invoice, pageWidth, isOverdue) => {
    // Header bar
    doc.setFillColor(29, 78, 216);
    doc.rect(0, 0, pageWidth, 45, 'F');

    // Logo in header
    if (user?.invoice_logo) {
      try {
        doc.addImage(user.invoice_logo, 'PNG', 20, 10, 25, 25);
      } catch (e) {
        console.log("Logo error:", e);
      }
    }

    // Company name in header
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(user?.business_name || user?.name || "Invoice", user?.invoice_logo ? 50 : 20, 25);

    // INVOICE text
    doc.setFontSize(24);
    doc.text("INVOICE", pageWidth - 20, 22, { align: "right" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(invoice.invoice_number, pageWidth - 20, 32, { align: "right" });
    doc.setTextColor(0, 0, 0);

    // Overdue badge
    if (isOverdue) {
      doc.setFillColor(239, 68, 68);
      doc.roundedRect(pageWidth - 60, 50, 40, 12, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("OVERDUE", pageWidth - 40, 58, { align: "center" });
      doc.setTextColor(0, 0, 0);
    }

    // From section
    let yPos = 60;
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text("From", 20, yPos);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    yPos += 6;
    doc.text(user?.business_name || user?.name || "", 20, yPos);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    if (user?.business_address) {
      yPos += 5;
      doc.text(user.business_address.split('\n')[0], 20, yPos);
    }
    yPos += 5;
    doc.text(user?.business_email || user?.email || "", 20, yPos);

    // To section
    yPos = 60;
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text("Billed To", 90, yPos);
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    yPos += 6;
    doc.text(invoice.customer_name, 90, yPos);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    yPos += 5;
    doc.text(invoice.customer_email, 90, yPos);

    // Invoice details
    yPos = 60;
    doc.setFontSize(8);
    doc.text(`Date: ${formatDate(invoice.issue_date)}`, pageWidth - 20, yPos, { align: "right" });
    doc.text(`Due: ${formatDate(invoice.due_date)}`, pageWidth - 20, yPos + 6, { align: "right" });

    // Balance Due
    yPos += 20;
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text("Balance Due", pageWidth - 20, yPos, { align: "right" });
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(29, 78, 216);
    doc.text(formatCurrency(invoice.balance_due), pageWidth - 20, yPos + 10, { align: "right" });
    doc.setTextColor(0, 0, 0);

    // Items table
    let tableY = 110;
    doc.setFillColor(249, 250, 251);
    doc.rect(20, tableY - 5, pageWidth - 40, 12, 'F');
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(107, 114, 128);
    doc.text("Description", 25, tableY + 2);
    doc.text("Qty", 120, tableY + 2);
    doc.text("Rate", 140, tableY + 2);
    doc.text("Amount", pageWidth - 25, tableY + 2, { align: "right" });
    doc.setTextColor(0, 0, 0);

    tableY += 12;
    doc.setFont("helvetica", "normal");
    invoice.items.forEach((item) => {
      doc.setFontSize(9);
      doc.text(item.name, 25, tableY);
      doc.text(item.quantity.toString(), 120, tableY);
      doc.text(formatCurrency(item.rate), 140, tableY);
      doc.text(formatCurrency(item.rate * item.quantity), pageWidth - 25, tableY, { align: "right" });
      doc.setDrawColor(229, 231, 235);
      doc.line(20, tableY + 4, pageWidth - 20, tableY + 4);
      tableY += 10;
    });

    // Totals
    tableY += 10;
    doc.setFontSize(9);
    doc.text("Subtotal", 140, tableY);
    doc.text(formatCurrency(invoice.subtotal), pageWidth - 25, tableY, { align: "right" });
    tableY += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Total", 140, tableY);
    doc.text(formatCurrency(invoice.total), pageWidth - 25, tableY, { align: "right" });

    // Terms
    if (user?.invoice_terms) {
      tableY += 25;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(107, 114, 128);
      doc.text("Terms & Conditions", 20, tableY);
      doc.setTextColor(0, 0, 0);
      tableY += 5;
      const terms = doc.splitTextToSize(user.invoice_terms, pageWidth - 40);
      doc.text(terms, 20, tableY);
    }
  };

  const generateSpreadsheetTemplate = (doc, invoice, pageWidth, isOverdue) => {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("INVOICE", 20, 20);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(invoice.invoice_number, 60, 20);

    if (isOverdue) {
      doc.setTextColor(185, 28, 28);
      doc.setFont("helvetica", "bold");
      doc.text("[OVERDUE]", pageWidth - 20, 20, { align: "right" });
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "normal");
    }

    // Logo
    if (user?.invoice_logo) {
      try {
        doc.addImage(user.invoice_logo, 'PNG', pageWidth - 50, 25, 30, 30);
      } catch (e) {
        console.log("Logo error:", e);
      }
    }

    // Info grid
    let gridY = 35;
    const cellWidth = (pageWidth - 40) / 2;
    
    // Row 1
    doc.setDrawColor(200, 200, 200);
    doc.rect(20, gridY, cellWidth, 20);
    doc.rect(20 + cellWidth, gridY, cellWidth, 20);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("From:", 25, gridY + 6);
    doc.text("To:", 25 + cellWidth, gridY + 6);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.text(user?.business_name || user?.name || "", 25, gridY + 14);
    doc.text(invoice.customer_name, 25 + cellWidth, gridY + 14);

    gridY += 20;
    doc.rect(20, gridY, cellWidth, 15);
    doc.rect(20 + cellWidth, gridY, cellWidth, 15);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("Invoice Date:", 25, gridY + 6);
    doc.text("Due Date:", 25 + cellWidth, gridY + 6);
    doc.setTextColor(0, 0, 0);
    doc.text(formatDate(invoice.issue_date), 25, gridY + 12);
    doc.text(formatDate(invoice.due_date), 25 + cellWidth, gridY + 12);

    // Items table
    let tableY = gridY + 25;
    const cols = [15, 70, 25, 35, 40];
    const headers = ["#", "Item", "Qty", "Rate", "Amount"];
    
    // Header
    doc.setFillColor(240, 240, 240);
    doc.rect(20, tableY, pageWidth - 40, 10, 'F');
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    let xPos = 20;
    headers.forEach((h, i) => {
      doc.rect(xPos, tableY, cols[i], 10);
      doc.text(h, xPos + 2, tableY + 7);
      xPos += cols[i];
    });

    // Rows
    doc.setFont("helvetica", "normal");
    tableY += 10;
    invoice.items.forEach((item, index) => {
      xPos = 20;
      doc.rect(xPos, tableY, cols[0], 10);
      doc.text((index + 1).toString(), xPos + 2, tableY + 7);
      xPos += cols[0];
      
      doc.rect(xPos, tableY, cols[1], 10);
      doc.text(item.name.substring(0, 25), xPos + 2, tableY + 7);
      xPos += cols[1];
      
      doc.rect(xPos, tableY, cols[2], 10);
      doc.text(item.quantity.toString(), xPos + 2, tableY + 7);
      xPos += cols[2];
      
      doc.rect(xPos, tableY, cols[3], 10);
      doc.text(formatCurrency(item.rate), xPos + 2, tableY + 7);
      xPos += cols[3];
      
      doc.rect(xPos, tableY, cols[4], 10);
      doc.text(formatCurrency(item.rate * item.quantity), xPos + 2, tableY + 7);
      
      tableY += 10;
    });

    // Totals
    tableY += 5;
    doc.setFont("helvetica", "bold");
    doc.text("Subtotal:", 140, tableY);
    doc.text(formatCurrency(invoice.subtotal), pageWidth - 25, tableY, { align: "right" });
    tableY += 8;
    doc.text("Total:", 140, tableY);
    doc.text(formatCurrency(invoice.total), pageWidth - 25, tableY, { align: "right" });
    tableY += 8;
    doc.setTextColor(isOverdue ? 185 : 0, isOverdue ? 28 : 100, isOverdue ? 28 : 0);
    doc.text("Balance Due:", 140, tableY);
    doc.text(formatCurrency(invoice.balance_due), pageWidth - 25, tableY, { align: "right" });
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-700"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div data-testid="invoices-page">
        <div className="page-header flex items-center justify-between">
          <div>
            <h1 className="page-title">Invoices</h1>
            <p className="page-subtitle">Create and manage your invoices</p>
          </div>
          <div className="flex gap-3">
            {/* Customize Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" data-testid="customize-btn">
                  <Settings2 className="w-4 h-4 mr-2" />
                  Customize
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setShowTemplateModal(true)}>
                  <Palette className="w-4 h-4 mr-2" />
                  Change Template
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowTemplateModal(true)}>
                  <FileEdit className="w-4 h-4 mr-2" />
                  Edit Template
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowLogoModal(true)}>
                  <Image className="w-4 h-4 mr-2" />
                  Update Logo & Address
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowCustomFieldsModal(true)}>
                  <List className="w-4 h-4 mr-2" />
                  Manage Custom Fields
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowTermsModal(true)}>
                  <ScrollText className="w-4 h-4 mr-2" />
                  Terms & Conditions
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              onClick={handleOpenDialog}
              className="bg-[#1d4ed8] hover:bg-[#1e40af]"
              data-testid="create-invoice-btn"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Invoice
            </Button>
          </div>
        </div>

        <div className="card">
          {invoices.length === 0 ? (
            <div className="empty-state">
              <FileText className="empty-state-icon" />
              <h3 className="empty-state-title">No invoices yet</h3>
              <p className="empty-state-text">
                Create your first invoice to start tracking payments
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Number</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.invoice_id} data-testid={`invoice-row-${invoice.invoice_id}`}>
                    <TableCell className="text-gray-600">
                      {formatDate(invoice.issue_date)}
                    </TableCell>
                    <TableCell className="font-medium font-mono">
                      {invoice.invoice_number}
                    </TableCell>
                    <TableCell>{invoice.customer_name}</TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell className="text-gray-600">
                      {formatDate(invoice.due_date)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {formatCurrency(invoice.total)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {formatCurrency(invoice.balance_due)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" data-testid={`invoice-actions-${invoice.invoice_id}`}>
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => generatePDF(invoice)}>
                            <Download className="w-4 h-4 mr-2" />
                            Download PDF
                          </DropdownMenuItem>
                          {invoice.status === "Draft" && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(invoice, "Sent")}
                            >
                              <Send className="w-4 h-4 mr-2" />
                              Mark as Sent
                            </DropdownMenuItem>
                          )}
                          {invoice.status !== "Paid" && (
                            <DropdownMenuItem
                              onClick={() => handleStatusChange(invoice, "Paid")}
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Mark as Paid
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleDelete(invoice)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Create Invoice Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Invoice</DialogTitle>
              <DialogDescription>Select a customer and add items to create a new invoice.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label>Customer *</Label>
                <Select value={selectedCustomer} onValueChange={handleCustomerSelect}>
                  <SelectTrigger data-testid="select-customer">
                    <SelectValue placeholder="Select a customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.customer_id} value={customer.customer_id}>
                        {customer.name} ({customer.company || customer.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {/* Show customer details when selected */}
                {selectedCustomerData && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-gray-500">Bill To:</span>
                        <p className="font-medium">{selectedCustomerData.name}</p>
                        {selectedCustomerData.company && <p className="text-gray-600">{selectedCustomerData.company}</p>}
                        {(selectedCustomerData.address || selectedCustomerData.city) && (
                          <p className="text-gray-600 text-xs mt-1">
                            {[selectedCustomerData.address, selectedCustomerData.city, selectedCustomerData.state, selectedCustomerData.pincode]
                              .filter(Boolean).join(", ")}
                          </p>
                        )}
                      </div>
                      {selectedCustomerData.gst_number && (
                        <div>
                          <span className="text-gray-500">GST Number:</span>
                          <p className="font-mono font-medium">{selectedCustomerData.gst_number}</p>
                        </div>
                      )}
                    </div>
                    {selectedCustomerData.active_services?.length > 0 && selectedItems.length > 0 && (
                      <p className="text-xs text-blue-600 mt-2">
                        Active services pre-selected based on customer profile
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <Label>Add Items *</Label>
                <Select onValueChange={handleAddItem} value="">
                  <SelectTrigger data-testid="select-item">
                    <SelectValue placeholder="Select an item to add" />
                  </SelectTrigger>
                  <SelectContent>
                    {items.map((item) => (
                      <SelectItem key={item.item_id} value={item.item_id}>
                        {item.name} - {formatCurrency(item.rate)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {selectedItems.length > 0 && (
                  <div className="mt-4 border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-3 font-medium">Item</th>
                          <th className="text-center p-3 font-medium w-24">Qty</th>
                          <th className="text-right p-3 font-medium">Rate</th>
                          <th className="text-right p-3 font-medium">Amount</th>
                          <th className="w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedItems.map((item) => (
                          <tr key={item.item_id} className="border-t">
                            <td className="p-3">{item.name}</td>
                            <td className="p-3">
                              <Input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) =>
                                  handleQuantityChange(
                                    item.item_id,
                                    parseInt(e.target.value) || 1
                                  )
                                }
                                className="w-20 text-center mx-auto"
                              />
                            </td>
                            <td className="p-3 text-right font-mono">
                              {formatCurrency(item.rate)}
                            </td>
                            <td className="p-3 text-right font-mono font-medium">
                              {formatCurrency(item.rate * item.quantity)}
                            </td>
                            <td className="p-3">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveItem(item.item_id)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="dueDate">Due Date *</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  required
                  data-testid="due-date-input"
                />
              </div>

              <div>
                <Label htmlFor="tax">Tax Amount (₹)</Label>
                <Input
                  id="tax"
                  type="number"
                  min="0"
                  step="0.01"
                  value={tax}
                  onChange={(e) => setTax(e.target.value)}
                  data-testid="tax-input"
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes for the invoice"
                  rows={3}
                  data-testid="notes-input"
                />
              </div>

              {selectedItems.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span className="font-mono">{formatCurrency(calculateSubtotal())}</span>
                  </div>
                  {parseFloat(tax) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span>Tax</span>
                      <span className="font-mono">{formatCurrency(parseFloat(tax))}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-lg pt-2 border-t">
                    <span>Total</span>
                    <span className="font-mono">{formatCurrency(calculateTotal())}</span>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#1d4ed8] hover:bg-[#1e40af]"
                  data-testid="save-invoice-btn"
                >
                  Create Invoice
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Template Picker Modal */}
        <Dialog open={showTemplateModal} onOpenChange={setShowTemplateModal}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Choose Invoice Template</DialogTitle>
              <DialogDescription>Select a template for your invoices. This will be used for all PDF downloads.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-3 gap-4 py-4">
              <div onClick={() => setSelectedTemplate("standard")}>
                <TemplatePreviewStandard selected={selectedTemplate === "standard"} />
              </div>
              <div onClick={() => setSelectedTemplate("modern")}>
                <TemplatePreviewModern selected={selectedTemplate === "modern"} />
              </div>
              <div onClick={() => setSelectedTemplate("spreadsheet")}>
                <TemplatePreviewSpreadsheet selected={selectedTemplate === "spreadsheet"} />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowTemplateModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveTemplate} className="bg-[#1d4ed8] hover:bg-[#1e40af]">
                Save Template
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Logo Upload Modal */}
        <Dialog open={showLogoModal} onOpenChange={setShowLogoModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Update Logo & Address</DialogTitle>
              <DialogDescription>Upload your business logo to appear on invoices.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Business Logo</Label>
                <div className="mt-2 flex items-center gap-4">
                  {logoPreview ? (
                    <div className="relative">
                      <img src={logoPreview} alt="Logo" className="w-24 h-24 object-contain border rounded" />
                      <button
                        onClick={() => setLogoPreview(null)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 border-2 border-dashed rounded flex items-center justify-center text-gray-400">
                      <Image className="w-8 h-8" />
                    </div>
                  )}
                  <div>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="w-full"
                      data-testid="logo-upload-input"
                    />
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 500KB</p>
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-500">
                Your business address can be updated in <a href="/settings" className="text-blue-600 underline">Settings</a>
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowLogoModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveLogo} className="bg-[#1d4ed8] hover:bg-[#1e40af]">
                Save Logo
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Terms & Conditions Modal */}
        <Dialog open={showTermsModal} onOpenChange={setShowTermsModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Terms & Conditions</DialogTitle>
              <DialogDescription>These terms will appear at the bottom of all invoices.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Textarea
                value={termsText}
                onChange={(e) => setTermsText(e.target.value)}
                placeholder="Enter your terms and conditions..."
                rows={6}
                data-testid="terms-textarea"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowTermsModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveTerms} className="bg-[#1d4ed8] hover:bg-[#1e40af]">
                Save Terms
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Custom Fields Modal */}
        <Dialog open={showCustomFieldsModal} onOpenChange={setShowCustomFieldsModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Manage Custom Fields</DialogTitle>
              <DialogDescription>Add custom fields to display on your invoices (e.g., GST Number, PAN).</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              {customFields.map((field, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input
                    placeholder="Label (e.g., GST Number)"
                    value={field.label}
                    onChange={(e) => updateCustomField(index, "label", e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Value"
                    value={field.value}
                    onChange={(e) => updateCustomField(index, "value", e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCustomField(index)}
                    className="text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" onClick={addCustomField} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add Field
              </Button>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowCustomFieldsModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveCustomFields} className="bg-[#1d4ed8] hover:bg-[#1e40af]">
                Save Fields
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Invoices;
