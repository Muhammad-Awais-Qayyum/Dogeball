import dbConnect from './dbConnect';
import User from '@/app/models/User';

export async function initializeDatabase() {
  try {
    await dbConnect();
    
    // Check if default admin exists
    const adminExists = await User.findOne({ role: 'admin' });
    
    if (!adminExists) {
      // Create default admin user
      await User.create({
        email: 'admin@gmail.com',
        password: 'admin123',  // You can change these default credentials
        role: 'admin',
        createdAt: new Date()
      });
      console.log('Default admin user created');
    }
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}