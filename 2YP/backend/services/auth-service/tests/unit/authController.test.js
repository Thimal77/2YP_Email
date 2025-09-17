// -------------------- IMPORT CONTROLLERS --------------------

// Import the functions we want to test
const { register, login } = require('../../src/controllers/authController');
const { approveOrganizer } = require('../../src/utils/approveOrganizer');


// -------------------- MOCKING DEPENDENCIES --------------------

// Mock bcrypt for password hashing and comparison
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'), // simulate hashing
  compare: jest.fn().mockResolvedValue(true)            // simulate password check
}));

// Mock jsonwebtoken to generate fake JWT tokens
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock_jwt_token')     // always return same token
}));

// Mock nodemailer to avoid sending real emails
jest.mock('nodemailer');

// Import mocked modules so we can check calls later
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// -------------------- MOCK DATABASE --------------------

// Mock database connection so tests do not hit real DB
jest.mock('../../../../db/db.js', () => ({
  query: jest.fn()  // every call to pool.query can be controlled in tests
}));
const pool = require('../../../../db/db.js');

// -------------------- MOCK EMAIL UTILITIES --------------------

// Mock function to simulate sending approval email
jest.mock('../../src/utils/sendApproveEmail', () => ({
  sendApprovalEmail: jest.fn()
}));
const { sendApprovalEmail } = require('../../src/utils/sendApproveEmail');

// Mock function to simulate sending organizer approved email
jest.mock('../../src/utils/notificationEmail', () => ({
  sendOrganizerApprovedEmail: jest.fn()
}));
const { sendOrganizerApprovedEmail } = require('../../src/utils/notificationEmail');


// -------------------- TEST SUITE FOR AUTH CONTROLLER --------------------
describe('Auth Controller Tests', () => {
  let mockReq, mockRes;

  // Before each test, reset request and response objects and clear mocks
  beforeEach(() => {
    mockReq = { body: {}, params: {} }; // mock request object
    mockRes = {
      status: jest.fn().mockReturnThis(), // allows chaining like res.status().json()
      json: jest.fn(),                    // mock res.json
      send: jest.fn()                     // mock res.send
    };
    jest.clearAllMocks(); // clear previous calls for each test
  });

  // -------------------- TEST REGISTER --------------------
  describe('register', () => {

    // Test case: missing required fields
    it('should return 400 if required fields are missing', async () => {
      mockReq.body = { fname: 'John' }; // only first name provided

      await register(mockReq, mockRes); // call the controller

      // Expect HTTP 400 and proper error message
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "fname, lname, Email (username) and Password are required"
      });
    });

    // Test case: email already exists in DB
    it('should return 400 if email already exists', async () => {
      mockReq.body = {
        fname: 'John',
        lname: 'Doe',
        email: 'existing@email.com',
        password: 'password123'
      };

      // Mock database query to return existing user
      pool.query.mockResolvedValueOnce({ rows: [{ email: 'existing@email.com' }] });

      await register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Email (username) already registered"
      });
    });

    // Test case: successful registration
    it('should successfully register organizer and send approval email', async () => {
      mockReq.body = {
        fname: 'John',
        lname: 'Doe',
        email: 'new@email.com',
        password: 'password123',
        contact_no: '1234567890'
      };

      // First DB call: check if user exists → return empty
      // Second DB call: insert new user → return the new user
      pool.query
        .mockResolvedValueOnce({ rows: [] }) 
        .mockResolvedValueOnce({
          rows: [{
            organizer_ID: 1,
            organizer_name: 'John Doe',
            email: 'new@email.com',
            status: 'pending'
          }]
        });

      await register(mockReq, mockRes);

      // Assertions to ensure proper behavior
      expect(pool.query).toHaveBeenCalledTimes(2); // 2 DB queries
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10); // password hashed
      expect(sendApprovalEmail).toHaveBeenCalled(); // approval email sent
      expect(mockRes.status).toHaveBeenCalledWith(201); // HTTP 201 created
    });
  });

  // -------------------- TEST LOGIN --------------------
  describe('login', () => {

    it('should return 400 if email or password is missing', async () => {
      mockReq.body = { email: 'test@email.com' };

      await login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should return 401 if user not found', async () => {
      mockReq.body = { email: 'nonexistent@email.com', password: 'password123' };
      pool.query.mockResolvedValueOnce({ rows: [] });

      await login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return 403 if account not approved', async () => {
      mockReq.body = { email: 'pending@email.com', password: 'password123' };
      pool.query.mockResolvedValueOnce({
        rows: [{
          email: 'pending@email.com',
          password_hash: 'hashed_password',
          status: 'pending'
        }]
      });

      await login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should successfully login and return token', async () => {
      mockReq.body = { email: 'approved@email.com', password: 'password123' };
      pool.query.mockResolvedValueOnce({
        rows: [{
          organizer_ID: 1,
          email: 'approved@email.com',
          password_hash: 'hashed_password',
          status: 'approved'
        }]
      });

      await login(mockReq, mockRes);

      expect(bcrypt.compare).toHaveBeenCalled(); // check password
      expect(jwt.sign).toHaveBeenCalled();       // generate JWT token
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Login successful",
        token: 'mock_jwt_token'
      });
    });
  });
});

// -------------------- TEST APPROVAL --------------------
describe('Approval Tests', () => {
  it('should approve organizer and send email', async () => {
    const mockReq = { params: { organizerId: '1' } };
    const mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    // Mock DB query: find organizer
    pool.query.mockResolvedValueOnce({
      rows: [{
        organizer_ID: 1,
        organizer_name: 'John Doe',
        email: 'john@email.com'
      }]
    });

    await approveOrganizer(mockReq, mockRes);

    // Verify the database update query was called correctly
    expect(pool.query).toHaveBeenCalledWith(
      'UPDATE Organizer SET status = $1 WHERE organizer_ID = $2 RETURNING *',
      ['approved', '1']
    );

    // Verify that the notification email was sent
    expect(sendOrganizerApprovedEmail).toHaveBeenCalled();

    // Verify that JSON response was sent
    expect(mockRes.json).toHaveBeenCalled();
  });
});
