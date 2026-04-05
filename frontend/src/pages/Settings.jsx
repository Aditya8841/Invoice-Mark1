import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import axios from "axios";
import { API, useAuth } from "@/App";
import { toast } from "sonner";
import {
  Save,
  Building,
  Upload,
  X,
  Plus,
  Trash2,
  Globe,
  Calendar,
  Clock,
  Languages,
} from "lucide-react";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu & Kashmir", "Ladakh", "Puducherry", "Chandigarh",
  "Andaman & Nicobar", "Dadra & Nagar Haveli", "Daman & Diu", "Lakshadweep",
];

const BUSINESS_TYPES = [
  "Sole Proprietorship", "Partnership", "LLP", "Private Limited",
  "Public Limited", "One Person Company", "Section 8 Company",
  "Freelancer / Individual", "Trust", "Society", "HUF", "Other",
];

const INDUSTRIES = [
  "Agency or Sales House", "Advertising", "Agriculture", "Automotive",
  "Banking & Finance", "Construction", "Consulting", "E-commerce",
  "Education", "Engineering", "Entertainment", "Food & Beverage",
  "Healthcare", "Hospitality", "Information Technology", "Insurance",
  "Legal", "Logistics", "Manufacturing", "Media", "Mining",
  "Non-Profit", "Pharmaceuticals", "Real Estate", "Retail",
  "Telecommunications", "Textiles", "Transportation", "Travel", "Other",
];

const COMPANY_ID_LABELS = [
  "PAN", "TAN", "GSTIN", "CIN", "LLPIN", "UDYAM", "IEC", "Other",
];

