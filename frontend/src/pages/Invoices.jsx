import { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
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

const Invoices = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);
  const [dueDate, setDueDate] = useState("");
  const [tax, setTax] = useState("0");
  const [notes, setNotes] = useState("");

  const fetchData = async () => {
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
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenDialog = () => {
    setSelectedCustomer("");
    setSelectedItems([]);
    setDueDate("");
    setTax("0");
    setNotes("");
    setIsDialogOpen(true);
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
        { item_id: item.item_id, name: item.name, rate: item.rate, quantity: 1 },
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

  const generatePDF = (invoice) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    // Header
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text("INVOICE", pageWidth / 2, 25, { align: "center" });

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(invoice.invoice_number, pageWidth / 2, 33, { align: "center" });

    // From (Business Info)
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("FROM:", 20, 50);
    doc.setFont("helvetica", "normal");
    doc.text(user?.business_name || user?.name || "Your Business", 20, 57);
    if (user?.business_address) {
      doc.text(user.business_address, 20, 64);
    }
    if (user?.business_email) {
      doc.text(user.business_email, 20, 71);
    }
    if (user?.business_phone) {
      doc.text(user.business_phone, 20, 78);
    }

    // To (Customer Info)
    doc.setFont("helvetica", "bold");
    doc.text("TO:", 120, 50);
    doc.setFont("helvetica", "normal");
    doc.text(invoice.customer_name, 120, 57);
    if (invoice.customer_address) {
      doc.text(invoice.customer_address, 120, 64);
    }
    doc.text(invoice.customer_email, 120, 71);

    // Dates
    doc.setFont("helvetica", "bold");
    doc.text("Issue Date:", 20, 95);
    doc.text("Due Date:", 20, 102);
    doc.setFont("helvetica", "normal");
    doc.text(formatDate(invoice.issue_date), 55, 95);
    doc.text(formatDate(invoice.due_date), 55, 102);

    // Items Table Header
    let yPos = 120;
    doc.setFillColor(240, 240, 240);
    doc.rect(20, yPos - 5, pageWidth - 40, 10, "F");
    doc.setFont("helvetica", "bold");
    doc.text("Item", 22, yPos);
    doc.text("Qty", 100, yPos);
    doc.text("Rate", 125, yPos);
    doc.text("Amount", 160, yPos);

    // Items
    doc.setFont("helvetica", "normal");
    yPos += 12;
    invoice.items.forEach((item) => {
      doc.text(item.name, 22, yPos);
      doc.text(item.quantity.toString(), 100, yPos);
      doc.text(formatCurrency(item.rate), 125, yPos);
      doc.text(formatCurrency(item.rate * item.quantity), 160, yPos);
      yPos += 8;
    });

    // Totals
    yPos += 10;
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 10;

    doc.text("Subtotal:", 125, yPos);
    doc.text(formatCurrency(invoice.subtotal), 160, yPos);
    yPos += 8;

    if (invoice.tax > 0) {
      doc.text("Tax:", 125, yPos);
      doc.text(formatCurrency(invoice.tax), 160, yPos);
      yPos += 8;
    }

    doc.setFont("helvetica", "bold");
    doc.text("Total:", 125, yPos);
    doc.text(formatCurrency(invoice.total), 160, yPos);
    yPos += 8;

    doc.setTextColor(invoice.balance_due > 0 ? 185 : 21, 28, 28);
    doc.text("Balance Due:", 125, yPos);
    doc.text(formatCurrency(invoice.balance_due), 160, yPos);

    // Notes
    if (invoice.notes) {
      yPos += 20;
      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.text("Notes:", 20, yPos);
      doc.setFont("helvetica", "normal");
      yPos += 7;
      doc.text(invoice.notes, 20, yPos);
    }

    // Save
    doc.save(`${invoice.invoice_number}.pdf`);
    toast.success("PDF downloaded");
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
          <Button
            onClick={handleOpenDialog}
            className="bg-[#1d4ed8] hover:bg-[#1e40af]"
            data-testid="create-invoice-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Invoice
          </Button>
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

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Invoice</DialogTitle>
              <DialogDescription>Select a customer and add items to create a new invoice.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Customer Selection */}
              <div>
                <Label>Customer *</Label>
                <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
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
              </div>

              {/* Add Items */}
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

                {/* Selected Items */}
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

              {/* Due Date */}
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

              {/* Tax */}
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

              {/* Notes */}
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

              {/* Totals */}
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
      </div>
    </Layout>
  );
};

export default Invoices;
