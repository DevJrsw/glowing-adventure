import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import ProductGrid from './components/ProductGrid';
import Cart from './components/Cart';
import PaymentModal from './components/PaymentModal';
import CustomerModal from './components/CustomerModal';
import ReportsModal from './components/ReportsModal';
import InventoryModal from './components/InventoryModal';
import ReceiptModal from './components/ReceiptModal';
import { Product, CartItem, Customer, Transaction, User } from './types';
import { products as initialProducts, categories } from './data/products';
import { customers as initialCustomers } from './data/customers';
import { calculateCartTotals, generateReceiptId } from './utils/helpers';

function App() {
  // State
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [discount, setDiscount] = useState(0);
  
  // Modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showReportsModal, setShowReportsModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [currentReceipt, setCurrentReceipt] = useState<Transaction | null>(null);

  // Current user (mock data)
  const [currentUser] = useState<User>({
    id: '1',
    name: 'John Smith',
    role: 'cashier',
    avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?w=150'
  });

  // Filter products based on search and category
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.barcode.includes(searchQuery);
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Cart functions
  const addToCart = (product: Product) => {
    if (product.stock === 0) return;

    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
      if (existingItem.quantity < product.stock) {
        updateCartQuantity(product.id, existingItem.quantity + 1);
      }
    } else {
      const cartItem: CartItem = {
        ...product,
        quantity: 1,
        subtotal: product.price
      };
      setCart([...cart, cartItem]);
    }
  };

  const updateCartQuantity = (id: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(id);
      return;
    }

    setCart(cart.map(item => {
      if (item.id === id) {
        return {
          ...item,
          quantity: Math.min(newQuantity, item.stock),
          subtotal: item.price * Math.min(newQuantity, item.stock)
        };
      }
      return item;
    }));
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const clearCart = () => {
    setCart([]);
    setSelectedCustomer(null);
    setDiscount(0);
  };

  // Payment processing
  const handlePaymentComplete = (paymentMethod: string, amountPaid: number) => {
    const { subtotal, tax, total } = calculateCartTotals(cart);
    const discountAmount = subtotal * (discount / 100);
    const finalTotal = total - discountAmount;

    const transaction: Transaction = {
      id: generateReceiptId(),
      customerId: selectedCustomer?.id,
      items: [...cart],
      subtotal,
      tax,
      discount: discountAmount,
      total: finalTotal,
      paymentMethod,
      timestamp: new Date(),
      cashier: currentUser.name,
      customerName: selectedCustomer?.name,
      cashReceived: paymentMethod === 'cash' ? amountPaid : undefined
    };

    // Update product stock
    setProducts(prevProducts => 
      prevProducts.map(product => {
        const cartItem = cart.find(item => item.id === product.id);
        if (cartItem) {
          return { ...product, stock: product.stock - cartItem.quantity };
        }
        return product;
      })
    );

    // Update customer loyalty points
    if (selectedCustomer) {
      const pointsEarned = Math.floor(finalTotal);
      setCustomers(prevCustomers =>
        prevCustomers.map(customer => {
          if (customer.id === selectedCustomer.id) {
            return {
              ...customer,
              loyaltyPoints: customer.loyaltyPoints + pointsEarned,
              totalSpent: customer.totalSpent + finalTotal
            };
          }
          return customer;
        })
      );
    }

    setTransactions([transaction, ...transactions]);
    setCurrentReceipt(transaction);
    setShowReceiptModal(true);
    clearCart();
  };

  // Customer management
  const handleAddCustomer = (customerData: Omit<Customer, 'id' | 'loyaltyPoints' | 'totalSpent'>) => {
    const newCustomer: Customer = {
      ...customerData,
      id: Date.now().toString(),
      loyaltyPoints: 0,
      totalSpent: 0
    };
    setCustomers([...customers, newCustomer]);
  };

  // Product management
  const handleUpdateProduct = (updatedProduct: Product) => {
    setProducts(prevProducts =>
      prevProducts.map(product =>
        product.id === updatedProduct.id ? updatedProduct : product
      )
    );
  };

  const handleAddProduct = (productData: Omit<Product, 'id'>) => {
    const newProduct: Product = {
      ...productData,
      id: Date.now().toString()
    };
    setProducts([...products, newProduct]);
  };

  // Load mock transactions on mount
  useEffect(() => {
    const mockTransactions: Transaction[] = [
      {
        id: 'TXN-001',
        items: [
          { ...initialProducts[0], quantity: 2, subtotal: 49.98 },
          { ...initialProducts[2], quantity: 1, subtotal: 8.99 }
        ],
        subtotal: 58.97,
        tax: 4.72,
        discount: 0,
        total: 63.69,
        paymentMethod: 'card',
        timestamp: new Date(Date.now() - 3600000),
        cashier: 'John Smith',
        customerName: 'Sarah Johnson'
      },
      {
        id: 'TXN-002',
        items: [
          { ...initialProducts[1], quantity: 1, subtotal: 18.50 },
          { ...initialProducts[3], quantity: 3, subtotal: 9.75 }
        ],
        subtotal: 28.25,
        tax: 2.26,
        discount: 2.83,
        total: 27.68,
        paymentMethod: 'cash',
        timestamp: new Date(Date.now() - 7200000),
        cashier: 'John Smith',
        cashReceived: 30.00
      }
    ];
    setTransactions(mockTransactions);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header
        currentUser={currentUser}
        onOpenReports={() => setShowReportsModal(true)}
        onOpenCustomers={() => setShowCustomerModal(true)}
        onOpenInventory={() => setShowInventoryModal(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Main Content */}
      <div className="flex">
        {/* Product Grid */}
        <ProductGrid
          products={filteredProducts}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          onAddToCart={addToCart}
          categories={categories}
        />

        {/* Cart */}
        <Cart
          items={cart}
          onUpdateQuantity={updateCartQuantity}
          onRemoveItem={removeFromCart}
          onCheckout={() => setShowPaymentModal(true)}
          onSelectCustomer={() => setShowCustomerModal(true)}
          selectedCustomer={selectedCustomer}
          discount={discount}
          onDiscountChange={setDiscount}
        />
      </div>

      {/* Modals */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        total={calculateCartTotals(cart).total - (calculateCartTotals(cart).subtotal * (discount / 100))}
        onPaymentComplete={handlePaymentComplete}
      />

      <CustomerModal
        isOpen={showCustomerModal}
        onClose={() => setShowCustomerModal(false)}
        customers={customers}
        onSelectCustomer={setSelectedCustomer}
        onAddCustomer={handleAddCustomer}
      />

      <ReportsModal
        isOpen={showReportsModal}
        onClose={() => setShowReportsModal(false)}
        transactions={transactions}
      />

      <InventoryModal
        isOpen={showInventoryModal}
        onClose={() => setShowInventoryModal(false)}
        products={products}
        onUpdateProduct={handleUpdateProduct}
        onAddProduct={handleAddProduct}
      />

      <ReceiptModal
        isOpen={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        transaction={currentReceipt}
      />
    </div>
  );
}

export default App;