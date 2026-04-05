import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import axios from "axios";
import { API } from "@/App";
import { toast } from "sonner";
import { RefreshCw, Send, Trash2, Eye, CheckCircle, Mail, AlertCircle, Sparkles, Plus } from "lucide-react";

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const getToneBadgeClass = (tone) => {
  const classes = {
    Polite: "bg-green-100 text-green-700 border-green-200",
    Professional: "bg-blue-100 text-blue-700 border-blue-200",
    Firm: "bg-yellow-100 text-yellow-700 border-yellow-200",
    Strict: "bg-red-100 text-red-700 border-red-200",
  };
  return classes[tone] || "bg-gray-100 text-gray-700";
};

const getStatusBadge = (status) => {
  if (status === "Pending") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-200">{status}</span>;
  }
  if (status === "Sent") {
    return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">{status}</span>;
  }
  return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{status}</span>;
};

const ApprovalQueue = () => {
  const [reminders, setReminders] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [previewReminder, setPreviewReminder] = useState(null);
  const [confirmReminder, setConfirmReminder] = useState(null);
  const [sending, setSending] = useState(false);
  
  // AI Email Generator state
  const [selectedInvoice, setSelectedInvoice] = useState("");
  const [selectedTone, setSelectedTone] = useState("Professional");
  const [generatingEmail, setGeneratingEmail] = useState(false);
  const [generatedEmail, setGeneratedEmail] = useState("");
  const [generatedEmailData, setGeneratedEmailData] = useState(null);
  const [addingToQueue, setAddingToQueue] = useState(false);

  const fetchData = async () => {
    try {
      const [remindersRes, invoicesRes] = await Promise.all([
        axios.get(`${API}/reminders`, { withCredentials: true }),
        axios.get(`${API}/invoices`, { withCredentials: true }),
      ]);
      setReminders(remindersRes.data);
      // Filter to only unpaid invoices
      setInvoices(invoicesRes.data.filter(inv => inv.status !== "Paid"));
    } catch (error) {
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleGenerateReminders = async () => {
    setGenerating(true);
    try {
      const response = await axios.post(
        `${API}/reminders/generate`,
        {},
        { withCredentials: true }
      );
      if (response.data.generated > 0) {
        toast.success(`Added ${response.data.generated} new reminder(s) to queue`);
      } else {
        toast.info("No new reminders to add. Reminders are created for Sent/Overdue invoices based on due date timing.");
      }
      fetchData();
    } catch (error) {
      toast.error("Failed to generate reminders");
    } finally {
      setGenerating(false);
    }
  };

  const handleApproveAndSend = async () => {
    if (!confirmReminder) return;

    setSending(true);
    try {
      await axios.post(
        `${API}/reminders/${confirmReminder.reminder_id}/approve`,
        {},
        { withCredentials: true }
      );
      toast.success("Email sent successfully");
      setConfirmReminder(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to send email");
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (reminder) => {
    if (!window.confirm("Delete this reminder?")) return;

    try {
      await axios.delete(`${API}/reminders/${reminder.reminder_id}`, {
        withCredentials: true,
      });
      toast.success("Reminder deleted");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete reminder");
    }
  };

  // AI Email Generation
  const handleGenerateAIEmail = async () => {
    if (!selectedInvoice) {
      toast.error("Please select an invoice");
      return;
    }

    setGeneratingEmail(true);
    setGeneratedEmail("");
    setGeneratedEmailData(null);

    try {
      const response = await axios.post(
        `${API}/reminders/generate-ai-email`,
        {
          invoice_id: selectedInvoice,
          tone: selectedTone,
        },
        { withCredentials: true }
      );
      setGeneratedEmail(response.data.email_content);
      setGeneratedEmailData(response.data);
      toast.success("Email generated successfully");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to generate email");
    } finally {
      setGeneratingEmail(false);
    }
  };

  const handleAddToQueue = async () => {
    if (!generatedEmail || !generatedEmailData) {
      toast.error("Please generate an email first");
      return;
    }

    setAddingToQueue(true);
    try {
      await axios.post(
        `${API}/reminders/add-to-queue`,
        {
          invoice_id: generatedEmailData.invoice_id,
          tone: generatedEmailData.tone,
          email_content: generatedEmail,
        },
        { withCredentials: true }
      );
      toast.success("Added to approval queue");
      setGeneratedEmail("");
      setGeneratedEmailData(null);
      setSelectedInvoice("");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to add to queue");
    } finally {
      setAddingToQueue(false);
    }
  };

  const pendingReminders = reminders.filter((r) => r.status === "Pending");
  const sentReminders = reminders.filter((r) => r.status === "Sent");

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
      <div data-testid="approval-queue-page">
        <div className="page-header flex items-center justify-between">
          <div>
            <h1 className="page-title">Approval Queue</h1>
            <p className="page-subtitle">
              Review and approve reminder emails before sending
            </p>
          </div>
          <Button
            onClick={handleGenerateReminders}
            disabled={generating}
            className="bg-[#1d4ed8] hover:bg-[#1e40af]"
            data-testid="generate-reminders-btn"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${generating ? "animate-spin" : ""}`} />
            {generating ? "Checking..." : "Check & Add Reminders"}
          </Button>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h4 className="font-semibold text-blue-800 mb-2">When are reminders created?</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• <strong>2 days before due</strong> → Polite reminder</li>
            <li>• <strong>On due date</strong> → Professional reminder</li>
            <li>• <strong>5 days after due</strong> → Firm reminder</li>
            <li>• <strong>10 days after due</strong> → Strict reminder</li>
          </ul>
          <p className="text-xs text-blue-600 mt-2">Note: Only works for invoices with "Sent" or "Overdue" status.</p>
        </div>

        {/* Pending Reminders */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            Pending Approval ({pendingReminders.length})
          </h2>
          <div className="card">
            {pendingReminders.length === 0 ? (
              <div className="empty-state py-12">
                <CheckCircle className="empty-state-icon" />
                <h3 className="empty-state-title">No pending reminders</h3>
                <p className="empty-state-text">
                  All reminders have been reviewed. Use "Check & Add Reminders" or generate custom emails below.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Tone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingReminders.map((reminder) => (
                    <TableRow key={reminder.reminder_id} data-testid={`reminder-row-${reminder.reminder_id}`}>
                      <TableCell className="font-medium">
                        {reminder.customer_name}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {reminder.customer_email}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {formatCurrency(reminder.amount)}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getToneBadgeClass(reminder.tone)}`}>
                          {reminder.tone}
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(reminder.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPreviewReminder(reminder)}
                            data-testid={`preview-reminder-${reminder.reminder_id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => setConfirmReminder(reminder)}
                            className="bg-green-600 hover:bg-green-700"
                            data-testid={`approve-reminder-${reminder.reminder_id}`}
                          >
                            <Send className="w-4 h-4 mr-1" />
                            Send
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(reminder)}
                            className="text-red-600 hover:text-red-700"
                            data-testid={`delete-reminder-${reminder.reminder_id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        {/* AI Email Generator */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            AI Email Generator
          </h2>
          <div className="bg-white rounded-lg border p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <Label>Select Invoice</Label>
                <Select value={selectedInvoice} onValueChange={setSelectedInvoice}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose invoice" />
                  </SelectTrigger>
                  <SelectContent>
                    {invoices.map((inv) => (
                      <SelectItem key={inv.invoice_id} value={inv.invoice_id}>
                        {inv.invoice_number} - {inv.customer_name} ({formatCurrency(inv.balance_due)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tone</Label>
                <Select value={selectedTone} onValueChange={setSelectedTone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Polite">Polite - Friendly & Warm</SelectItem>
                    <SelectItem value="Professional">Professional - Clear & Direct</SelectItem>
                    <SelectItem value="Firm">Firm - Assertive</SelectItem>
                    <SelectItem value="Strict">Strict - Final Notice</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleGenerateAIEmail}
                  disabled={generatingEmail || !selectedInvoice}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {generatingEmail ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Email
                    </>
                  )}
                </Button>
              </div>
            </div>

            {generatedEmail && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <Label>Generated Email</Label>
                  {generatedEmailData && (
                    <span className="text-sm text-gray-500">
                      To: {generatedEmailData.customer_name} ({generatedEmailData.customer_email})
                    </span>
                  )}
                </div>
                <Textarea
                  value={generatedEmail}
                  onChange={(e) => setGeneratedEmail(e.target.value)}
                  rows={10}
                  className="font-mono text-sm"
                />
                <div className="flex justify-end mt-4">
                  <Button
                    onClick={handleAddToQueue}
                    disabled={addingToQueue}
                    className="bg-[#1d4ed8] hover:bg-[#1e40af]"
                  >
                    {addingToQueue ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Add to Approval Queue
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sent Reminders */}
        {sentReminders.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Mail className="w-5 h-5 text-green-500" />
              Sent Reminders ({sentReminders.length})
            </h2>
            <div className="card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Tone</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sentReminders.map((reminder) => (
                    <TableRow key={reminder.reminder_id} className="opacity-60">
                      <TableCell className="font-medium">
                        {reminder.customer_name}
                      </TableCell>
                      <TableCell className="text-gray-600">
                        {reminder.customer_email}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {formatCurrency(reminder.amount)}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getToneBadgeClass(reminder.tone)}`}>
                          {reminder.tone}
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(reminder.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Preview Dialog */}
        <Dialog open={!!previewReminder} onOpenChange={() => setPreviewReminder(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Email Preview</DialogTitle>
              <DialogDescription>
                To: {previewReminder?.customer_email}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getToneBadgeClass(previewReminder?.tone)}`}>
                  {previewReminder?.tone} Tone
                </span>
              </div>
              <div
                className="bg-gray-50 border rounded-lg p-4 text-sm leading-relaxed max-h-64 overflow-y-auto whitespace-pre-wrap"
                data-testid="email-preview-content"
              >
                {previewReminder?.message || ""}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Confirm Send Dialog */}
        <AlertDialog open={!!confirmReminder} onOpenChange={() => setConfirmReminder(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Approve & Send Email</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to send this {confirmReminder?.tone?.toLowerCase()} reminder
                email to {confirmReminder?.customer_name} ({confirmReminder?.customer_email})?
                <br /><br />
                Amount: <strong>{formatCurrency(confirmReminder?.amount || 0)}</strong>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={sending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleApproveAndSend}
                disabled={sending}
                className="bg-green-600 hover:bg-green-700"
              >
                {sending ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Approve & Send
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
};

export default ApprovalQueue;
