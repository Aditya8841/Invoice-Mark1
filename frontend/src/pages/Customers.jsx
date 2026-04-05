import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Plus, MoreHorizontal, Pencil, Trash2, Users, Eye, Building, X, Upload } from "lucide-react";

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

const SALUTATIONS = ["Mr.", "Mrs.", "Ms.", "Dr.", "Prof."];
const PAYMENT_TERMS = ["Due on Receipt", "Net 15", "Net 30", "Net 45", "Net 60"];

const Customers = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [activeTab, setActiveTab] = useState("other");
  
  const [formData, setFormData] = useState({
    customer_type: "Business",
    salutation: "",
    first_name: "",
    last_name: "",
    company: "",
    display_name: "",
    email: "",
    work_phone: "",
    mobile: "",
    // Address
    billing_address: "",
    billing_city: "",
    billing_state: "",
    billing_pincode: "",
    shipping_address: "",
    shipping_city: "",
    shipping_state: "",
    shipping_pincode: "",
    // Other Details
    pan_number: "",
    gst_number: "",
    payment_terms: "Due on Receipt",
    documents: [],
    // Contact Persons
    contact_persons: [],
    // Custom Fields
    custom_fields: [],
    // Remarks
    remarks: "",
    // CRM
    onboarding_date: "",
    active_services: [],
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

  // Auto-generate display name
  useEffect(() => {
    if (!editingCustomer) {
      let displayName = "";
      if (formData.customer_type === "Business" && formData.company) {
        displayName = formData.company;
      } else {
        const parts = [formData.salutation, formData.first_name, formData.last_name].filter(Boolean);
        displayName = parts.join(" ");
      }
      if (displayName && !formData.display_name) {
        setFormData(prev => ({ ...prev, display_name: displayName }));
      }
    }
  }, [formData.salutation, formData.first_name, formData.last_name, formData.company, formData.customer_type, editingCustomer]);

  const resetForm = () => {
    setFormData({
      customer_type: "Business",
      salutation: "",
      first_name: "",
      last_name: "",
      company: "",
      display_name: "",
      email: "",
      work_phone: "",
      mobile: "",
      billing_address: "",
      billing_city: "",
      billing_state: "",
      billing_pincode: "",
      shipping_address: "",
      shipping_city: "",
      shipping_state: "",
      shipping_pincode: "",
      pan_number: "",
      gst_number: "",
      payment_terms: "Due on Receipt",
      documents: [],
      contact_persons: [],
      custom_fields: [],
      remarks: "",
      onboarding_date: new Date().toISOString().split("T")[0],
      active_services: [],
    });
    setActiveTab("other");
  };

  const handleOpenDialog = (customer = null) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData({
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
        documents: customer.documents || [],
        contact_persons: customer.contact_persons || [],
        custom_fields: customer.custom_fields || [],
        remarks: customer.remarks || customer.notes || "",
        onboarding_date: customer.onboarding_date ? customer.onboarding_date.split("T")[0] : "",
        active_services: customer.active_services || [],
      });
    } else {
      setEditingCustomer(null);
      resetForm();
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

  const handleAddContactPerson = () => {
    setFormData(prev => ({
      ...prev,
      contact_persons: [...prev.contact_persons, { name: "", email: "", phone: "", designation: "" }]
    }));
  };

  const handleRemoveContactPerson = (index) => {
    setFormData(prev => ({
      ...prev,
      contact_persons: prev.contact_persons.filter((_, i) => i !== index)
    }));
  };

  const handleContactPersonChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      contact_persons: prev.contact_persons.map((cp, i) => 
        i === index ? { ...cp, [field]: value } : cp
      )
    }));
  };

  const handleAddCustomField = () => {
    setFormData(prev => ({
      ...prev,
      custom_fields: [...prev.custom_fields, { label: "", value: "" }]
    }));
  };

  const handleRemoveCustomField = (index) => {
    setFormData(prev => ({
      ...prev,
      custom_fields: prev.custom_fields.filter((_, i) => i !== index)
    }));
  };

  const handleCustomFieldChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      custom_fields: prev.custom_fields.map((cf, i) => 
        i === index ? { ...cf, [field]: value } : cf
      )
    }));
  };

  const handleDocumentUpload = (e) => {
    const files = Array.from(e.target.files);
    if (formData.documents.length + files.length > 3) {
      toast.error("Maximum 3 documents allowed");
      return;
    }
    
    files.forEach(file => {
      if (file.size > 2000000) {
        toast.error("File size must be less than 2MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          documents: [...prev.documents, reader.result]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveDocument = (index) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      ...formData,
      onboarding_date: formData.onboarding_date || null,
      contact_persons: formData.contact_persons.filter(cp => cp.name || cp.email),
      custom_fields: formData.custom_fields.filter(cf => cf.label && cf.value),
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
    if (!window.confirm(`Delete ${customer.display_name || customer.name}?`)) return;

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
            New Customer
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
                          {(customer.display_name || customer.name || "?")[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium">{customer.display_name || customer.name}</div>
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
                        {(customer.work_phone || customer.mobile || customer.phone) && (
                          <div className="text-gray-500">{customer.work_phone || customer.mobile || customer.phone}</div>
                        )}
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

        {/* Customer Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCustomer ? "Edit Customer" : "New Customer"}
              </DialogTitle>
              <DialogDescription>
                {editingCustomer ? "Update customer details" : "Add a new customer to your list"}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Customer Type Toggle */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={formData.customer_type === "Business" ? "default" : "outline"}
                  onClick={() => setFormData(prev => ({ ...prev, customer_type: "Business" }))}
                  className={formData.customer_type === "Business" ? "bg-[#1d4ed8]" : ""}
                >
                  Business
                </Button>
                <Button
                  type="button"
                  variant={formData.customer_type === "Individual" ? "default" : "outline"}
                  onClick={() => setFormData(prev => ({ ...prev, customer_type: "Individual" }))}
                  className={formData.customer_type === "Individual" ? "bg-[#1d4ed8]" : ""}
                >
                  Individual
                </Button>
              </div>

              {/* Primary Contact */}
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-2">
                  <Label>Salutation</Label>
                  <Select value={formData.salutation} onValueChange={(v) => setFormData(prev => ({ ...prev, salutation: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="--" />
                    </SelectTrigger>
                    <SelectContent>
                      {SALUTATIONS.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-5">
                  <Label>First Name *</Label>
                  <Input
                    value={formData.first_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                    required
                  />
                </div>
                <div className="col-span-5">
                  <Label>Last Name</Label>
                  <Input
                    value={formData.last_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                  />
                </div>
              </div>

              {/* Company & Display Name */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Company Name</Label>
                  <Input
                    value={formData.company}
                    onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Display Name *</Label>
                  <Input
                    value={formData.display_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                    required
                  />
                </div>
              </div>

              {/* Currency (Fixed) */}
              <div className="w-1/2">
                <Label>Currency</Label>
                <Input value="INR - Indian Rupee" disabled className="bg-gray-50" />
              </div>

              {/* Contact Info */}
              <div>
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Work Phone</Label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 bg-gray-100 border border-r-0 rounded-l text-sm text-gray-600">+91</span>
                    <Input
                      value={formData.work_phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, work_phone: e.target.value }))}
                      className="rounded-l-none"
                      placeholder="Work phone"
                    />
                  </div>
                </div>
                <div>
                  <Label>Mobile</Label>
                  <div className="flex">
                    <span className="inline-flex items-center px-3 bg-gray-100 border border-r-0 rounded-l text-sm text-gray-600">+91</span>
                    <Input
                      value={formData.mobile}
                      onChange={(e) => setFormData(prev => ({ ...prev, mobile: e.target.value }))}
                      className="rounded-l-none"
                      placeholder="Mobile"
                    />
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="border rounded-lg">
                <TabsList className="w-full justify-start border-b rounded-none bg-gray-50 px-2">
                  <TabsTrigger value="other">Other Details</TabsTrigger>
                  <TabsTrigger value="address">Address</TabsTrigger>
                  <TabsTrigger value="contacts">Contact Persons</TabsTrigger>
                  <TabsTrigger value="custom">Custom Fields</TabsTrigger>
                  <TabsTrigger value="remarks">Remarks</TabsTrigger>
                </TabsList>

                {/* Other Details Tab */}
                <TabsContent value="other" className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>PAN</Label>
                      <Input
                        value={formData.pan_number}
                        onChange={(e) => setFormData(prev => ({ ...prev, pan_number: e.target.value.toUpperCase() }))}
                        placeholder="AAAAA0000A"
                      />
                    </div>
                    <div>
                      <Label>GST Number</Label>
                      <Input
                        value={formData.gst_number}
                        onChange={(e) => setFormData(prev => ({ ...prev, gst_number: e.target.value.toUpperCase() }))}
                        placeholder="22AAAAA0000A1Z5"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label>Payment Terms</Label>
                    <Select value={formData.payment_terms} onValueChange={(v) => setFormData(prev => ({ ...prev, payment_terms: v }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_TERMS.map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Documents (Max 3)</Label>
                    <div className="mt-2 flex flex-wrap gap-3">
                      {formData.documents.map((doc, i) => (
                        <div key={i} className="relative w-20 h-20 border rounded overflow-hidden">
                          <img src={doc} alt={`Doc ${i+1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemoveDocument(i)}
                            className="absolute top-0 right-0 bg-red-500 text-white w-5 h-5 flex items-center justify-center text-xs rounded-bl"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      {formData.documents.length < 3 && (
                        <label className="w-20 h-20 border-2 border-dashed rounded flex flex-col items-center justify-center cursor-pointer text-gray-400 hover:border-blue-400 hover:text-blue-500">
                          <Upload className="w-5 h-5" />
                          <span className="text-xs mt-1">Upload</span>
                          <input type="file" accept="image/*,.pdf" onChange={handleDocumentUpload} className="hidden" />
                        </label>
                      )}
                    </div>
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
                </TabsContent>

                {/* Address Tab */}
                <TabsContent value="address" className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h4 className="font-medium">Billing Address</h4>
                      <Input
                        placeholder="Street Address"
                        value={formData.billing_address}
                        onChange={(e) => setFormData(prev => ({ ...prev, billing_address: e.target.value }))}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="City"
                          value={formData.billing_city}
                          onChange={(e) => setFormData(prev => ({ ...prev, billing_city: e.target.value }))}
                        />
                        <Input
                          placeholder="State"
                          value={formData.billing_state}
                          onChange={(e) => setFormData(prev => ({ ...prev, billing_state: e.target.value }))}
                        />
                      </div>
                      <Input
                        placeholder="Pincode"
                        value={formData.billing_pincode}
                        onChange={(e) => setFormData(prev => ({ ...prev, billing_pincode: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-3">
                      <h4 className="font-medium">Shipping Address</h4>
                      <Input
                        placeholder="Street Address"
                        value={formData.shipping_address}
                        onChange={(e) => setFormData(prev => ({ ...prev, shipping_address: e.target.value }))}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="City"
                          value={formData.shipping_city}
                          onChange={(e) => setFormData(prev => ({ ...prev, shipping_city: e.target.value }))}
                        />
                        <Input
                          placeholder="State"
                          value={formData.shipping_state}
                          onChange={(e) => setFormData(prev => ({ ...prev, shipping_state: e.target.value }))}
                        />
                      </div>
                      <Input
                        placeholder="Pincode"
                        value={formData.shipping_pincode}
                        onChange={(e) => setFormData(prev => ({ ...prev, shipping_pincode: e.target.value }))}
                      />
                    </div>
                  </div>
                </TabsContent>

                {/* Contact Persons Tab */}
                <TabsContent value="contacts" className="p-4 space-y-4">
                  {formData.contact_persons.map((cp, i) => (
                    <div key={i} className="border rounded p-3 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-sm">Contact Person {i + 1}</span>
                        <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveContactPerson(i)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Name"
                          value={cp.name}
                          onChange={(e) => handleContactPersonChange(i, "name", e.target.value)}
                        />
                        <Input
                          placeholder="Designation"
                          value={cp.designation}
                          onChange={(e) => handleContactPersonChange(i, "designation", e.target.value)}
                        />
                        <Input
                          placeholder="Email"
                          value={cp.email}
                          onChange={(e) => handleContactPersonChange(i, "email", e.target.value)}
                        />
                        <Input
                          placeholder="Phone"
                          value={cp.phone}
                          onChange={(e) => handleContactPersonChange(i, "phone", e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={handleAddContactPerson}>
                    <Plus className="w-4 h-4 mr-2" /> Add Contact Person
                  </Button>
                </TabsContent>

                {/* Custom Fields Tab */}
                <TabsContent value="custom" className="p-4 space-y-4">
                  {formData.custom_fields.map((cf, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <Input
                        placeholder="Label"
                        value={cf.label}
                        onChange={(e) => handleCustomFieldChange(i, "label", e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        placeholder="Value"
                        value={cf.value}
                        onChange={(e) => handleCustomFieldChange(i, "value", e.target.value)}
                        className="flex-1"
                      />
                      <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveCustomField(i)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" onClick={handleAddCustomField}>
                    <Plus className="w-4 h-4 mr-2" /> Add Custom Field
                  </Button>
                </TabsContent>

                {/* Remarks Tab */}
                <TabsContent value="remarks" className="p-4">
                  <Textarea
                    value={formData.remarks}
                    onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                    placeholder="Add any notes or remarks about this customer..."
                    rows={5}
                  />
                </TabsContent>
              </Tabs>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-[#1d4ed8] hover:bg-[#1e40af]">
                  {editingCustomer ? "Update" : "Save"} Customer
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
