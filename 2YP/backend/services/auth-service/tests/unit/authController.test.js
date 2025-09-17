// -------------------- IMPORT CONTROLLERS --------------------
const { register, login } = require('../../src/controllers/authController');
const { approveOrganizer } = require('../../src/utils/approveOrganizer');

// -------------------- MOCKING DEPENDENCIES --------------------
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_password'),
  compare: jest.fn().mockResolvedValue(true)
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock_jwt_token')
}));

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

jest.mock('../../../../db/db.js', () => ({
  query: jest.fn()
}));
const pool = require('../../../../db/db.js');

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
    mockReq = { body: {}, params: {} };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn()
    };
    jest.clearAllMocks();

    // silence console.error logs
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  // -------------------- REGISTER --------------------
  describe('register', () => {
    it('should return 400 if required fields are missing', async () => {
      mockReq.body = { fname: 'John' };

      await register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        // ✅ Match actual controller (lowercase fname/lname)
        message: "fname, lname, Email (username) and Password are required"
      });
    });

    it('should return 400 if email already exists', async () => {
      mockReq.body = { fname: 'John', lname: 'Doe', email: 'exists@mail.com', password: 'pass' };
      pool.query.mockResolvedValueOnce({ rows: [{ email: 'exists@mail.com' }] });

      await register(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Email (username) already registered"
      });
    });

    it('should register and send approval email', async () => {
      mockReq.body = { fname: 'John', lname: 'Doe', email: 'new@mail.com', password: 'pass', contact_no: '123' };

      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{
            organizer_ID: 1,
            organizer_name: 'John Doe',
            email: 'new@mail.com',
            status: 'pending'
          }]
        });

      await register(mockReq, mockRes);

      expect(pool.query).toHaveBeenCalledTimes(2);
      expect(bcrypt.hash).toHaveBeenCalledWith('pass', 10);
      expect(sendApprovalEmail).toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });
  });

  // -------------------- LOGIN --------------------
  describe('login', () => {
    it('should return 400 if email or password is missing', async () => {
      mockReq.body = { email: 'test@mail.com' };

      await login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        message: "Email (username) and Password are required"
      });
    });

    it('should return 401 if user not found', async () => {
      mockReq.body = { email: 'no@mail.com', password: 'pass' };
      pool.query.mockResolvedValueOnce({ rows: [] });

      await login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(401);
    });

    it('should return 403 if account not approved', async () => {
      mockReq.body = { email: 'pending@mail.com', password: 'pass' };
      pool.query.mockResolvedValueOnce({
        rows: [{ email: 'pending@mail.com', password_hash: 'hash', status: 'pending' }]
      });

      await login(mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(403);
    });

    it('should login successfully', async () => {
      mockReq.body = { email: 'approved@mail.com', password: 'pass' };
      pool.query.mockResolvedValueOnce({
        rows: [{ organizer_ID: 1, email: 'approved@mail.com', password_hash: 'hash', status: 'approved' }]
      });

      await login(mockReq, mockRes);

      expect(bcrypt.compare).toHaveBeenCalled();
      expect(jwt.sign).toHaveBeenCalled();
      // ✅ Ensure login returns 200 (fix controller if needed)
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

    pool.query.mockResolvedValueOnce({
      rows: [{ organizer_ID: 1, organizer_name: 'John', email: 'john@mail.com' }]
    });

    await approveOrganizer(req, res);

    expect(sendOrganizerApprovedEmail).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      message: "Organizer approved successfully",
      organizer: expect.any(Object)
    });
  });
});
