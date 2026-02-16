import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ordersAPI } from '../../api';
import { LoadingSpinner, StatusBadge } from '../../components/UI';
import { Package, MapPin, CreditCard, Truck, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

export default function OrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ordersAPI.get(id)
      .then(r => setOrder(r.data))
      .catch(() => toast.error('Failed to load order'))
      .finally(() => setLoading(false));
  }, [id]);

  const cancelOrder = async () => {
    if (!confirm('Cancel this order?')) return;
    try {
      await ordersAPI.cancel(id);
      toast.success('Order cancelled');
      setOrder({ ...order, status: 'cancelled' });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to cancel');
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!order) return (
    <div className="max-w-4xl mx-auto px-4 py-8 text-center">
      <h2 className="text-xl font-bold text-gray-600">Order not found</h2>
      <Link to="/orders" className="btn-primary inline-block mt-4">Back to Orders</Link>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link to="/orders" className="text-primary-600 hover:underline mb-2 inline-block">← Back to Orders</Link>
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Order {order.order_number}</h1>
            <p className="text-sm text-gray-500 mt-1">
              Placed on {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex gap-2">
            <StatusBadge status={order.status} />
            <StatusBadge status={order.payment_status} />
          </div>
        </div>
      </div>

      {/* Order Items */}
      <div className="card p-6 mb-6">
        <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
          <Package className="w-5 h-5" /> Order Items
        </h2>
        <div className="space-y-4">
          {order.items?.map(item => (
            <div key={item.id} className="flex gap-4 pb-4 border-b last:border-0">
              <img 
                src={item.product?.images?.[0]?.image_url || 'https://placehold.co/100x100'} 
                alt={item.product_name}
                className="w-20 h-20 object-cover rounded border"
              />
              <div className="flex-1">
                <Link to={`/product/${item.product?.slug}`} className="font-medium hover:text-primary-600">
                  {item.product_name}
                </Link>
                <p className="text-sm text-gray-500 mt-1">Quantity: {item.quantity}</p>
                <p className="text-sm text-gray-500">Price: ₹{item.price.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="font-bold">₹{(item.price * item.quantity).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Delivery Address */}
        <div className="card p-6">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5" /> Delivery Address
          </h2>
          <div className="text-sm text-gray-600">
            <p className="font-medium text-gray-900">{order.shipping_address?.full_name}</p>
            <p className="mt-2">{order.shipping_address?.address_line1}</p>
            {order.shipping_address?.address_line2 && <p>{order.shipping_address.address_line2}</p>}
            <p>{order.shipping_address?.city}, {order.shipping_address?.state} {order.shipping_address?.pincode}</p>
            <p className="mt-2">Phone: {order.shipping_address?.phone}</p>
          </div>
        </div>

        {/* Payment Details */}
        <div className="card p-6">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5" /> Payment Details
          </h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium">₹{order.subtotal?.toLocaleString()}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-₹{order.discount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Shipping</span>
              <span className="font-medium">₹{order.shipping_fee?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tax</span>
              <span className="font-medium">₹{order.tax?.toLocaleString() || 0}</span>
            </div>
            <div className="border-t pt-2 flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>₹{order.total.toLocaleString()}</span>
            </div>
            <div className="mt-4 pt-4 border-t">
              <p className="text-gray-600">Payment Method</p>
              <p className="font-medium capitalize">{order.payment_method?.replace('_', ' ')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Order Timeline / Tracking */}
      {order.tracking_number && (
        <div className="card p-6 mb-6">
          <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
            <Truck className="w-5 h-5" /> Tracking Information
          </h2>
          <p className="text-sm text-gray-600">Tracking Number: <span className="font-mono font-medium">{order.tracking_number}</span></p>
        </div>
      )}

      {/* Actions */}
      {(order.status === 'pending' || order.status === 'confirmed') && (
        <div className="flex justify-end">
          <button onClick={cancelOrder} className="btn-secondary text-red-600">
            Cancel Order
          </button>
        </div>
      )}
    </div>
  );
}
