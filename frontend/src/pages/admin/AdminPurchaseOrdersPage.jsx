import { useState, useEffect } from 'react';
import { Plus, Edit, Eye, Trash2, Search, FileText } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import SearchableDropdown from '../../components/SearchableDropdown';

export default function AdminPurchaseOrdersPage() {
  const [pos, setPos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPO, setEditingPO] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [formData, setFormData] = useState({
    po_number: '',
    supplier_id: '',
    warehouse_id: '',
    po_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: '',
    discount_percentage: 0,
    freight_charges: 0,
    other_charges: 0,
    notes: '',
    terms_conditions: '',
    items: [{ product_id: '', quantity: 1, unit_price: 0, discount_percentage: 0, tax_percentage: 18, notes: '' }]
  });

  const [suppliers, setSuppliers] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetchPOs();
    fetchSuppliers();
    fetchWarehouses();
    fetchProducts();
  }, []);

  const fetchPOs = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:8000/api/purchases/purchase-orders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPos(res.data);
    } catch (error) {
      toast.error('Failed to fetch purchase orders');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:8000/api/suppliers/search?limit=100', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuppliers(res.data);
    } catch (error) {
      console.error('Failed to fetch suppliers');
    }
  };

  const fetchWarehouses = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:8000/api/warehouses/search?limit=100', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWarehouses(res.data);
    } catch (error) {
      console.error('Failed to fetch warehouses');
    }
  };

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:8000/api/products', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProducts(res.data.map(p => ({
        id: p.id,
        label: `${p.name} (${p.sku}) - Stock: ${p.stock} - ₹${p.price}`,
        name: p.name,
        sku: p.sku,
        price: parseFloat(p.price),
        stock: p.stock
      })));
    } catch (error) {
      console.error('Failed to fetch products');
    }
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { product_id: '', quantity: 1, unit_price: 0, discount_percentage: 0, tax_percentage: 18, notes: '' }]
    });
  };

  const handleRemoveItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const handleProductSelect = (index, product) => {
    const newItems = [...formData.items];
    newItems[index].product_id = product.id;
    newItems[index].unit_price = product.price;
    setFormData({ ...formData, items: newItems });
  };

  const calculateTotals = () => {
    let subtotal = 0;
    formData.items.forEach(item => {
      if (item.product_id && item.quantity > 0 && item.unit_price > 0) {
        subtotal += item.quantity * item.unit_price;
      }
    });

    const discountAmount = subtotal * (formData.discount_percentage / 100);
    const taxAmount = (subtotal - discountAmount) * 0.18; // 18% GST
    const total = subtotal - discountAmount + parseFloat(formData.freight_charges || 0) + parseFloat(formData.other_charges || 0) + taxAmount;

    return { subtotal, discountAmount, taxAmount, total };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.po_number || !formData.supplier_id) {
      toast.error('Please fill all required fields');
      return;
    }

    if (formData.items.length === 0 || !formData.items[0].product_id) {
      toast.error('Please add at least one item');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      if (editingPO) {
        await axios.put(`http://localhost:8000/api/purchases/purchase-orders/${editingPO.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Purchase order updated successfully');
      } else {
        await axios.post('http://localhost:8000/api/purchases/purchase-orders', formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Purchase order created successfully');
      }

      setShowForm(false);
      setEditingPO(null);
      resetForm();
      fetchPOs();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save purchase order');
    }
  };

  const resetForm = () => {
    setFormData({
      po_number: '',
      supplier_id: '',
      warehouse_id: '',
      po_date: new Date().toISOString().split('T')[0],
      expected_delivery_date: '',
      discount_percentage: 0,
      freight_charges: 0,
      other_charges: 0,
      notes: '',
      terms_conditions: '',
      items: [{ product_id: '', quantity: 1, unit_price: 0, discount_percentage: 0, tax_percentage: 18, notes: '' }]
    });
  };

  const filteredPOs = pos.filter(po => {
    const matchesSearch = po.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         po.supplier?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || po.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const { subtotal, discountAmount, taxAmount, total } = calculateTotals();

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Purchase Orders</h1>
          <p className="text-gray-600">Manage purchase orders</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingPO(null); resetForm(); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          <span>Create PO</span>
        </button>
      </div>

      {!showForm && (
        <>
          <div className="bg-white p-4 rounded-lg shadow flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by PO number or supplier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border rounded-lg"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="received">Received</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">PO Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredPOs.map((po) => (
                  <tr key={po.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap font-medium">{po.po_number}</td>
                    <td className="px-6 py-4">{po.supplier?.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(po.po_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">₹{parseFloat(po.total).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        po.status === 'approved' ? 'bg-green-100 text-green-800' :
                        po.status === 'received' ? 'bg-blue-100 text-blue-800' :
                        po.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {po.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button className="text-blue-600 hover:text-blue-800">
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-6">{editingPO ? 'Edit' : 'Create'} Purchase Order</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">PO Number *</label>
                <input
                  type="text"
                  value={formData.po_number}
                  onChange={(e) => setFormData({...formData, po_number: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Supplier *</label>
                <SearchableDropdown
                  options={suppliers}
                  value={formData.supplier_id}
                  onChange={(value) => setFormData({...formData, supplier_id: value})}
                  placeholder="Select supplier"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Warehouse</label>
                <SearchableDropdown
                  options={warehouses}
                  value={formData.warehouse_id}
                  onChange={(value) => setFormData({...formData, warehouse_id: value})}
                  placeholder="Select warehouse"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">PO Date *</label>
                <input
                  type="date"
                  value={formData.po_date}
                  onChange={(e) => setFormData({...formData, po_date: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Expected Delivery</label>
                <input
                  type="date"
                  value={formData.expected_delivery_date}
                  onChange={(e) => setFormData({...formData, expected_delivery_date: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>

            <div className="border-t pt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Line Items</h3>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm flex items-center space-x-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Item</span>
                </button>
              </div>

              <div className="space-y-3">
                {formData.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-start border p-3 rounded">
                    <div className="col-span-4">
                      <SearchableDropdown
                        options={products}
                        value={item.product_id}
                        onChange={(value) => {
                          const product = products.find(p => p.id === value);
                          if (product) handleProductSelect(index, product);
                        }}
                        placeholder="Select product"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1 border rounded"
                        min="1"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        placeholder="Price"
                        value={item.unit_price}
                        onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 border rounded"
                        step="0.01"
                      />
                    </div>
                    <div className="col-span-2">
                      <input
                        type="number"
                        placeholder="Disc %"
                        value={item.discount_percentage}
                        onChange={(e) => handleItemChange(index, 'discount_percentage', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 border rounded"
                        step="0.01"
                      />
                    </div>
                    <div className="col-span-1">
                      <input
                        type="number"
                        value={item.tax_percentage}
                        onChange={(e) => handleItemChange(index, 'tax_percentage', parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 border rounded"
                        step="0.01"
                      />
                    </div>
                    <div className="col-span-1 flex items-center">
                      {formData.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Discount %</label>
                  <input
                    type="number"
                    value={formData.discount_percentage}
                    onChange={(e) => setFormData({...formData, discount_percentage: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border rounded-lg"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Freight Charges</label>
                  <input
                    type="number"
                    value={formData.freight_charges}
                    onChange={(e) => setFormData({...formData, freight_charges: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border rounded-lg"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Other Charges</label>
                  <input
                    type="number"
                    value={formData.other_charges}
                    onChange={(e) => setFormData({...formData, other_charges: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border rounded-lg"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Discount:</span>
                  <span className="font-semibold text-red-600">-₹{discountAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Freight:</span>
                  <span className="font-semibold">₹{parseFloat(formData.freight_charges || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Other Charges:</span>
                  <span className="font-semibold">₹{parseFloat(formData.other_charges || 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax (18%):</span>
                  <span className="font-semibold">₹{taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t pt-2 text-lg">
                  <span className="font-bold">Total:</span>
                  <span className="font-bold text-blue-600">₹{total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows="3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Terms & Conditions</label>
                <textarea
                  value={formData.terms_conditions}
                  onChange={(e) => setFormData({...formData, terms_conditions: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows="3"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditingPO(null); resetForm(); }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
              >
                {editingPO ? 'Update' : 'Create'} Purchase Order
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
