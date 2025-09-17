// -------------------- SET ENV VARIABLES --------------------
// These environment variables simulate your real email credentials
// during testing so that nodemailer doesn't throw errors.
process.env.SMTP_EMAIL = 'test@example.com';
process.env.ADMIN_EMAIL = 'admin@example.com';
process.env.ADMIN_PASSWORD = 'testpass';

// -------------------- MOCK NODEMAILER --------------------
// We mock nodemailer so no real emails are sent during tests.
// mockSendMail simulates the sendMail method of the transporter.
const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'mock-message-id' });

jest.mock('nodemailer', () => ({
  // createTransport is mocked to return our mockSendMail function
  createTransport: () => ({ sendMail: mockSendMail })
}));

// -------------------- IMPORT EMAIL UTILS --------------------
// Import the functions we want to test
const { sendApprovalEmail } = require('../../src/utils/sendApproveEmail');
const { sendOrganizerApprovedEmail } = require('../../src/utils/notificationEmail');

// -------------------- TEST SUITE --------------------
describe('Email Utilities Tests', () => {
  beforeEach(() => {
    // Clear mocks before each test to avoid test pollution
    jest.clearAllMocks();
  });

  // -------------------- TEST sendApprovalEmail --------------------
  describe('sendApprovalEmail', () => {
    it('should send approval email to admin', async () => {
      // Arrange: setup organizer and approval link
      const organizer = { organizer_name: 'John Doe', email: 'john@mail.com' };
      const approvalLink = 'http://localhost:3000/approve/1';

      // Act: call the function under test
      await sendApprovalEmail('admin@eventify.com', organizer, approvalLink);

      // Assert: check that sendMail was called with correct 'to' address
      const sendMailCall = mockSendMail.mock.calls[0][0];
      expect(sendMailCall.to).toBe('admin@eventify.com');

      // Assert: check that email content contains organizer name and approval link
      expect(sendMailCall.html).toContain('John Doe');
      expect(sendMailCall.html).toContain(approvalLink);
    });

    it('should handle failure gracefully', async () => {
      // Arrange: setup organizer and approval link
      const organizer = { organizer_name: 'John Doe', email: 'john@mail.com' };
      const approvalLink = 'http://localhost:3000/approve/1';

      // Simulate sendMail throwing an error
      mockSendMail.mockRejectedValueOnce(new Error('SMTP failed'));

      // Assert: function should reject with the same error
      await expect(sendApprovalEmail('admin@eventify.com', organizer, approvalLink))
        .rejects.toThrow('SMTP failed');
    });
  });

  // -------------------- TEST sendOrganizerApprovedEmail --------------------
  describe('sendOrganizerApprovedEmail', () => {
    it('should send notification to organizer', async () => {
      // Arrange: setup organizer
      const organizer = { organizer_name: 'Jane Smith', email: 'jane@mail.com' };

      // Act: call function
      await sendOrganizerApprovedEmail(organizer);

      // Assert: sendMail called with correct recipient and content
      const sendMailCall = mockSendMail.mock.calls[0][0];
      expect(sendMailCall.to).toBe('jane@mail.com');
      expect(sendMailCall.html).toContain('Jane Smith');
      expect(sendMailCall.html).toContain('approved');
    });

    it('should handle email server failure', async () => {
      // Arrange: setup organizer
      const organizer = { organizer_name: 'Jane Smith', email: 'jane@mail.com' };

      // Simulate sendMail throwing an error
      mockSendMail.mockRejectedValueOnce(new Error('Server down'));

      // Assert: function should reject with the same error
      await expect(sendOrganizerApprovedEmail(organizer))
        .rejects.toThrow('Server down');
    });

    it('should handle special characters in organizer name', async () => {
      // Arrange: organizer name with special character
      const organizer = { organizer_name: "O'Reilly Events", email: 'oreilly@mail.com' };

      // Act: call function
      await sendOrganizerApprovedEmail(organizer);

      // Assert: email content contains the special character name
      const sendMailCall = mockSendMail.mock.calls[0][0];
      expect(sendMailCall.html).toContain("O'Reilly Events");
    });
  });
});