const Settings = () => {
  const { user, setUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("org");

  const [form, setForm] = useState({
    // Org Profile
    org_logo: "",
    business_name: "",
    business_type: "",
    industry: "",
    org_location: "India",
    street1: "",
    street2: "",
    city: "",
    pin_code: "",
    state: "",
    business_phone: "",
    fax_number: "",
    business_email: "",
    website_url: "",
    different_payment_address: false,
    payment_street1: "",
    payment_street2: "",
    payment_city: "",
    payment_pin_code: "",
    payment_state: "",
    // Fiscal / Locale
    base_currency: "INR",
    fiscal_year: "April - March",
    org_language: "English",
    communication_languages: "English",
    timezone: "GMT+5:30 India Standard Time Asia/Calcutta",
    date_format: "dd/MM/yyyy",
    company_id_label: "PAN",
    company_id_value: "",
    // Additional fields
    additional_fields: [],
  });

  useEffect(() => {
    if (user) {
      setForm((prev) => ({
        ...prev,
        org_logo: user.org_logo || user.invoice_logo || "",
        business_name: user.business_name || "",
        business_type: user.business_type || "",
        industry: user.industry || "",
        org_location: user.org_location || "India",
        street1: user.street1 || "",
        street2: user.street2 || "",
        city: user.city || "",
        pin_code: user.pin_code || "",
        state: user.state || "",
        business_phone: user.business_phone || "",
        fax_number: user.fax_number || "",
        business_email: user.business_email || "",
        website_url: user.website_url || "",
        different_payment_address: user.different_payment_address || false,
        payment_street1: user.payment_street1 || "",
        payment_street2: user.payment_street2 || "",
        payment_city: user.payment_city || "",
        payment_pin_code: user.payment_pin_code || "",
        payment_state: user.payment_state || "",
        base_currency: user.base_currency || "INR",
        fiscal_year: user.fiscal_year || "April - March",
        org_language: user.org_language || "English",
        communication_languages: user.communication_languages || "English",
        timezone: user.timezone || "GMT+5:30 India Standard Time Asia/Calcutta",
        date_format: user.date_format || "dd/MM/yyyy",
        company_id_label: user.company_id_label || "PAN",
        company_id_value: user.company_id_value || "",
        additional_fields: user.additional_fields || [],
      }));
    }
  }, [user]);

  const set = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/bmp"];
    if (!validTypes.includes(file.type)) {
      toast.error("Allowed formats: jpg, jpeg, png, gif, bmp");
      return;
    }
    if (file.size > 1024 * 1024) {
      toast.error("Logo must be less than 1MB");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => set("org_logo", reader.result);
    reader.readAsDataURL(file);
  };

  const addField = () => set("additional_fields", [...form.additional_fields, { label: "", value: "" }]);
  const updateField = (i, key, val) => {
    const updated = [...form.additional_fields];
    updated[i] = { ...updated[i], [key]: val };
    set("additional_fields", updated);
  };
  const removeField = (i) => set("additional_fields", form.additional_fields.filter((_, idx) => idx !== i));

  const handleSave = async () => {
    if (!form.business_name.trim()) {
      toast.error("Organization Name is required");
      return;
    }
    setSaving(true);
    try {
      // Build the address string for legacy compatibility
      const addressParts = [form.street1, form.street2, form.city, form.state, form.pin_code].filter(Boolean);
      const payload = {
        ...form,
        business_address: addressParts.join(", "),
        invoice_logo: form.org_logo, // Sync logo to invoice_logo too
        additional_fields: form.additional_fields.filter((f) => f.label || f.value),
      };
      const response = await axios.put(`${API}/auth/profile`, payload, { withCredentials: true });
      setUser(response.data);
      toast.success("Organization profile saved");
    } catch (error) {
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: "org", label: "Organization" },
    { id: "locale", label: "Locale & Currency" },
    { id: "fields", label: "Additional Fields" },
  ];

  return (
    <Layout>
      <div data-testid="settings-page">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900">Settings</h1>
            <p className="text-sm text-gray-500 mt-0.5">Configure your organization profile</p>
          </div>
          <Button onClick={handleSave} disabled={saving} className="bg-[#1d4ed8] hover:bg-[#1e40af]" data-testid="save-settings-btn">
            <Save className="w-4 h-4 mr-1.5" /> {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mb-6 border-b border-gray-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
              data-testid={`settings-tab-${tab.id}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* =================== ORGANIZATION TAB =================== */}
        {activeTab === "org" && (
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <Building className="w-4 h-4 text-gray-400" /> Organization Profile
              </h2>
              <p className="text-xs text-gray-500 mt-1">This information appears on your invoices, PDFs, and emails.</p>
            </div>

            <div className="p-6 space-y-6">
              {/* Logo Upload */}
              <div>
                <Label className="text-xs text-gray-500 mb-2 block">Organization Logo</Label>
                <div className="flex items-start gap-4">
                  {form.org_logo ? (
                    <div className="relative">
                      <img src={form.org_logo} alt="Logo" className="w-24 h-24 object-contain border border-gray-200 rounded-lg bg-gray-50 p-1" />
                      <button onClick={() => set("org_logo", "")} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs shadow-sm hover:bg-red-600"><X className="w-3 h-3" /></button>
                    </div>
                  ) : (
                    <label className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:border-blue-400 hover:text-blue-500 transition-colors">
                      <Upload className="w-5 h-5 mb-1" />
                      <span className="text-[10px]">Upload</span>
                      <input type="file" accept=".jpg,.jpeg,.png,.gif,.bmp" onChange={handleLogoUpload} className="hidden" data-testid="org-logo-upload" />
                    </label>
                  )}
                  <div className="text-xs text-gray-400 mt-2">
                    <p>Recommended: 240 x 240px</p>
                    <p>Max 1MB. Formats: jpg, jpeg, png, gif, bmp</p>
                    <p className="mt-1 text-gray-500">Shows on all invoice PDFs and emails.</p>
                  </div>
                </div>
              </div>

              {/* Org Name + Type + Industry */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs text-gray-500">Organization Name *</Label>
                  <Input value={form.business_name} onChange={(e) => set("business_name", e.target.value)} placeholder="Your company name" className="mt-1" data-testid="org-name-input" />
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Business Type</Label>
                  <Select value={form.business_type} onValueChange={(v) => set("business_type", v)}>
                    <SelectTrigger className="mt-1" data-testid="business-type-select"><SelectValue placeholder="Select type" /></SelectTrigger>
                    <SelectContent>{BUSINESS_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Industry</Label>
                  <Select value={form.industry} onValueChange={(v) => set("industry", v)}>
                    <SelectTrigger className="mt-1" data-testid="industry-select"><SelectValue placeholder="Select industry" /></SelectTrigger>
                    <SelectContent>{INDUSTRIES.map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>

              {/* Location */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs text-gray-500">Organization Location</Label>
                  <Select value={form.org_location} onValueChange={(v) => set("org_location", v)}>
                    <SelectTrigger className="mt-1" data-testid="org-location-select"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="India">India</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>

              {/* Address Section */}
              <div>
                <Label className="text-xs text-gray-500 mb-2 block">Organization Address</Label>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input value={form.street1} onChange={(e) => set("street1", e.target.value)} placeholder="Street 1" data-testid="street1-input" />
                    <Input value={form.street2} onChange={(e) => set("street2", e.target.value)} placeholder="Street 2" data-testid="street2-input" />
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="City" data-testid="city-input" />
                    <Input value={form.pin_code} onChange={(e) => set("pin_code", e.target.value)} placeholder="Pin Code" data-testid="pincode-input" />
                    <Select value={form.state} onValueChange={(v) => set("state", v)}>
                      <SelectTrigger data-testid="state-select"><SelectValue placeholder="State" /></SelectTrigger>
                      <SelectContent>{INDIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <Input value={form.business_phone} onChange={(e) => set("business_phone", e.target.value)} placeholder="Phone" data-testid="phone-input" />
                    <Input value={form.fax_number} onChange={(e) => set("fax_number", e.target.value)} placeholder="Fax Number" data-testid="fax-input" />
                    <Input value={form.business_email} onChange={(e) => set("business_email", e.target.value)} placeholder="Business Email" type="email" data-testid="business-email-input" />
                  </div>
                  <Input value={form.website_url} onChange={(e) => set("website_url", e.target.value)} placeholder="Website URL (e.g. https://yourcompany.com)" data-testid="website-input" />
                </div>
              </div>

              {/* Payment Address Toggle */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Different address for payment stubs?</p>
                    <p className="text-xs text-gray-400">Add a separate address that appears on payment receipts.</p>
                  </div>
                  <button
                    onClick={() => set("different_payment_address", !form.different_payment_address)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.different_payment_address ? "bg-blue-600" : "bg-gray-200"}`}
                    data-testid="payment-address-toggle"
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${form.different_payment_address ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>
                {form.different_payment_address && (
                  <div className="mt-4 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Input value={form.payment_street1} onChange={(e) => set("payment_street1", e.target.value)} placeholder="Payment Street 1" data-testid="payment-street1-input" />
                      <Input value={form.payment_street2} onChange={(e) => set("payment_street2", e.target.value)} placeholder="Payment Street 2" />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <Input value={form.payment_city} onChange={(e) => set("payment_city", e.target.value)} placeholder="City" />
                      <Input value={form.payment_pin_code} onChange={(e) => set("payment_pin_code", e.target.value)} placeholder="Pin Code" />
                      <Select value={form.payment_state} onValueChange={(v) => set("payment_state", v)}>
                        <SelectTrigger><SelectValue placeholder="State" /></SelectTrigger>
                        <SelectContent>{INDIAN_STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Account Info */}
            <div className="p-6 border-t border-gray-100">
              <h3 className="text-sm font-semibold text-gray-600 mb-3">Account</h3>
              <div className="flex items-center gap-4">
                {user?.picture ? (
                  <img src={user.picture} alt={user.name} className="w-12 h-12 rounded-full" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-lg font-semibold text-gray-500">
                    {user?.name?.[0] || "U"}
                  </div>
                )}
                <div>
                  <p className="font-medium text-sm text-gray-800">{user?.name}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================== LOCALE & CURRENCY TAB =================== */}
        {activeTab === "locale" && (
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <Globe className="w-4 h-4 text-gray-400" /> Locale & Currency
              </h2>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <Label className="text-xs text-gray-500">Base Currency</Label>
                  <div className="mt-1 flex items-center gap-2">
                    <Input value="INR - Indian Rupee (₹)" disabled className="bg-gray-50 text-gray-500" data-testid="base-currency-input" />
                    <span className="text-[10px] text-gray-400 whitespace-nowrap px-2 py-1 bg-amber-50 text-amber-600 rounded border border-amber-200 font-medium">Locked</span>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Fiscal Year</Label>
                  <Select value={form.fiscal_year} onValueChange={(v) => set("fiscal_year", v)}>
                    <SelectTrigger className="mt-1" data-testid="fiscal-year-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="April - March">April - March</SelectItem>
                      <SelectItem value="January - December">January - December</SelectItem>
                      <SelectItem value="July - June">July - June</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-gray-500 flex items-center gap-1"><Languages className="w-3.5 h-3.5" /> Organization Language</Label>
                  <Select value={form.org_language} onValueChange={(v) => set("org_language", v)}>
                    <SelectTrigger className="mt-1" data-testid="org-language-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="Hindi">Hindi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Communication Languages</Label>
                  <Select value={form.communication_languages} onValueChange={(v) => set("communication_languages", v)}>
                    <SelectTrigger className="mt-1" data-testid="comm-lang-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="Hindi">Hindi</SelectItem>
                      <SelectItem value="English, Hindi">English, Hindi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-gray-500 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Time Zone</Label>
                  <Select value={form.timezone} onValueChange={(v) => set("timezone", v)}>
                    <SelectTrigger className="mt-1" data-testid="timezone-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GMT+5:30 India Standard Time Asia/Calcutta">GMT+5:30 India Standard Time Asia/Calcutta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-gray-500 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Date Format</Label>
                  <Select value={form.date_format} onValueChange={(v) => set("date_format", v)}>
                    <SelectTrigger className="mt-1" data-testid="date-format-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dd/MM/yyyy">dd/MM/yyyy</SelectItem>
                      <SelectItem value="MM/dd/yyyy">MM/dd/yyyy</SelectItem>
                      <SelectItem value="yyyy-MM-dd">yyyy-MM-dd</SelectItem>
                      <SelectItem value="dd-MMM-yyyy">dd-MMM-yyyy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Company ID */}
              <div>
                <Label className="text-xs text-gray-500 mb-2 block">Company ID</Label>
                <div className="flex items-center gap-3">
                  <Select value={form.company_id_label} onValueChange={(v) => set("company_id_label", v)}>
                    <SelectTrigger className="w-36" data-testid="company-id-label-select"><SelectValue /></SelectTrigger>
                    <SelectContent>{COMPANY_ID_LABELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input value={form.company_id_value} onChange={(e) => set("company_id_value", e.target.value)} placeholder="Enter value" className="flex-1" data-testid="company-id-value-input" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================== ADDITIONAL FIELDS TAB =================== */}
        {activeTab === "fields" && (
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-gray-800">Additional Fields</h2>
                  <p className="text-xs text-gray-500 mt-0.5">Custom fields that appear on your organization profile.</p>
                </div>
                <Button size="sm" variant="outline" onClick={addField} data-testid="add-field-btn">
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> New Field
                </Button>
              </div>
            </div>
            <div className="p-6">
              {form.additional_fields.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <p className="text-sm">No additional fields yet.</p>
                  <p className="text-xs mt-1">Click "+ New Field" to add custom data.</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-3 text-xs font-medium text-gray-500">Label Name</th>
                        <th className="text-left p-3 text-xs font-medium text-gray-500">Value</th>
                        <th className="w-12"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.additional_fields.map((field, i) => (
                        <tr key={i} className="border-t border-gray-100">
                          <td className="p-2"><Input value={field.label} onChange={(e) => updateField(i, "label", e.target.value)} placeholder="Field label" className="h-8" data-testid={`field-label-${i}`} /></td>
                          <td className="p-2"><Input value={field.value} onChange={(e) => updateField(i, "value", e.target.value)} placeholder="Field value" className="h-8" data-testid={`field-value-${i}`} /></td>
                          <td className="p-2"><Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-600" onClick={() => removeField(i)} data-testid={`remove-field-${i}`}><Trash2 className="w-3.5 h-3.5" /></Button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Settings;
