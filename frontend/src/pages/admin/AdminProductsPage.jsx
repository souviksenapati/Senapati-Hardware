import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search, Image as ImageIcon, Upload } from 'lucide-react';
import { productsAPI, categoriesAPI, uploadAPI } from '../../api';
import { LoadingSpinner } from '../../components/UI';
import toast from 'react-hot-toast';

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    name: '', description: '', price: '', discount_percentage: '0', stock: '',
    category_id: '', brand: '', sku: '', unit: 'piece', is_featured: false, is_active: true
  });

  const fetchProducts = () => {
    setLoading(true);
    productsAPI.list({ page, page_size: 10, search })
      .then(res => { 
        setProducts(res.data.products || []); 
        setTotal(res.data.total || 0); 
      })
      .catch(() => toast.error('Failed to load products'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchProducts(); }, [page, search]);
  useEffect(() => { 
    categoriesAPI.listAll()
      .then(r => setCategories(r.data || []))
      .catch(() => toast.error('Failed to load categories')); 
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', description: '', price: '', discount_percentage: '0', stock: '', category_id: '', brand: '', sku: '', unit: 'piece', is_featured: false, is_active: true });
    setShowForm(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({
      name: p.name, description: p.description || '', price: p.price, discount_percentage: p.discount_percentage || 0,
      stock: p.stock, category_id: p.category_id, brand: p.brand || '', sku: p.sku || '', unit: p.unit || 'piece',
      is_featured: p.is_featured, is_active: p.is_active
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = { ...form, price: parseFloat(form.price), stock: parseInt(form.stock), discount_percentage: parseFloat(form.discount_percentage) };
      if (editing) {
        await productsAPI.update(editing.id, data);
        toast.success('Product updated');
      } else {
        await productsAPI.create(data);
        toast.success('Product created');
      }
      setShowForm(false);
      fetchProducts();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this product?')) return;
    try { await productsAPI.delete(id); toast.success('Deleted'); fetchProducts(); }
    catch { toast.error('Failed to delete'); }
  };

  const handleImageUpload = async (productId, file) => {
    try {
      const res = await uploadAPI.upload(file);
      // Note: Image upload to product would require a product images endpoint
      toast.success('Image uploaded to server');
      // For now, just notify - backend needs to support adding images to products
      fetchProducts();
    } catch (err) { 
      toast.error(err.response?.data?.detail || 'Upload failed'); 
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">Products ({total})</h1>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Add Product</button>
      </div>

      {/* Search */}
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input className="input-field pl-10" placeholder="Search products..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
      </div>

      {/* Table */}
      {loading ? <LoadingSpinner /> : (
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b"><tr>
              <th className="text-left p-3">Product</th><th className="text-left p-3">Category</th>
              <th className="text-left p-3">Price</th><th className="text-left p-3">Stock</th>
              <th className="text-left p-3">Status</th><th className="text-left p-3">Actions</th>
            </tr></thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id} className="border-b hover:bg-gray-50">
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                        {p.images?.[0] ? <img src={p.images[0].image_url} className="w-10 h-10 object-cover rounded" /> : <ImageIcon className="w-5 h-5 text-gray-300" />}
                      </div>
                      <div>
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.sku || 'No SKU'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">{p.category?.name || '-'}</td>
                  <td className="p-3">
                    <span>₹{p.price?.toLocaleString()}</span>
                    {p.discount_percentage > 0 && <span className="text-xs text-green-600 ml-1">-{p.discount_percentage}%</span>}
                  </td>
                  <td className="p-3"><span className={p.stock < 10 ? 'text-red-600 font-bold' : ''}>{p.stock}</span></td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {p.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer text-gray-400 hover:text-blue-500">
                        <ImageIcon className="w-4 h-4" />
                        <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files[0] && handleImageUpload(p.id, e.target.files[0])} />
                      </label>
                      <button onClick={() => openEdit(p)} className="text-gray-400 hover:text-blue-500"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(p.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {products.length === 0 && <p className="p-6 text-center text-gray-400">No products found</p>}
        </div>
      )}

      {/* Pagination */}
      {total > 10 && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: Math.ceil(total / 10) }, (_, i) => (
            <button key={i} onClick={() => setPage(i + 1)} className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              page === i + 1 ? 'bg-primary-600 text-white shadow-md' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}>{i + 1}</button>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-xl font-bold mb-4">{editing ? 'Edit Product' : 'Add Product'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Name *</label><input className="input-field" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
                <div><label className="block text-sm font-medium mb-1">SKU</label><input className="input-field" value={form.sku} onChange={e => setForm({...form, sku: e.target.value})} /></div>
                <div><label className="block text-sm font-medium mb-1">Category *</label>
                  <select className="input-field" value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})} required>
                    <option value="">Select</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div><label className="block text-sm font-medium mb-1">Brand</label><input className="input-field" value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} /></div>
                <div><label className="block text-sm font-medium mb-1">Price (₹) *</label><input type="number" step="0.01" className="input-field" value={form.price} onChange={e => setForm({...form, price: e.target.value})} required /></div>
                <div><label className="block text-sm font-medium mb-1">Discount %</label><input type="number" min="0" max="90" className="input-field" value={form.discount_percentage} onChange={e => setForm({...form, discount_percentage: e.target.value})} /></div>
                <div><label className="block text-sm font-medium mb-1">Stock *</label><input type="number" className="input-field" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} required /></div>
                <div><label className="block text-sm font-medium mb-1">Unit</label>
                  <select className="input-field" value={form.unit} onChange={e => setForm({...form, unit: e.target.value})}>
                    <option value="piece">Piece</option><option value="kg">Kg</option><option value="meter">Meter</option><option value="liter">Liter</option><option value="box">Box</option><option value="set">Set</option>
                  </select>
                </div>
              </div>
              <div><label className="block text-sm font-medium mb-1">Description</label><textarea rows={3} className="input-field" value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
              <div>
                <label className="block text-sm font-medium mb-1">Product Image</label>
                <div className="flex items-center gap-3">
                  <input type="text" className="input-field flex-1" placeholder="Or enter image URL..." value={form.image_url || ''} onChange={e => setForm({...form, image_url: e.target.value})} />
                  <label className="btn-secondary cursor-pointer flex items-center gap-2">
                    <Upload className="w-4 h-4" /> Upload
                    <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                      if (e.target.files[0]) {
                        try {
                          const res = await uploadAPI.upload(e.target.files[0]);
                          setForm({...form, image_url: res.data.url});
                          toast.success('Image uploaded');
                        } catch { toast.error('Upload failed'); }
                      }
                    }} />
                  </label>
                </div>
                {form.image_url && <img src={form.image_url} className="w-32 h-32 object-cover rounded mt-2 border" alt="Preview" />}
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_featured} onChange={e => setForm({...form, is_featured: e.target.checked})} /> Featured</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} /> Active</label>
              </div>
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
