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
import { Plus, MoreHorizontal, Pencil, Trash2, Package } from "lucide-react";

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const Items = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
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
        rate: item.rate?.toString() || "",
        description: item.description || "",
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: "",
        rate: "",
        description: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      name: formData.name,
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
            <p className="page-subtitle">Manage your services and products</p>
          </div>
          <Button
            onClick={() => handleOpenDialog()}
            className="bg-[#1d4ed8] hover:bg-[#1e40af]"
            data-testid="add-item-btn"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>

        <div className="card">
          {items.length === 0 ? (
            <div className="empty-state">
              <Package className="empty-state-icon" />
              <h3 className="empty-state-title">No items yet</h3>
              <p className="empty-state-text">
                Add services or products to include in your invoices
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Rate</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.item_id} data-testid={`item-row-${item.item_id}`}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-gray-600">
                      {item.description || "-"}
                    </TableCell>
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

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingItem ? "Edit Item" : "Add Item"}
              </DialogTitle>
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
                  placeholder="e.g., UGC's, AI Creatives"
                  data-testid="item-name-input"
                />
              </div>
              <div>
                <Label htmlFor="rate">Rate (₹) *</Label>
                <Input
                  id="rate"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.rate}
                  onChange={(e) =>
                    setFormData({ ...formData, rate: e.target.value })
                  }
                  required
                  placeholder="e.g., 15000"
                  data-testid="item-rate-input"
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Optional description"
                  data-testid="item-description-input"
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
                  data-testid="save-item-btn"
                >
                  {editingItem ? "Update" : "Add"} Item
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
