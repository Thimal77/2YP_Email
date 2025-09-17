// Set test environment variables
process.env.JWT_SECRET = 'test_secret';
process.env.ADMIN_EMAIL = 'test@email.com';
process.env.ADMIN_PASSWORD = 'test_password';
process.env.ADMIN_NOTIFY_EMAIL = 'admin@email.com';
process.env.BASE_URL = 'http://localhost:3000';

// Mock the database path with correct relative path
jest.mock('../../../../db/db.js', () => require('./__mocks__/db'));