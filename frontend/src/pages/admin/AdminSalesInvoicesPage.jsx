import { useState, useEffect } from 'react';
import { Plus, Search, Eye, FileText, Printer } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import SearchableDropdown from '../../components/SearchableDropdown';

export default function AdminSalesInvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [formData, setFormData] = useState({
    invoice_number: '',
    customer_id: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    payment_terms: 'cash',
    discount_percentage: 0,
    freight_charges: 0,
    other_charges: 0,
    gst_type: 'cgst_sgst',
    notes: '',
    terms_conditions: '',
    items: [{ product_id: '', quantity: 1, unit_price: 0, discount_percentage: 0, tax_percentage: 18 }]
  });

  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    customer_code: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    gstin: ''
  });

  useEffect(() => {
    fetchInvoices();
    fetchCustomers();
    fetchProducts();
  }, []);

  const fetchInvoices = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:8000/api/sales/invoices', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setInvoices(res.data);
    } catch (error) {
      toast.error('Failed to fetch sales invoices');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:8000/api/b2b-customers/search?limit=100', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCustomers(res.data.map(c => ({
        value: c.id,
        label: c.name,
        description: c.contact_person ? `Contact: ${c.contact_person}` : undefined
      })));
    } catch (error) {
      console.error('Failed to fetch customers');
    }
  };

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get('http://localhost:8000/api/products?page_size=100', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProducts((res.data.products || []).map(p => ({
        value: p.id,
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

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('http://localhost:8000/api/b2b-customers', newCustomer, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success('Customer created successfully!');
      await fetchCustomers();
      
      // Auto-select new customer
      setFormData({...formData, customer_id: res.data.id});
      setNewCustomer({
        name: '', customer_code: '', contact_person: '', email: '', phone: '',
        address: '', city: '', state: '', pincode: '', gstin: ''
      });
      setShowCustomerForm(false);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create customer');
    }
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { product_id: '', quantity: 1, unit_price: 0, discount_percentage: 0, tax_percentage: 18 }]
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
    newItems[index].product_id = product.value;
    newItems[index].unit_price = product.price;
    setFormData({ ...formData, items: newItems });
  };

  const calculateItemTotals = (item) => {
    const subtotal = item.quantity * item.unit_price;
    const discountAmt = subtotal * (item.discount_percentage / 100);
    const taxable = subtotal - discountAmt;
    const taxAmt = taxable * (item.tax_percentage / 100);
    const lineTotal = taxable + taxAmt;
    return { subtotal, discountAmt, taxable, taxAmt, lineTotal };
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let totalTax = 0;

    formData.items.forEach(item => {
      if (item.product_id && item.quantity > 0 && item.unit_price > 0) {
        const { taxable, taxAmt } = calculateItemTotals(item);
        subtotal += item.quantity * item.unit_price;
        totalTax += taxAmt;
      }
    });

    const discountAmount = subtotal * (formData.discount_percentage / 100);
    const totalBeforeRound = subtotal - discountAmount + parseFloat(formData.freight_charges || 0) + 
                            parseFloat(formData.other_charges || 0) + totalTax;
    
    const total = Math.round(totalBeforeRound);
    const roundOff = total - totalBeforeRound;

    const cgst = formData.gst_type === 'cgst_sgst' ? totalTax / 2 : 0;
    const sgst = formData.gst_type === 'cgst_sgst' ? totalTax / 2 : 0;
    const igst = formData.gst_type === 'igst' ? totalTax : 0;

    return { subtotal, discountAmount, totalTax, cgst, sgst, igst, roundOff, total };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.invoice_number || !formData.customer_id) {
      toast.error('Please fill all required fields');
      return;
    }

    if (formData.items.length === 0 || !formData.items[0].product_id) {
      toast.error('Please add at least one item');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:8000/api/sales/invoices', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Sales invoice created successfully! Inventory updated.');
      setShowForm(false);
      resetForm();
      fetchInvoices();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to create sales invoice');
    }
  };

  const resetForm = () => {
    setFormData({
      invoice_number: '',
      customer_id: '',
      invoice_date: new Date().toISOString().split('T')[0],
      due_date: '',
      payment_terms: 'cash',
      discount_percentage: 0,
      freight_charges: 0,
      other_charges: 0,
      gst_type: 'cgst_sgst',
      notes: '',
      terms_conditions: '',
      items: [{ product_id: '', quantity: 1, unit_price: 0, discount_percentage: 0, tax_percentage: 18 }]
    });
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         inv.customer?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const { subtotal, discountAmount, totalTax, cgst, sgst, igst, roundOff, total } = calculateTotals();

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Sales Invoices</h1>
          <p className="text-gray-600">Manage B2B sales invoices with GST</p>
        </div>
        <button
          onClick={() => { setShowForm(true); resetForm(); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          <span>Create Invoice</span>
        </button>
      </div>

      {!showForm && (
        <>
          <div className="bg-white p-4 rounded-lg shadow flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by invoice number or customer..."
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
              <option value="sent">Sent</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Balance Due</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap font-medium">{inv.invoice_number}</td>
                    <td className="px-6 py-4">{inv.customer?.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{new Date(inv.invoice_date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-semibold">₹{parseFloat(inv.total).toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={parseFloat(inv.balance_due) > 0 ? 'text-red-600 font-semibold' : 'text-green-600'}>
                        ₹{parseFloat(inv.balance_due).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        inv.status === 'paid' ? 'bg-green-100 text-green-800' :
                        inv.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                        inv.status === 'overdue' ? 'bg-red-100 text-red-800' :
                        inv.status === 'partially_paid' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button className="text-blue-600 hover:text-blue-800">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="text-gray-600 hover:text-gray-800">
                          <Printer className="w-4 h-4" />
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
          <h2 className="text-xl font-semibold mb-6">Create Sales Invoice</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Invoice Number *</label>
                <input
                  type="text"
                  value={formData.invoice_number}
                  onChange={(e) => setFormData({...formData, invoice_number: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 flex items-center justify-between">
                  <span>Customer *</span>
                  <button
                    type="button"
                    onClick={() => setShowCustomerForm(true)}
                    className="text-blue-600 hover:text-blue-800 text-xs flex items-center gap-1"
                    title="Add new customer"
                  >
                    <Plus className="w-3 h-3" /> New
                  </button>
                </label>
                <SearchableDropdown
                  options={customers}
                  value={formData.customer_id}
                  onChange={(value) => setFormData({...formData, customer_id: value})}
                  placeholder="Select customer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Invoice Date *</label>
                <input
                  type="date"
                  value={formData.invoice_date}
                  onChange={(e) => setFormData({...formData, invoice_date: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Due Date</label>
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Payment Terms</label>
                <select
                  value={formData.payment_terms}
                  onChange={(e) => setFormData({...formData, payment_terms: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="cash">Cash</option>
                  <option value="credit_15">15 Days Credit</option>
                  <option value="credit_30">30 Days Credit</option>
                  <option value="credit_60">60 Days Credit</option>
                  <option value="credit_90">90 Days Credit</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">GST Type</label>
                <select
                  value={formData.gst_type}
                  onChange={(e) => setFormData({...formData, gst_type: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="cgst_sgst">CGST + SGST (Intra-state)</option>
                  <option value="igst">IGST (Inter-state)</option>
                </select>
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

              <div className="overflow-x-auto">
                <table className="min-w-full border">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-2 text-left text-xs font-medium">Product</th>
                      <th className="px-2 py-2 text-left text-xs font-medium">Qty</th>
                      <th className="px-2 py-2 text-left text-xs font-medium">Price</th>
                      <th className="px-2 py-2 text-left text-xs font-medium">Disc %</th>
                      <th className="px-2 py-2 text-left text-xs font-medium">Taxable</th>
                      <th className="px-2 py-2 text-left text-xs font-medium">GST %</th>
                      <th className="px-2 py-2 text-left text-xs font-medium">GST Amt</th>
                      <th className="px-2 py-2 text-left text-xs font-medium">Total</th>
                      <th className="px-2 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items.map((item, index) => {
                      const { taxable, taxAmt, lineTotal } = calculateItemTotals(item);
                      return (
                        <tr key={index} className="border-b">
                          <td className="px-2 py-2">
                            <SearchableDropdown
                              options={products}
                              value={item.product_id}
                              onChange={(value) => {
                                const product = products.find(p => p.value === value);
                                if (product) handleProductSelect(index, product);
                              }}
                              placeholder="Select"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                              className="w-20 px-2 py-1 border rounded"
                              min="1"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              value={item.unit_price}
                              onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                              className="w-24 px-2 py-1 border rounded"
                              step="0.01"
                            />
                          </td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              value={item.discount_percentage}
                              onChange={(e) => handleItemChange(index, 'discount_percentage', parseFloat(e.target.value) || 0)}
                              className="w-16 px-2 py-1 border rounded"
                              step="0.01"
                            />
                          </td>
                          <td className="px-2 py-2 text-sm">₹{taxable.toFixed(2)}</td>
                          <td className="px-2 py-2">
                            <input
                              type="number"
                              value={item.tax_percentage}
                              onChange={(e) => handleItemChange(index, 'tax_percentage', parseFloat(e.target.value) || 0)}
                              className="w-16 px-2 py-1 border rounded"
                              step="0.01"
                            />
                          </td>
                          <td className="px-2 py-2 text-sm">₹{taxAmt.toFixed(2)}</td>
                          <td className="px-2 py-2 text-sm font-semibold">₹{lineTotal.toFixed(2)}</td>
                          <td className="px-2 py-2">
                            {formData.items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(index)}
                                className="text-red-600 hover:text-red-800"
                              >
                                ✕
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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

              <div className="bg-blue-50 p-4 rounded-lg space-y-2">
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
                <div className="border-t border-blue-200 pt-2">
                  {formData.gst_type === 'cgst_sgst' ? (
                    <>
                      <div className="flex justify-between text-sm">
                        <span>CGST (9%):</span>
                        <span className="font-semibold">₹{cgst.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>SGST (9%):</span>
                        <span className="font-semibold">₹{sgst.toFixed(2)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-sm">
                      <span>IGST (18%):</span>
                      <span className="font-semibold">₹{igst.toFixed(2)}</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-between text-sm">
                  <span>Round Off:</span>
                  <span className="font-semibold">{roundOff >= 0 ? '+' : ''}₹{roundOff.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t border-blue-200 pt-2 text-lg">
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
                onClick={() => { setShowForm(false); resetForm(); }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
              >
                <FileText className="w-4 h-4" />
                <span>Create Invoice & Update Stock</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Quick Add Customer Modal */}
      {showCustomerForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Quick Add Customer</h2>
                <button
                  onClick={() => setShowCustomerForm(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateCustomer} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Customer Name *</label>
                    <input
                      type="text"
                      value={newCustomer.name}
                      onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Customer Code *</label>
                    <input
                      type="text"
                      value={newCustomer.customer_code}
                      onChange={(e) => setNewCustomer({...newCustomer, customer_code: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Contact Person</label>
                    <input
                      type="text"
                      value={newCustomer.contact_person}
                      onChange={(e) => setNewCustomer({...newCustomer, contact_person: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input
                      type="email"
                      value={newCustomer.email}
                      onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Phone</label>
                    <input
                      type="tel"
                      value={newCustomer.phone}
                      onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">GSTIN</label>
                    <input
                      type="text"
                      value={newCustomer.gstin}
                      onChange={(e) => setNewCustomer({...newCustomer, gstin: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="e.g., 27AAAAA0000A1Z5"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-medium mb-1">Address</label>
                    <input
                      type="text"
                      value={newCustomer.address}
                      onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">City</label>
                    <input
                      type="text"
                      value={newCustomer.city}
                      onChange={(e) => setNewCustomer({...newCustomer, city: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">State</label>
                    <input
                      type="text"
                      value={newCustomer.state}
                      onChange={(e) => setNewCustomer({...newCustomer, state: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Pincode</label>
                    <input
                      type="text"
                      value={newCustomer.pincode}
                      onChange={(e) => setNewCustomer({...newCustomer, pincode: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-3 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowCustomerForm(false)}
                    className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Create & Select Customer
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
