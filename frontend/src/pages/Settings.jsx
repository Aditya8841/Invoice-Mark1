import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import axios from "axios";
import { API, useAuth } from "@/App";
import { toast } from "sonner";
import { Save, Building } from "lucide-react";

const Settings = () => {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    business_name: "",
    business_address: "",
    business_phone: "",
    business_email: "",
  });

  useEffect(() => {
    if (user) {
      setFormData({
        business_name: user.business_name || "",
        business_address: user.business_address || "",
        business_phone: user.business_phone || "",
        business_email: user.business_email || "",
      });
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.put(`${API}/auth/profile`, formData, {
        withCredentials: true,
      });
      setUser(response.data);
      toast.success("Business profile updated");
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div data-testid="settings-page">
        <div className="page-header">
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">Manage your business profile</p>
        </div>

        <div className="card max-w-2xl">
          <div className="card-header flex items-center gap-3">
            <Building className="w-5 h-5 text-gray-500" />
            <h2 className="card-title">Business Information</h2>
          </div>
          <div className="card-body">
            <p className="text-sm text-gray-500 mb-6">
              This information will appear on your invoices as the sender details.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="business_name">Business Name</Label>
                <Input
                  id="business_name"
                  value={formData.business_name}
                  onChange={(e) =>
                    setFormData({ ...formData, business_name: e.target.value })
                  }
                  placeholder="Your company or agency name"
                  data-testid="business-name-input"
                />
              </div>

              <div>
                <Label htmlFor="business_address">Business Address</Label>
                <Textarea
                  id="business_address"
                  value={formData.business_address}
                  onChange={(e) =>
                    setFormData({ ...formData, business_address: e.target.value })
                  }
                  placeholder="Street address, city, state, PIN code"
                  rows={3}
                  data-testid="business-address-input"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="business_email">Business Email</Label>
                  <Input
                    id="business_email"
                    type="email"
                    value={formData.business_email}
                    onChange={(e) =>
                      setFormData({ ...formData, business_email: e.target.value })
                    }
                    placeholder="contact@yourbusiness.com"
                    data-testid="business-email-input"
                  />
                </div>

                <div>
                  <Label htmlFor="business_phone">Business Phone</Label>
                  <Input
                    id="business_phone"
                    value={formData.business_phone}
                    onChange={(e) =>
                      setFormData({ ...formData, business_phone: e.target.value })
                    }
                    placeholder="+91 98765 43210"
                    data-testid="business-phone-input"
                  />
                </div>
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  className="bg-[#1d4ed8] hover:bg-[#1e40af]"
                  disabled={loading}
                  data-testid="save-settings-btn"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>

        {/* Account Info */}
        <div className="card max-w-2xl mt-6">
          <div className="card-header">
            <h2 className="card-title">Account Information</h2>
          </div>
          <div className="card-body">
            <div className="flex items-center gap-4">
              {user?.picture ? (
                <img
                  src={user.picture}
                  alt={user.name}
                  className="w-16 h-16 rounded-full"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-xl font-semibold text-gray-600">
                  {user?.name?.[0] || "U"}
                </div>
              )}
              <div>
                <h3 className="font-semibold text-lg">{user?.name}</h3>
                <p className="text-gray-500">{user?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;
