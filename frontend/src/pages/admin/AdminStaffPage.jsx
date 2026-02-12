import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { adminAPI } from '../../api';
import { LoadingSpinner } from '../../components/UI';
import toast from 'react-hot-toast';

export default function AdminStaffPage() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', password: '', staff_role: 'warehouse', department: '', salary: '', is_active: true });

  const fetchStaff = () => {
    setLoading(true);
    adminAPI.staff()
      .then(r => setStaff(r.data || []))
      .catch(() => toast.error('Failed to load staff'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchStaff(); }, []);

  const openCreate = () => { setEditing(null); setForm({ first_name: '', last_name: '', email: '', phone: '', password: '', staff_role: 'warehouse', department: '', salary: '', is_active: true }); setShowForm(true); };
  const openEdit = (s) => { setEditing(s); setForm({ first_name: s.user?.first_name || '', last_name: s.user?.last_name || '', email: s.user?.email || s.email, phone: s.user?.phone || s.phone || '', password: '', staff_role: s.staff_role, department: s.department || '', salary: s.salary || '', is_active: s.is_active }); setShowForm(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...form, salary: form.salary ? parseFloat(form.salary) : null };
      if (!data.password) delete data.password;
      if (editing) { 
        toast.info('Staff editing not yet implemented'); 
      } else { 
        await adminAPI.createStaff(data); 
        toast.success('Staff created'); 
      }
      setShowForm(false); 
      fetchStaff();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this staff member?')) return;
    try { 
      await adminAPI.removeStaff(id); 
      toast.success('Removed'); 
      fetchStaff(); 
    } catch (err) { 
      toast.error(err.response?.data?.detail || 'Failed'); 
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Staff Management</h1>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Add Staff</button>
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b"><tr>
              <th className="text-left p-3">Name</th><th className="text-left p-3">Email</th>
              <th className="text-left p-3">Phone</th><th className="text-left p-3">Role</th>
              <th className="text-left p-3">Salary</th><th className="text-left p-3">Status</th>
              <th className="text-left p-3">Actions</th>
            </tr></thead>
            <tbody>
              {staff.map(s => (
                <tr key={s.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium">{s.user?.first_name} {s.user?.last_name}</td>
                  <td className="p-3">{s.user?.email}</td>
                  <td className="p-3">{s.user?.phone || '-'}</td>
                  <td className="p-3 capitalize">{s.staff_role}</td>
                  <td className="p-3">{s.salary ? `₹${s.salary.toLocaleString()}` : '-'}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-3 flex gap-2">
                    <button onClick={() => openEdit(s)} className="text-gray-400 hover:text-blue-500"><Pencil className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(s.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {staff.length === 0 && <p className="p-6 text-center text-gray-400">No staff members</p>}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">{editing ? 'Edit Staff' : 'Add Staff'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">First Name *</label><input className="input-field" value={form.first_name} onChange={e => setForm({...form, first_name: e.target.value})} required /></div>
                <div><label className="block text-sm font-medium mb-1">Last Name</label><input className="input-field" value={form.last_name} onChange={e => setForm({...form, last_name: e.target.value})} /></div>
              </div>
              <div><label className="block text-sm font-medium mb-1">Email *</label><input type="email" className="input-field" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required /></div>
              <div><label className="block text-sm font-medium mb-1">Phone</label><input className="input-field" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
              <div><label className="block text-sm font-medium mb-1">{editing ? 'New Password' : 'Password *'}</label><input type="password" className="input-field" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required={!editing} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Staff Role</label>
                  <select className="input-field" value={form.staff_role} onChange={e => setForm({...form, staff_role: e.target.value})}>
                    <option value="warehouse">Warehouse</option><option value="delivery">Delivery</option><option value="manager">Manager</option><option value="support">Support</option>
                  </select>
                </div>
                <div><label className="block text-sm font-medium mb-1">Salary (₹)</label><input type="number" className="input-field" value={form.salary} onChange={e => setForm({...form, salary: e.target.value})} /></div>
              </div>
              <div><label className="block text-sm font-medium mb-1">Department</label><input className="input-field" value={form.department} onChange={e => setForm({...form, department: e.target.value})} /></div>
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} /> Active</label>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">{editing ? 'Update' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
