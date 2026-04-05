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
} from "lucide-react";

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
            <Button
              onClick={() => navigate("/invoices", { state: { selectedCustomerId: customer.customer_id } })}
              className="bg-[#1d4ed8] hover:bg-[#1e40af]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Invoice
            </Button>
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
                    <SelectItem value="note">📝 Note</SelectItem>
                    <SelectItem value="call">📞 Phone Call</SelectItem>
                    <SelectItem value="meeting">📅 Meeting</SelectItem>
                    <SelectItem value="email">📧 Email</SelectItem>
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
      </div>
    </Layout>
  );
};

export default CustomerProfile;
