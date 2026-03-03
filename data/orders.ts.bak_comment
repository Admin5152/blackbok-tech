import type { User } from "../interface/interface";

export interface Order {
  id: string;
  userId: string;
  user: User;
  items: {
    id: string;
    name: string;
    price: number;
    quantity: number;
    image: string;
    category: string;
  }[];
  total: number;
  date: Date;
  status: 'pending' | 'processing' | 'shipped' | 'delivered';
  shipping: number;
}

// In-memory storage for orders (in production, this would be a database)
export const orders: Order[] = [];

// Sample orders for demonstration
export const generateSampleOrders = () => {
  const sampleUsers: User[] = [
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      role: 'user'
    },
    {
      id: '2', 
      name: 'Jane Smith',
      email: 'jane@example.com',
      password: 'password123',
      role: 'user'
    }
  ];

  const sampleProducts = [
    {
      id: 'prod1',
      name: 'iPhone 15 Pro Max',
      price: 1500,
      image: '/api/placeholder/300/300',
      category: 'iPhone'
    },
    {
      id: 'prod2',
      name: 'MacBook Pro M3',
      price: 2500,
      image: '/api/placeholder/300/300',
      category: 'Laptop'
    }
  ];

  // Generate sample orders
  orders.push(
    {
      id: 'order1',
      userId: '1',
      user: sampleUsers[0],
      items: [
        { ...sampleProducts[0], quantity: 1 },
        { ...sampleProducts[1], quantity: 1 }
      ],
      total: 4000,
      date: new Date('2024-01-15'),
      status: 'delivered',
      shipping: 50
    },
    {
      id: 'order2',
      userId: '2',
      user: sampleUsers[1],
      items: [
        { ...sampleProducts[0], quantity: 2 }
      ],
      total: 3000,
      date: new Date('2024-01-20'),
      status: 'processing',
      shipping: 25
    }
  );
};

// Initialize sample orders
generateSampleOrders();
