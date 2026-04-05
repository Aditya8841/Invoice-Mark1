import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
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
  DialogFooter,
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
import { RefreshCw, Send, Trash2, Eye, CheckCircle, Mail, AlertCircle } from "lucide-react";

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
    Polite: "tone-polite",
    Professional: "tone-professional",
    Firm: "tone-firm",
    Strict: "tone-strict",
  };
  return classes[tone] || "tone-professional";
};

const getStatusBadge = (status) => {
  if (status === "Pending") {
    return <span className="status-badge status-pending">{status}</span>;
  }
  if (status === "Sent") {
    return <span className="status-badge status-paid">{status}</span>;
  }
  return <span className="status-badge status-draft">{status}</span>;
};

const ApprovalQueue = () => {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [previewReminder, setPreviewReminder] = useState(null);
  const [confirmReminder, setConfirmReminder] = useState(null);
  const [sending, setSending] = useState(false);

  const fetchReminders = async () => {
    try {
      const response = await axios.get(`${API}/reminders`, {
        withCredentials: true,
      });
      setReminders(response.data);
    } catch (error) {
      toast.error("Failed to fetch reminders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
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
      fetchReminders();
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
      fetchReminders();
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
      fetchReminders();
    } catch (error) {
      toast.error("Failed to delete reminder");
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
                  All reminders have been reviewed. Click "Generate Reminders" to check for new ones.
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
                        <span className={`status-badge ${getToneBadgeClass(reminder.tone)}`}>
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
                        <span className={`status-badge ${getToneBadgeClass(reminder.tone)}`}>
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
                <span className={`status-badge ${getToneBadgeClass(previewReminder?.tone)}`}>
                  {previewReminder?.tone} Tone
                </span>
              </div>
              <div
                className="message-preview"
                dangerouslySetInnerHTML={{ __html: previewReminder?.message || "" }}
              />
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
