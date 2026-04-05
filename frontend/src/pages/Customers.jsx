import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import axios from "axios";
import { API } from "@/App";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Pencil, Trash2, Users } from "lucide-react";

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    address: "",
  });

  const fetchCustomers = async () => {
    try {
      const response = await axios.get(`${API}/customers`, {
        withCredentials: true,
      });
      setCustomers(response.data);
    } catch (error) {
      toast.error("Failed to fetch customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
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
      });
    } else {
      setEditingCustomer(null);
      setFormData({
        name: "",
        company: "",
        email: "",
        phone: "",
        address: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (editingCustomer) {
        await axios.put(
          `${API}/customers/${editingCustomer.customer_id}`,
          formData,
          { withCredentials: true }
        );
        toast.success("Customer updated successfully");
      } else {
        await axios.post(`${API}/customers`, formData, {
          withCredentials: true,
        });
        toast.success("Customer added successfully");
      }
      setIsDialogOpen(false);
      fetchCustomers();
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
      fetchCustomers();
    } catch (error) {
      toast.error("Failed to delete customer");
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

  return (
    <Layout>
      <div data-testid="customers-page">
        <div className="page-header flex items-center justify-between">
          <div>
            <h1 className="page-title">Customers</h1>
            <p className="page-subtitle">Manage your client list</p>
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
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="text-right">Receivables</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.customer_id} data-testid={`customer-row-${customer.customer_id}`}>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell className="text-gray-600">{customer.company || "-"}</TableCell>
                    <TableCell className="text-gray-600">{customer.email}</TableCell>
                    <TableCell className="text-gray-600">{customer.phone || "-"}</TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {formatCurrency(customer.receivables || 0)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" data-testid={`customer-actions-${customer.customer_id}`}>
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
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
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingCustomer ? "Edit Customer" : "Add Customer"}
              </DialogTitle>
              <DialogDescription>
                {editingCustomer ? "Update customer details below." : "Fill in the customer details below."}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                  data-testid="customer-name-input"
                />
              </div>
              <div>
                <Label htmlFor="company">Company</Label>
                <Input
                  id="company"
                  value={formData.company}
                  onChange={(e) =>
                    setFormData({ ...formData, company: e.target.value })
                  }
                  data-testid="customer-company-input"
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                  data-testid="customer-email-input"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  data-testid="customer-phone-input"
                />
              </div>
              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  data-testid="customer-address-input"
                />
              </div>
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
