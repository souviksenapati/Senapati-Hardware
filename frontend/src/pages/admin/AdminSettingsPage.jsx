import { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { adminAPI } from '../../api';
import { LoadingSpinner } from '../../components/UI';
import toast from 'react-hot-toast';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminAPI.settings()
      .then(r => {
        const s = {};
        (r.data || []).forEach(item => { s[item.key] = item.value; });
        setSettings(s);
      })
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const update = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const entries = Object.entries(settings).map(([key, value]) => ({ key, value }));
      await adminAPI.updateSetting(entries);
      toast.success('Settings saved');
    } catch { toast.error('Failed to save'); }
    setSaving(false);
  };

  if (loading) return <LoadingSpinner />;

  const fields = [
    { key: 'store_name', label: 'Store Name', type: 'text' },
    { key: 'store_email', label: 'Store Email', type: 'email' },
    { key: 'store_phone', label: 'Store Phone', type: 'text' },
    { key: 'store_address', label: 'Store Address', type: 'textarea' },
    { key: 'currency', label: 'Currency Symbol', type: 'text' },
    { key: 'tax_percentage', label: 'Tax Percentage (%)', type: 'number' },
    { key: 'shipping_charge', label: 'Default Shipping Charge (₹)', type: 'number' },
    { key: 'free_shipping_above', label: 'Free Shipping Above (₹)', type: 'number' },
    { key: 'low_stock_threshold', label: 'Low Stock Threshold', type: 'number' },
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Store Settings</h1>
        <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
          <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm max-w-2xl">
        <div className="space-y-4">
          {fields.map(f => (
            <div key={f.key}>
              <label className="block text-sm font-medium mb-1">{f.label}</label>
              {f.type === 'textarea' ? (
                <textarea rows={3} className="input-field" value={settings[f.key] || ''} onChange={e => update(f.key, e.target.value)} />
              ) : (
                <input type={f.type} className="input-field" value={settings[f.key] || ''} onChange={e => update(f.key, e.target.value)} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
