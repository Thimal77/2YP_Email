// -------------------- IMPORT CONTROLLERS --------------------
// Import the controller functions and utility functions we want to test
const { register, login } = require('../../src/controllers/authController');
const { approveOrganizer } = require('../../src/utils/approveOrganizer');

// -------------------- MOCKING DEPENDENCIES --------------------
// Mock bcrypt so hashing and comparison do not perform real computations
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'), // hash always returns 'hashed_password'
  compare: jest.fn().mockResolvedValue(true) // password comparison always succeeds
}));

// Mock JWT so token generation is predictable
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock_jwt_token') // always returns 'mock_jwt_token'
}));

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Mock database queries to avoid hitting the real DB
jest.mock('../../../../db/db.js', () => ({
  query: jest.fn()
}));
const pool = require('../../../../db/db.js');

// Mock email utilities so no real emails are sent during tests
jest.mock('../../src/utils/sendApproveEmail', () => ({
  sendApprovalEmail: jest.fn()
}));
const { sendApprovalEmail } = require('../../src/utils/sendApproveEmail');

jest.mock('../../src/utils/notificationEmail', () => ({
  sendOrganizerApprovedEmail: jest.fn()
}));
const { sendOrganizerApprovedEmail } = require('../../src/utils/notificationEmail');

// -------------------- TEST SUITE --------------------
describe('Auth Controller Tests', () => {
  let mockReq, mockRes;

  beforeEach(() => {
    // Setup mock request and response objects before each test
    mockReq = { body: {}, params: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(), // allows chaining: res.status().json()
      json: jest.fn(),
      send: jest.fn()
    };
    jest.clearAllMocks(); // Clear all mocks before each test

    // Silence console.error logs to keep test output clean
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  // -------------------- REGISTER --------------------
  describe('register', () => {
    it('should return 400 if required fields are missing', async () => {
      mockReq.body = { fname: 'John' }; // missing lname, email, password

      await register(mockReq, mockRes);

      // Expect HTTP 400 status code for bad request
      expect(mockRes.status).toHaveBeenCalledWith(400);

      // Expect error message to indicate missing fields
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "fname, lname, Email (username) and Password are required"
      });
    });

    it('should return 400 if email already exists', async () => {
      mockReq.body = { fname: 'John', lname: 'Doe', email: 'exists@mail.com', password: 'pass' };
      
      // Mock DB query to simulate email already in database
      pool.query.mockResolvedValueOnce({ rows: [{ email: 'exists@mail.com' }] });

      await register(mockReq, mockRes);

      // Expect HTTP 400 status code for duplicate email
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Email (username) already registered"
      });
    });

    it('should register and send approval email', async () => {
      mockReq.body = { fname: 'John', lname: 'Doe', email: 'new@mail.com', password: 'pass', contact_no: '123' };

      // Mock DB queries for user not existing and then inserting new user
      pool.query
        .mockResolvedValueOnce({ rows: [] }) // no existing email
        .mockResolvedValueOnce({ // user inserted
          rows: [{
            organizer_ID: 1,
            organizer_name: 'John Doe',
            email: 'new@mail.com',
            status: 'pending'
          }]
        });

      await register(mockReq, mockRes);

      // Expect DB queries to have been called twice
      expect(pool.query).toHaveBeenCalledTimes(2);

      // Expect password hashing to have been called
      expect(bcrypt.hash).toHaveBeenCalledWith('pass', 10);

      // Expect approval email to be sent
      expect(sendApprovalEmail).toHaveBeenCalled();

      // Expect HTTP 201 status code for successful creation
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });
  });

  // -------------------- LOGIN --------------------
  describe('login', () => {
    it('should return 400 if email or password is missing', async () => {
      mockReq.body = { email: 'test@mail.com' }; // password missing

      await login(mockReq, mockRes);

      // Expect 400 for missing credentials
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Email (username) and Password are required"
      });
    });

    it('should return 401 if user not found', async () => {
      mockReq.body = { email: 'no@mail.com', password: 'pass' };

      // Mock DB query to return no user
      pool.query.mockResolvedValueOnce({ rows: [] });

      await login(mockReq, mockRes);

      // Expect 401 Unauthorized
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return 403 if account not approved', async () => {
      mockReq.body = { email: 'pending@mail.com', password: 'pass' };

      // Mock DB query to return user with pending status
      pool.query.mockResolvedValueOnce({
        rows: [{ email: 'pending@mail.com', password_hash: 'hash', status: 'pending' }]
      });

      await login(mockReq, mockRes);

      // Expect 403 Forbidden for unapproved account
      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should login successfully', async () => {
      mockReq.body = { email: 'approved@mail.com', password: 'pass' };

      // Mock DB query to return approved user
      pool.query.mockResolvedValueOnce({
        rows: [{ organizer_ID: 1, email: 'approved@mail.com', password_hash: 'hash', status: 'approved' }]
      });

      await login(mockReq, mockRes);

      // Expect password comparison to have been called
      expect(bcrypt.compare).toHaveBeenCalled();

      // Expect JWT token to be generated
      expect(jwt.sign).toHaveBeenCalled();

      // Expect HTTP 200 for successful login
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Login successful",
        token: 'mock_jwt_token'
      });
    });
  });
});

// -------------------- APPROVAL --------------------
describe('Approval Tests', () => {
  it('should approve organizer and send email', async () => {
    const req = { params: { organizerId: '1' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    // Mock DB query to return organizer info
    pool.query.mockResolvedValueOnce({
      rows: [{ organizer_ID: 1, organizer_name: 'John', email: 'john@mail.com' }]
    });

    await approveOrganizer(req, res);

    // Expect notification email to be sent
    expect(sendOrganizerApprovedEmail).toHaveBeenCalled();

    // Expect response JSON with approval confirmation
    expect(res.json).toHaveBeenCalledWith({
      message: "Organizer approved successfully",
      organizer: expect.any(Object)
    });
  });
});
