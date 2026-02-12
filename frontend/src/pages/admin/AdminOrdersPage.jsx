import { useState, useEffect } from 'react';
import { Eye, Search } from 'lucide-react';
import { ordersAPI } from '../../api';
import { LoadingSpinner, StatusBadge } from '../../components/UI';
import toast from 'react-hot-toast';

const STATUSES = ['all', 'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState(null);

  const fetchOrders = () => {
    setLoading(true);
    const params = { page, page_size: 15 };
    if (status !== 'all') params.status = status;
    ordersAPI.allOrders(params)
      .then(r => { 
        setOrders(r.data.orders || []); 
        setTotal(r.data.total || 0); 
      })
      .catch(() => toast.error('Failed to load orders'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchOrders(); }, [page, status]);

  const updateStatus = async (orderId, newStatus) => {
    try {
      await ordersAPI.updateStatus(orderId, { status: newStatus });
      toast.success(`Order updated to ${newStatus}`);
      fetchOrders();
      if (selected?.id === orderId) setSelected({ ...selected, status: newStatus });
    } catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Orders</h1>

      {/* Status Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {STATUSES.map(s => (
          <button key={s} onClick={() => { setStatus(s); setPage(1); }}
            className={`px-4 py-1.5 rounded-full text-sm capitalize font-medium transition-colors ${
              status === s ? 'bg-primary-600 text-white shadow-md' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}>
            {s}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b"><tr>
              <th className="text-left p-3">Order #</th><th className="text-left p-3">Customer</th>
              <th className="text-left p-3">Items</th><th className="text-left p-3">Total</th>
              <th className="text-left p-3">Payment</th><th className="text-left p-3">Status</th>
              <th className="text-left p-3">Date</th><th className="text-left p-3">Actions</th>
            </tr></thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 font-medium">#{o.order_number}</td>
                  <td className="p-3">{o.user?.name || o.customer_name || '-'}</td>
                  <td className="p-3">{o.items?.length || 0}</td>
                  <td className="p-3 font-medium">₹{o.total?.toLocaleString()}</td>
                  <td className="p-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${o.payment_status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {o.payment_status}
                    </span>
                  </td>
                  <td className="p-3"><StatusBadge status={o.status} /></td>
                  <td className="p-3 text-gray-500">{new Date(o.created_at).toLocaleDateString()}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setSelected(o)} className="text-gray-400 hover:text-blue-500"><Eye className="w-4 h-4" /></button>
                      {o.status !== 'delivered' && o.status !== 'cancelled' && (
                        <select className="text-xs border rounded px-1 py-0.5" value="" onChange={e => e.target.value && updateStatus(o.id, e.target.value)}>
                          <option value="">Update...</option>
                          {o.status === 'pending' && <option value="confirmed">Confirm</option>}
                          {o.status === 'confirmed' && <option value="processing">Processing</option>}
                          {o.status === 'processing' && <option value="shipped">Ship</option>}
                          {o.status === 'shipped' && <option value="delivered">Delivered</option>}
                          <option value="cancelled">Cancel</option>
                        </select>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {orders.length === 0 && <p className="p-6 text-center text-gray-400">No orders found</p>}
        </div>
      )}

      {/* Order Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[80vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Order #{selected.order_number}</h2>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Customer</span><span>{selected.user?.name || '-'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Status</span><StatusBadge status={selected.status} /></div>
              <div className="flex justify-between"><span className="text-gray-500">Payment</span><span>{selected.payment_method} ({selected.payment_status})</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Date</span><span>{new Date(selected.created_at).toLocaleString()}</span></div>
              <hr />
              <h3 className="font-semibold">Items</h3>
              {selected.items?.map((item, i) => (
                <div key={i} className="flex justify-between py-1">
                  <span>{item.product?.name || 'Product'} x{item.quantity}</span>
                  <span>₹{(item.price * item.quantity).toLocaleString()}</span>
                </div>
              ))}
              <hr />
              <div className="flex justify-between font-bold"><span>Total</span><span>₹{selected.total?.toLocaleString()}</span></div>
              {selected.shipping_address && (
                <>
                  <hr />
                  <h3 className="font-semibold">Shipping Address</h3>
                  <p className="text-gray-600">{selected.shipping_address}</p>
                </>
              )}
            </div>
            <button onClick={() => setSelected(null)} className="btn-secondary w-full mt-4">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
