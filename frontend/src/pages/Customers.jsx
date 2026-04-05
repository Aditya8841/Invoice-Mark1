import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import axios from "axios";
import { API } from "@/App";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Pencil, Trash2, Users, Eye, Building } from "lucide-react";

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
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
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${config.class}`}>
      <span>{config.icon}</span>
      {status}
    </span>
  );
};

const Customers = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    gst_number: "",
    pan_number: "",
    onboarding_date: "",
    active_services: [],
    notes: "",
  });

  const fetchData = async () => {
    try {
      const [customersRes, itemsRes] = await Promise.all([
        axios.get(`${API}/customers`, { withCredentials: true }),
        axios.get(`${API}/items`, { withCredentials: true }),
      ]);
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

  const handleOpenDialog = (customer = null) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
        name: customer.name || "",
        company: customer.company || "",
        email: customer.email || "",
        phone: customer.phone || "",
        address: customer.address || "",
        city: customer.city || "",
        state: customer.state || "",
        pincode: customer.pincode || "",
        gst_number: customer.gst_number || "",
        pan_number: customer.pan_number || "",
        onboarding_date: customer.onboarding_date ? customer.onboarding_date.split("T")[0] : "",
        active_services: customer.active_services || [],
        notes: customer.notes || "",
      });
    } else {
      setEditingCustomer(null);
      setFormData({
        name: "",
        company: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        state: "",
        pincode: "",
        gst_number: "",
        pan_number: "",
        onboarding_date: new Date().toISOString().split("T")[0],
        active_services: [],
        notes: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleServiceToggle = (itemId) => {
    setFormData(prev => ({
      ...prev,
      active_services: prev.active_services.includes(itemId)
        ? prev.active_services.filter(id => id !== itemId)
        : [...prev.active_services, itemId]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      ...formData,
      onboarding_date: formData.onboarding_date || null,
    };

    try {
      if (editingCustomer) {
        await axios.put(
          `${API}/customers/${editingCustomer.customer_id}`,
          payload,
          { withCredentials: true }
        );
        toast.success("Customer updated successfully");
      } else {
        await axios.post(`${API}/customers`, payload, {
          withCredentials: true,
        });
        toast.success("Customer added successfully");
      }
      setIsDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save customer");
    }
  };

  const handleDelete = async (customer) => {
    if (!window.confirm(`Delete ${customer.name}?`)) return;

    try {
      await axios.delete(`${API}/customers/${customer.customer_id}`, {
        withCredentials: true,
      });
      toast.success("Customer deleted");
      fetchData();
    } catch (error) {
      toast.error("Failed to delete customer");
    }
  };

  const handleViewProfile = (customer) => {
    navigate(`/customers/${customer.customer_id}`);
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
      <div data-testid="customers-page">
        <div className="page-header flex items-center justify-between">
          <div>
            <h1 className="page-title">Customers</h1>
            <p className="page-subtitle">Manage your client relationships</p>
          </div>
          <Button
            onClick={() => handleOpenDialog()}
            className="bg-[#1d4ed8] hover:bg-[#1e40af]"
            data-testid="add-customer-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Customer
          </Button>
        </div>

        <div className="card">
          {customers.length === 0 ? (
            <div className="empty-state">
              <Users className="empty-state-icon" />
              <h3 className="empty-state-title">No customers yet</h3>
              <p className="empty-state-text">
                Add your first customer to start creating invoices
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total Billed</TableHead>
                  <TableHead className="text-right">Balance Due</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow 
                    key={customer.customer_id} 
                    data-testid={`customer-row-${customer.customer_id}`}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => handleViewProfile(customer)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold">
                          {customer.name[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium">{customer.name}</div>
                          {customer.company && (
                            <div className="text-sm text-gray-500 flex items-center gap-1">
                              <Building className="w-3 h-3" />
                              {customer.company}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div>{customer.email}</div>
                        {customer.phone && <div className="text-gray-500">{customer.phone}</div>}
                      </div>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {getStatusBadge(customer.status)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {formatCurrency(customer.total_billed || 0)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      <span className={customer.receivables > 0 ? "text-red-600" : "text-green-600"}>
                        {formatCurrency(customer.receivables || 0)}
                      </span>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" data-testid={`customer-actions-${customer.customer_id}`}>
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewProfile(customer)}>
                            <Eye className="w-4 h-4 mr-2" />
                            View Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleOpenDialog(customer)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(customer)}
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
              <DialogTitle>
                {editingCustomer ? "Edit Customer" : "Add Customer"}
              </DialogTitle>
              <DialogDescription>
                {editingCustomer ? "Update customer details below." : "Fill in the customer details below."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    data-testid="customer-name-input"
                  />
                </div>
                <div>
                  <Label htmlFor="company">Company Name</Label>
                  <Input
                    id="company"
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    data-testid="customer-company-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    data-testid="customer-email-input"
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    data-testid="customer-phone-input"
                  />
                </div>
              </div>

              {/* Address */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Business Address</h4>
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="address">Street Address</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Building, Street"
                      data-testid="customer-address-input"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="pincode">Pincode</Label>
                      <Input
                        id="pincode"
                        value={formData.pincode}
                        onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Business Details */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Business Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="gst_number">GST Number</Label>
                    <Input
                      id="gst_number"
                      value={formData.gst_number}
                      onChange={(e) => setFormData({ ...formData, gst_number: e.target.value.toUpperCase() })}
                      placeholder="22AAAAA0000A1Z5"
                      data-testid="customer-gst-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="pan_number">PAN Number</Label>
                    <Input
                      id="pan_number"
                      value={formData.pan_number}
                      onChange={(e) => setFormData({ ...formData, pan_number: e.target.value.toUpperCase() })}
                      placeholder="AAAAA0000A"
                      data-testid="customer-pan-input"
                    />
                  </div>
                </div>
              </div>

              {/* CRM Fields */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">CRM Details</h4>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="onboarding_date">Onboarding Date</Label>
                    <Input
                      id="onboarding_date"
                      type="date"
                      value={formData.onboarding_date}
                      onChange={(e) => setFormData({ ...formData, onboarding_date: e.target.value })}
                    />
                  </div>

                  {items.length > 0 && (
                    <div>
                      <Label>Active Services</Label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {items.map((item) => (
                          <button
                            key={item.item_id}
                            type="button"
                            onClick={() => handleServiceToggle(item.item_id)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                              formData.active_services.includes(item.item_id)
                                ? "bg-blue-600 text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                          >
                            {item.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="notes">Notes / Remarks</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Any additional notes about this customer..."
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
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
                  data-testid="save-customer-btn"
                >
                  {editingCustomer ? "Update" : "Add"} Customer
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Customers;
