import { useState, useEffect } from 'react';
import { Plus, TrendingUp, TrendingDown, Package, Calendar, FileText } from 'lucide-react';
import { adminAPI, productsAPI } from '../../api';
import { LoadingSpinner } from '../../components/UI';
import toast from 'react-hot-toast';

export default function AdminInwardsOutwardsPage() {
  const [transactions, setTransactions] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    product_id: '',
    quantity: '',
    transaction_type: 'inward',
    invoice_number: '',
    supplier_name: '',
    invoice_date: '',
    notes: ''
  });

  useEffect(() => {
    fetchTransactions();
    fetchProducts();
  }, [filter]);

  const fetchTransactions = () => {
    setLoading(true);
    const params = filter !== 'all' ? { transaction_type: filter } : {};
    adminAPI.inventoryTransactions(params)
      .then(r => setTransactions(r.data || []))
      .catch(() => toast.error('Failed to load transactions'))
      .finally(() => setLoading(false));
  };

  const fetchProducts = () => {
    productsAPI.list({ page_size: 500 })
      .then(r => setProducts(r.data.products || []))
      .catch(() => {});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...form,
        quantity: parseInt(form.quantity)
      };
      await adminAPI.createInventoryTransaction(data);
      toast.success(`${form.transaction_type === 'inward' ? 'Inward' : 'Outward'} transaction recorded`);
      setShowForm(false);
      resetForm();
      fetchTransactions();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create transaction');
    }
  };

  const resetForm = () => {
    setForm({
      product_id: '',
      quantity: '',
      transaction_type: 'inward',
      invoice_number: '',
      supplier_name: '',
      invoice_date: '',
      notes: ''
    });
  };

  const openForm = (type) => {
    resetForm();
    setForm(prev => ({ ...prev, transaction_type: type }));
    setShowForm(true);
  };

  const stats = {
    total: transactions.length,
    inward: transactions.filter(t => t.transaction_type === 'inward').length,
    outward: transactions.filter(t => t.transaction_type === 'outward').length,
    totalInwardQty: transactions.filter(t => t.transaction_type === 'inward').reduce((sum, t) => sum + Math.abs(t.change), 0),
    totalOutwardQty: transactions.filter(t => t.transaction_type === 'outward').reduce((sum, t) => sum + Math.abs(t.change), 0)
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">Inwards/Outwards Tracking</h1>
        <div className="flex gap-2">
          <button onClick={() => openForm('inward')} className="btn-primary flex items-center gap-2">
            <TrendingUp className="w-4 h-4" /> Record Inward
          </button>
          <button onClick={() => openForm('outward')} className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors">
            <TrendingDown className="w-4 h-4" /> Record Outward
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-blue-600">{stats.total}</p>
          <p className="text-xs text-gray-500 mt-1">Total Transactions</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-green-600">{stats.inward}</p>
          <p className="text-xs text-gray-500 mt-1">Inward Entries</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-orange-600">{stats.outward}</p>
          <p className="text-xs text-gray-500 mt-1">Outward Entries</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-green-600">{stats.totalInwardQty}</p>
          <p className="text-xs text-gray-500 mt-1">Total Inward Qty</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm text-center">
          <p className="text-2xl font-bold text-orange-600">{stats.totalOutwardQty}</p>
          <p className="text-xs text-gray-500 mt-1">Total Outward Qty</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {['all', 'inward', 'outward'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-4 py-1.5 rounded-full text-sm capitalize font-medium transition-colors ${
            filter === f ? 'bg-primary-600 text-white shadow-md' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
          }`}>
            {f === 'all' ? 'All Transactions' : f}
          </button>
        ))}
      </div>

      {/* Transactions Table */}
      {loading ? <LoadingSpinner /> : (
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-3">Date</th>
                <th className="text-left p-3">Type</th>
                <th className="text-left p-3">Product</th>
                <th className="text-left p-3">Quantity</th>
                <th className="text-left p-3">Invoice #</th>
                <th className="text-left p-3">Supplier/Customer</th>
                <th className="text-left p-3">Invoice Date</th>
                <th className="text-left p-3">Notes</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(t => (
                <tr key={t.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 text-gray-500">{new Date(t.created_at).toLocaleDateString()}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1 w-fit ${
                      t.transaction_type === 'inward' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {t.transaction_type === 'inward' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {t.transaction_type}
                    </span>
                  </td>
                  <td className="p-3 font-medium">{t.product?.name || 'Unknown Product'}</td>
                  <td className="p-3">
                    <span className={`font-bold ${t.change > 0 ? 'text-green-600' : 'text-orange-600'}`}>
                      {t.change > 0 ? '+' : ''}{t.change}
                    </span>
                  </td>
                  <td className="p-3">{t.invoice_number || '-'}</td>
                  <td className="p-3">{t.supplier_name || '-'}</td>
                  <td className="p-3">{t.invoice_date ? new Date(t.invoice_date).toLocaleDateString() : '-'}</td>
                  <td className="p-3 text-gray-500 text-xs max-w-xs truncate">{t.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {transactions.length === 0 && (
            <p className="p-6 text-center text-gray-400">No transactions found</p>
          )}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              {form.transaction_type === 'inward' ? (
                <><TrendingUp className="w-5 h-5 text-green-600" /> Record Inward Transaction</>
              ) : (
                <><TrendingDown className="w-5 h-5 text-orange-600" /> Record Outward Transaction</>
              )}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium mb-1">Product *</label>
                  <select className="input-field" value={form.product_id} onChange={e => setForm({...form, product_id: e.target.value})} required>
                    <option value="">Select Product</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Quantity *</label>
                  <input type="number" min="1" className="input-field" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} required />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Invoice Number</label>
                  <input className="input-field" value={form.invoice_number} onChange={e => setForm({...form, invoice_number: e.target.value})} placeholder="INV-001" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">{form.transaction_type === 'inward' ? 'Supplier Name' : 'Customer Name'}</label>
                  <input className="input-field" value={form.supplier_name} onChange={e => setForm({...form, supplier_name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Invoice Date</label>
                  <input type="date" className="input-field" value={form.invoice_date} onChange={e => setForm({...form, invoice_date: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea rows={3} className="input-field" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Additional details about this transaction..." />
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className={form.transaction_type === 'inward' ? 'btn-primary' : 'bg-orange-600 hover:bg-orange-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors'}>
                  Record {form.transaction_type === 'inward' ? 'Inward' : 'Outward'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
