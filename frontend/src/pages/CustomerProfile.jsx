import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import axios from "axios";
import { API } from "@/App";
import { toast } from "sonner";
import {
  ArrowLeft,
  Building,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  MessageSquare,
  Clock,
  Plus,
  Trash2,
  Edit,
  Receipt,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Send,
  Pencil,
  Save,
  X,
} from "lucide-react";

const SALUTATIONS = ["Mr.", "Mrs.", "Ms.", "Dr.", "Prof."];
const PAYMENT_TERMS = ["Due on Receipt", "Net 15", "Net 30", "Net 45", "Net 60"];
const INDIAN_STATES = [
  "Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana",
  "Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur",
  "Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana",
  "Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Delhi","Jammu & Kashmir","Ladakh",
];

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getStatusBadge = (status) => {
  const statusConfig = {
    Active: { class: "bg-green-100 text-green-700 border-green-200", icon: "🟢" },
    "Follow-up Needed": { class: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: "🟡" },
    Overdue: { class: "bg-red-100 text-red-700 border-red-200", icon: "🔴" },
    Inactive: { class: "bg-gray-100 text-gray-600 border-gray-200", icon: "⚫" },
  };
  const config = statusConfig[status] || statusConfig.Inactive;
  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${config.class}`}>
      <span>{config.icon}</span>
      {status}
    </span>
  );
};

const getInvoiceStatusBadge = (status) => {
  const statusClasses = {
    Draft: "bg-gray-100 text-gray-600 border-gray-200",
    Sent: "bg-blue-100 text-blue-700 border-blue-200",
    Overdue: "bg-red-100 text-red-700 border-red-200",
    Paid: "bg-green-100 text-green-700 border-green-200",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusClasses[status] || statusClasses.Draft}`}>
      {status}
    </span>
  );
};

