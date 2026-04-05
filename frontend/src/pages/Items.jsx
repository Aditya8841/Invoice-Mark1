import { useState, useEffect, useRef } from "react";
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
import { Plus, MoreHorizontal, Pencil, Trash2, Package, Upload, Image, X } from "lucide-react";

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const UNITS = [
  "Pcs", "Hrs", "Days", "Nos", "Box", "Kg", "Gm", "Ltr", "Ml", "Mtr", "Sqft", "Sqm", "Unit"
];

const Items = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const dropRef = useRef(null);
  
  const [formData, setFormData] = useState({
    name: "",
    item_type: "Service",
    unit: "",
    image: null,
    rate: "",
    description: "",
  });

  const fetchItems = async () => {
    try {
      const response = await axios.get(`${API}/items`, {
        withCredentials: true,
      });
      setItems(response.data);
    } catch (error) {
      toast.error("Failed to fetch items");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleOpenDialog = (item = null) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name || "",
        item_type: item.item_type || "Service",
        unit: item.unit || "",
        image: item.image || null,
        rate: item.rate?.toString() || "",
        description: item.description || "",
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: "",
        item_type: "Service",
        unit: "",
        image: null,
        rate: "",
        description: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleImageUpload = (file) => {
    if (file.size > 1000000) {
      toast.error("Image size must be less than 1MB");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({ ...prev, image: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      handleImageUpload(file);
    } else {
      toast.error("Please drop an image file");
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      name: formData.name,
      item_type: formData.item_type,
      unit: formData.unit || null,
      image: formData.image,
      rate: parseFloat(formData.rate),
      description: formData.description || null,
    };

    try {
      if (editingItem) {
        await axios.put(`${API}/items/${editingItem.item_id}`, payload, {
          withCredentials: true,
        });
        toast.success("Item updated successfully");
      } else {
        await axios.post(`${API}/items`, payload, {
          withCredentials: true,
        });
        toast.success("Item added successfully");
      }
      setIsDialogOpen(false);
      fetchItems();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save item");
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete ${item.name}?`)) return;

    try {
      await axios.delete(`${API}/items/${item.item_id}`, {
        withCredentials: true,
      });
      toast.success("Item deleted");
      fetchItems();
    } catch (error) {
      toast.error("Failed to delete item");
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
      <div data-testid="items-page">
        <div className="page-header flex items-center justify-between">
          <div>
            <h1 className="page-title">Items</h1>
            <p className="page-subtitle">Manage your products and services</p>
          </div>
          <Button
            onClick={() => handleOpenDialog()}
            className="bg-[#1d4ed8] hover:bg-[#1e40af]"
            data-testid="add-item-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Item
          </Button>
        </div>

        <div className="card">
          {items.length === 0 ? (
            <div className="empty-state">
              <Package className="empty-state-icon" />
              <h3 className="empty-state-title">No items yet</h3>
              <p className="empty-state-text">
                Add products or services to include in your invoices
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16"></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Selling Price</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.item_id} data-testid={`item-row-${item.item_id}`}>
                    <TableCell>
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-10 h-10 object-cover rounded" />
                      ) : (
                        <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                          <Package className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{item.name}</div>
                      {item.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">{item.description}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        item.item_type === "Goods" 
                          ? "bg-purple-100 text-purple-700" 
                          : "bg-blue-100 text-blue-700"
                      }`}>
                        {item.item_type || "Service"}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-600">{item.unit || "-"}</TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {formatCurrency(item.rate)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" data-testid={`item-actions-${item.item_id}`}>
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenDialog(item)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(item)}
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

        {/* Item Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? "Edit Item" : "New Item"}
              </DialogTitle>
              <DialogDescription>
                {editingItem ? "Update item details" : "Add a new product or service"}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Type Toggle */}
              <div>
                <Label>Type</Label>
                <div className="flex gap-2 mt-2">
                  <Button
                    type="button"
                    variant={formData.item_type === "Goods" ? "default" : "outline"}
                    onClick={() => setFormData(prev => ({ ...prev, item_type: "Goods" }))}
                    className={formData.item_type === "Goods" ? "bg-purple-600 hover:bg-purple-700" : ""}
                  >
                    Goods
                  </Button>
                  <Button
                    type="button"
                    variant={formData.item_type === "Service" ? "default" : "outline"}
                    onClick={() => setFormData(prev => ({ ...prev, item_type: "Service" }))}
                    className={formData.item_type === "Service" ? "bg-[#1d4ed8]" : ""}
                  >
                    Service
                  </Button>
                </div>
              </div>

              {/* Name */}
              <div>
                <Label>Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  required
                  placeholder="e.g., UGC Content, AI Creatives"
                />
              </div>

              {/* Unit */}
              <div>
                <Label>Unit</Label>
                <Select value={formData.unit} onValueChange={(v) => setFormData(prev => ({ ...prev, unit: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {UNITS.map(u => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Image Upload - Drag & Drop */}
              <div>
                <Label>Image</Label>
                <div
                  ref={dropRef}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`mt-2 border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    isDragging ? "border-blue-500 bg-blue-50" : "border-gray-200"
                  }`}
                >
                  {formData.image ? (
                    <div className="relative inline-block">
                      <img src={formData.image} alt="Item" className="max-h-32 rounded" />
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, image: null }))}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Image className="w-10 h-10 mx-auto text-gray-400" />
                      <div className="text-sm text-gray-500">
                        Drag and drop an image here, or{" "}
                        <label className="text-blue-600 cursor-pointer hover:underline">
                          browse
                          <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                        </label>
                      </div>
                      <div className="text-xs text-gray-400">Max 1MB</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Selling Price */}
              <div>
                <Label>Selling Price (INR) *</Label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 bg-gray-100 border border-r-0 rounded-l text-sm text-gray-600">₹</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.rate}
                    onChange={(e) => setFormData(prev => ({ ...prev, rate: e.target.value }))}
                    required
                    placeholder="0.00"
                    className="rounded-l-none"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description of this item"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-[#1d4ed8] hover:bg-[#1e40af]">
                  {editingItem ? "Update" : "Save"} Item
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Items;