const getToneBadge = (tone) => {
  const toneClasses = {
    Polite: "bg-green-50 text-green-700",
    Professional: "bg-blue-50 text-blue-700",
    Firm: "bg-yellow-50 text-yellow-700",
    Strict: "bg-red-50 text-red-700",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${toneClasses[tone] || ""}`}>
      {tone}
    </span>
  );
};

const getNoteIcon = (noteType) => {
  const icons = {
    note: <MessageSquare className="w-4 h-4" />,
    call: <Phone className="w-4 h-4" />,
    meeting: <Calendar className="w-4 h-4" />,
    email: <Mail className="w-4 h-4" />,
    invoice: <Receipt className="w-4 h-4" />,
    status_change: <AlertCircle className="w-4 h-4" />,
  };
  return icons[noteType] || icons.note;
};

const CustomerProfile = () => {
  const { customerId } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [noteType, setNoteType] = useState("note");
  const [addingNote, setAddingNote] = useState(false);

  // Edit mode
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [items, setItems] = useState([]);
  const [editForm, setEditForm] = useState(null);
  const [editTab, setEditTab] = useState("details");

  const fetchCustomer = async () => {
    try {
      const response = await axios.get(`${API}/customers/${customerId}`, {
        withCredentials: true,
      });
      setCustomer(response.data);
    } catch (error) {
      toast.error("Failed to fetch customer");
      navigate("/customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomer();
  }, [customerId]);

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!noteContent.trim()) return;

    setAddingNote(true);
    try {
      await axios.post(
        `${API}/customers/${customerId}/notes`,
        { content: noteContent, note_type: noteType },
        { withCredentials: true }
      );
      toast.success("Note added");
      setNoteContent("");
      setNoteType("note");
      setShowNoteDialog(false);
      fetchCustomer();
    } catch (error) {
      toast.error("Failed to add note");
    } finally {
      setAddingNote(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm("Delete this note?")) return;

    try {
      await axios.delete(`${API}/customers/${customerId}/notes/${noteId}`, {
        withCredentials: true,
      });
      toast.success("Note deleted");
      fetchCustomer();
    } catch (error) {
      toast.error("Failed to delete note");
    }
  };

  // Fetch items for active services selector
  useEffect(() => {
    axios.get(`${API}/items`, { withCredentials: true })
      .then(res => setItems(res.data))
      .catch(() => {});
  }, []);

  const openEditDialog = () => {
    setEditForm({
      customer_type: customer.customer_type || "Business",
      salutation: customer.salutation || "",
      first_name: customer.first_name || customer.name?.split(" ")[0] || "",
      last_name: customer.last_name || customer.name?.split(" ").slice(1).join(" ") || "",
      company: customer.company || "",
      display_name: customer.display_name || customer.name || "",
      email: customer.email || "",
      work_phone: customer.work_phone || customer.phone || "",
      mobile: customer.mobile || "",
      billing_address: customer.billing_address || customer.address || "",
      billing_city: customer.billing_city || customer.city || "",
      billing_state: customer.billing_state || customer.state || "",
      billing_pincode: customer.billing_pincode || customer.pincode || "",
      shipping_address: customer.shipping_address || "",
      shipping_city: customer.shipping_city || "",
      shipping_state: customer.shipping_state || "",
      shipping_pincode: customer.shipping_pincode || "",
      pan_number: customer.pan_number || "",
      gst_number: customer.gst_number || "",
      payment_terms: customer.payment_terms || "Due on Receipt",
      contact_persons: customer.contact_persons || [],
      custom_fields: customer.custom_fields || [],
      remarks: customer.remarks || customer.notes || "",
      onboarding_date: customer.onboarding_date ? customer.onboarding_date.split("T")[0] : "",
      active_services: customer.active_services || [],
    });
    setEditTab("details");
    setShowEditDialog(true);
  };

  const ef = (field, value) => setEditForm(prev => ({ ...prev, [field]: value }));

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editForm.first_name || !editForm.email) {
      toast.error("First Name and Email are required");
      return;
    }
    setEditSaving(true);
    try {
      const payload = {
        ...editForm,
        onboarding_date: editForm.onboarding_date || null,
        contact_persons: editForm.contact_persons.filter(cp => cp.name || cp.email),
        custom_fields: editForm.custom_fields.filter(cf => cf.label || cf.value),
      };
      await axios.put(`${API}/customers/${customerId}`, payload, { withCredentials: true });
      toast.success("Customer updated");
      setShowEditDialog(false);
      fetchCustomer();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update customer");
    } finally {
      setEditSaving(false);
    }
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

  if (!customer) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-500">Customer not found</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div data-testid="customer-profile-page">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate("/customers")}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Customers
          </button>

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-2xl font-bold">
                {customer.name[0]?.toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-3">
                  {customer.name}
                  {getStatusBadge(customer.status)}
                </h1>
                {customer.company && (
                  <p className="text-gray-500 flex items-center gap-1 mt-1">
                    <Building className="w-4 h-4" />
                    {customer.company}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={openEditDialog}
                data-testid="edit-customer-btn"
              >
                <Pencil className="w-4 h-4 mr-2" />
                Edit Details
              </Button>
              <Button
                onClick={() => navigate("/invoices", { state: { selectedCustomerId: customer.customer_id } })}
                className="bg-[#1d4ed8] hover:bg-[#1e40af]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Invoice
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <Receipt className="w-4 h-4" />
              Total Billed
            </div>
            <p className="text-2xl font-bold font-mono">{formatCurrency(customer.total_billed)}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <CreditCard className="w-4 h-4" />
              Total Paid
            </div>
            <p className="text-2xl font-bold font-mono text-green-600">{formatCurrency(customer.total_paid)}</p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <AlertCircle className="w-4 h-4" />
              Balance Due
            </div>
            <p className={`text-2xl font-bold font-mono ${customer.balance_due > 0 ? "text-red-600" : "text-green-600"}`}>
              {formatCurrency(customer.balance_due)}
            </p>
          </div>
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
              <FileText className="w-4 h-4" />
              Total Invoices
            </div>
            <p className="text-2xl font-bold">{customer.invoice_count}</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile Details */}
          <div className="lg:col-span-1 space-y-4">
            {/* Contact Info */}
            <div className="bg-white rounded-lg border p-4">
              <h3 className="font-semibold mb-3">Contact Information</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <Mail className="w-4 h-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-gray-500">Email</p>
                    <a href={`mailto:${customer.email}`} className="text-blue-600 hover:underline">
                      {customer.email}
                    </a>
                  </div>
                </div>
                {customer.phone && (
                  <div className="flex items-start gap-2">
                    <Phone className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-gray-500">Phone</p>
                      <a href={`tel:${customer.phone}`} className="text-blue-600 hover:underline">
                        {customer.phone}
                      </a>
                    </div>
                  </div>
                )}
                {(customer.address || customer.city || customer.state) && (
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-gray-500">Address</p>
                      <p>
                        {[customer.address, customer.city, customer.state, customer.pincode]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Business Details */}
            <div className="bg-white rounded-lg border p-4">
              <h3 className="font-semibold mb-3">Business Details</h3>
              <div className="space-y-3 text-sm">
                {customer.gst_number && (
                  <div>
                    <p className="text-gray-500">GST Number</p>
                    <p className="font-mono">{customer.gst_number}</p>
                  </div>
                )}
                {customer.pan_number && (
                  <div>
                    <p className="text-gray-500">PAN Number</p>
                    <p className="font-mono">{customer.pan_number}</p>
                  </div>
                )}
                {customer.onboarding_date && (
                  <div>
                    <p className="text-gray-500">Onboarding Date</p>
                    <p>{formatDate(customer.onboarding_date)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Active Services */}
            {customer.active_services_details?.length > 0 && (
              <div className="bg-white rounded-lg border p-4">
                <h3 className="font-semibold mb-3">Active Services</h3>
                <div className="flex flex-wrap gap-2">
                  {customer.active_services_details.map((service) => (
                    <span
                      key={service.item_id}
                      className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
                    >
                      {service.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {customer.notes && (
              <div className="bg-white rounded-lg border p-4">
                <h3 className="font-semibold mb-3">Notes</h3>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{customer.notes}</p>
              </div>
            )}
          </div>

          {/* Right Column - Tabs */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="invoices" className="bg-white rounded-lg border">
              <TabsList className="border-b w-full justify-start rounded-none px-4 bg-transparent">
                <TabsTrigger value="invoices" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none">
                  Invoices ({customer.invoices?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="reminders" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none">
                  Reminders ({customer.reminders?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="activity" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none">
                  Activity ({customer.activity_notes?.length || 0})
                </TabsTrigger>
              </TabsList>

              {/* Invoices Tab */}
              <TabsContent value="invoices" className="p-4">
                {customer.invoices?.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No invoices yet</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customer.invoices?.map((invoice) => (
                        <TableRow key={invoice.invoice_id}>
                          <TableCell className="font-mono font-medium">{invoice.invoice_number}</TableCell>
                          <TableCell className="text-gray-600">{formatDate(invoice.issue_date)}</TableCell>
                          <TableCell>{getInvoiceStatusBadge(invoice.status)}</TableCell>
                          <TableCell className="text-right font-mono">{formatCurrency(invoice.total)}</TableCell>
                          <TableCell className="text-right font-mono">
                            <span className={invoice.balance_due > 0 ? "text-red-600" : "text-green-600"}>
                              {formatCurrency(invoice.balance_due)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>

              {/* Reminders Tab */}
              <TabsContent value="reminders" className="p-4">
                {customer.reminders?.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Send className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No reminders sent</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {customer.reminders?.map((reminder) => (
                      <div key={reminder.reminder_id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getToneBadge(reminder.tone)}
                            {reminder.status === "Sent" ? (
                              <span className="text-green-600 text-xs flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> Sent
                              </span>
                            ) : (
                              <span className="text-yellow-600 text-xs">Pending</span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">
                            {reminder.sent_at ? formatDateTime(reminder.sent_at) : formatDateTime(reminder.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          Amount: <span className="font-mono font-medium">{formatCurrency(reminder.amount)}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Activity Tab */}
              <TabsContent value="activity" className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-medium">Activity Timeline</h4>
                  <Button size="sm" onClick={() => setShowNoteDialog(true)}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Note
                  </Button>
                </div>
                {customer.activity_notes?.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No activity yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {customer.activity_notes?.map((note) => (
                      <div key={note.note_id} className="flex gap-3 group">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 flex-shrink-0">
                          {getNoteIcon(note.note_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <p className="text-sm">{note.content}</p>
                            {note.note_type !== "status_change" && note.note_type !== "invoice" && (
                              <button
                                onClick={() => handleDeleteNote(note.note_id)}
                                className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 ml-2"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDateTime(note.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Add Note Dialog */}
        <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Note</DialogTitle>
              <DialogDescription>Add a note or activity log for this customer.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddNote} className="space-y-4">
              <div>
                <Label>Type</Label>
                <Select value={noteType} onValueChange={setNoteType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="note">Note</SelectItem>
                    <SelectItem value="call">Phone Call</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Content</Label>
                <Textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Enter your note..."
                  rows={4}
                  required
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => setShowNoteDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-[#1d4ed8] hover:bg-[#1e40af]" disabled={addingNote}>
                  {addingNote ? "Adding..." : "Add Note"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Customer Dialog */}
        {editForm && (
          <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Customer</DialogTitle>
                <DialogDescription>Update details for {customer.name}</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSaveEdit} className="space-y-5">
                {/* Tabs */}
                <div className="flex gap-1 border-b border-gray-200">
                  {[
                    { id: "details", label: "Details" },
                    { id: "address", label: "Address" },
                    { id: "contacts", label: "Contacts" },
                    { id: "other", label: "Other" },
                  ].map(t => (
                    <button key={t.id} type="button" onClick={() => setEditTab(t.id)}
                      className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${editTab === t.id ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                      data-testid={`edit-tab-${t.id}`}
                    >{t.label}</button>
                  ))}
                </div>

                {/* DETAILS TAB */}
                {editTab === "details" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-gray-500">Customer Type</Label>
                        <Select value={editForm.customer_type} onValueChange={v => ef("customer_type", v)}>
                          <SelectTrigger className="mt-1" data-testid="edit-cust-type"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Business">Business</SelectItem>
                            <SelectItem value="Individual">Individual</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Salutation</Label>
                        <Select value={editForm.salutation} onValueChange={v => ef("salutation", v)}>
                          <SelectTrigger className="mt-1"><SelectValue placeholder="Select" /></SelectTrigger>
                          <SelectContent>{SALUTATIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-gray-500">First Name *</Label>
                        <Input value={editForm.first_name} onChange={e => ef("first_name", e.target.value)} className="mt-1" data-testid="edit-first-name" />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Last Name</Label>
                        <Input value={editForm.last_name} onChange={e => ef("last_name", e.target.value)} className="mt-1" data-testid="edit-last-name" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-gray-500">Company Name</Label>
                        <Input value={editForm.company} onChange={e => ef("company", e.target.value)} className="mt-1" data-testid="edit-company" />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Display Name</Label>
                        <Input value={editForm.display_name} onChange={e => ef("display_name", e.target.value)} className="mt-1" data-testid="edit-display-name" />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Email *</Label>
                      <Input type="email" value={editForm.email} onChange={e => ef("email", e.target.value)} className="mt-1" data-testid="edit-email" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-gray-500">Work Phone</Label>
                        <Input value={editForm.work_phone} onChange={e => ef("work_phone", e.target.value)} className="mt-1" data-testid="edit-work-phone" />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Mobile</Label>
                        <Input value={editForm.mobile} onChange={e => ef("mobile", e.target.value)} className="mt-1" data-testid="edit-mobile" />
                      </div>
                    </div>
                  </div>
                )}

                {/* ADDRESS TAB */}
                {editTab === "address" && (
                  <div className="space-y-5">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Billing Address</h4>
                      <div className="space-y-3">
                        <Input value={editForm.billing_address} onChange={e => ef("billing_address", e.target.value)} placeholder="Street Address" data-testid="edit-billing-address" />
                        <div className="grid grid-cols-3 gap-3">
                          <Input value={editForm.billing_city} onChange={e => ef("billing_city", e.target.value)} placeholder="City" data-testid="edit-billing-city" />
                          <Select value={editForm.billing_state} onValueChange={v => ef("billing_state", v)}>
                            <SelectTrigger data-testid="edit-billing-state"><SelectValue placeholder="State" /></SelectTrigger>
                            <SelectContent>{INDIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                          </Select>
                          <Input value={editForm.billing_pincode} onChange={e => ef("billing_pincode", e.target.value)} placeholder="Pin Code" data-testid="edit-billing-pincode" />
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Shipping Address</h4>
                      <div className="space-y-3">
                        <Input value={editForm.shipping_address} onChange={e => ef("shipping_address", e.target.value)} placeholder="Street Address" data-testid="edit-shipping-address" />
                        <div className="grid grid-cols-3 gap-3">
                          <Input value={editForm.shipping_city} onChange={e => ef("shipping_city", e.target.value)} placeholder="City" />
                          <Select value={editForm.shipping_state} onValueChange={v => ef("shipping_state", v)}>
                            <SelectTrigger><SelectValue placeholder="State" /></SelectTrigger>
                            <SelectContent>{INDIAN_STATES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                          </Select>
                          <Input value={editForm.shipping_pincode} onChange={e => ef("shipping_pincode", e.target.value)} placeholder="Pin Code" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* CONTACTS TAB */}
                {editTab === "contacts" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold text-gray-700">Contact Persons</Label>
                      <Button type="button" size="sm" variant="outline" onClick={() => ef("contact_persons", [...editForm.contact_persons, { name: "", email: "", phone: "", designation: "" }])} data-testid="add-contact-btn">
                        <Plus className="w-3.5 h-3.5 mr-1" /> Add Contact
                      </Button>
                    </div>
                    {editForm.contact_persons.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-6">No contact persons added.</p>
                    ) : (
                      editForm.contact_persons.map((cp, i) => (
                        <div key={i} className="border rounded-lg p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500 font-medium">Contact {i + 1}</span>
                            <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 text-red-400" onClick={() => ef("contact_persons", editForm.contact_persons.filter((_, idx) => idx !== i))}>
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Input value={cp.name} onChange={e => { const u = [...editForm.contact_persons]; u[i] = {...u[i], name: e.target.value}; ef("contact_persons", u); }} placeholder="Name" className="h-8 text-sm" />
                            <Input value={cp.email} onChange={e => { const u = [...editForm.contact_persons]; u[i] = {...u[i], email: e.target.value}; ef("contact_persons", u); }} placeholder="Email" className="h-8 text-sm" />
                            <Input value={cp.phone} onChange={e => { const u = [...editForm.contact_persons]; u[i] = {...u[i], phone: e.target.value}; ef("contact_persons", u); }} placeholder="Phone" className="h-8 text-sm" />
                            <Input value={cp.designation} onChange={e => { const u = [...editForm.contact_persons]; u[i] = {...u[i], designation: e.target.value}; ef("contact_persons", u); }} placeholder="Designation" className="h-8 text-sm" />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* OTHER TAB */}
                {editTab === "other" && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-gray-500">PAN Number</Label>
                        <Input value={editForm.pan_number} onChange={e => ef("pan_number", e.target.value)} className="mt-1" data-testid="edit-pan" />
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">GST Number</Label>
                        <Input value={editForm.gst_number} onChange={e => ef("gst_number", e.target.value)} className="mt-1" data-testid="edit-gst" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-xs text-gray-500">Payment Terms</Label>
                        <Select value={editForm.payment_terms} onValueChange={v => ef("payment_terms", v)}>
                          <SelectTrigger className="mt-1" data-testid="edit-payment-terms"><SelectValue /></SelectTrigger>
                          <SelectContent>{PAYMENT_TERMS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Onboarding Date</Label>
                        <Input type="date" value={editForm.onboarding_date} onChange={e => ef("onboarding_date", e.target.value)} className="mt-1" data-testid="edit-onboarding-date" />
                      </div>
                    </div>
                    {items.length > 0 && (
                      <div>
                        <Label className="text-xs text-gray-500 mb-2 block">Active Services</Label>
                        <div className="flex flex-wrap gap-2">
                          {items.map(item => {
                            const active = editForm.active_services.includes(item.item_id);
                            return (
                              <button key={item.item_id} type="button"
                                onClick={() => ef("active_services", active ? editForm.active_services.filter(id => id !== item.item_id) : [...editForm.active_services, item.item_id])}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${active ? "bg-blue-50 text-blue-700 border-blue-300" : "bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300"}`}
                              >{item.name}</button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <div>
                      <Label className="text-xs text-gray-500">Remarks</Label>
                      <Textarea value={editForm.remarks} onChange={e => ef("remarks", e.target.value)} rows={3} placeholder="Additional remarks..." className="mt-1" data-testid="edit-remarks" />
                    </div>

                    {/* Custom Fields */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-xs text-gray-500">Custom Fields</Label>
                        <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => ef("custom_fields", [...editForm.custom_fields, { label: "", value: "" }])}>
                          <Plus className="w-3 h-3 mr-1" /> Add
                        </Button>
                      </div>
                      {editForm.custom_fields.map((cf, i) => (
                        <div key={i} className="flex gap-2 items-center mb-2">
                          <Input value={cf.label} onChange={e => { const u = [...editForm.custom_fields]; u[i] = {...u[i], label: e.target.value}; ef("custom_fields", u); }} placeholder="Label" className="h-8 text-sm" />
                          <Input value={cf.value} onChange={e => { const u = [...editForm.custom_fields]; u[i] = {...u[i], value: e.target.value}; ef("custom_fields", u); }} placeholder="Value" className="h-8 text-sm" />
                          <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400" onClick={() => ef("custom_fields", editForm.custom_fields.filter((_, idx) => idx !== i))}>
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2 border-t">
                  <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
                  <Button type="submit" className="bg-[#1d4ed8] hover:bg-[#1e40af]" disabled={editSaving} data-testid="save-customer-edit-btn">
                    <Save className="w-4 h-4 mr-1.5" /> {editSaving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </Layout>
  );
};

export default CustomerProfile;
