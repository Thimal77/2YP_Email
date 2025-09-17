// -------------------- SET ENV VARIABLES --------------------
process.env.SMTP_EMAIL = 'test@example.com';
process.env.ADMIN_EMAIL = 'admin@example.com';
process.env.ADMIN_PASSWORD = 'testpass';

// -------------------- MOCK NODEMAILER --------------------
const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'mock-message-id' });

jest.mock('nodemailer', () => ({
  // createTransport always returns our mock sendMail function
  createTransport: () => ({ sendMail: mockSendMail })
}));

// -------------------- IMPORT EMAIL UTILS --------------------
const { sendApprovalEmail } = require('../../src/utils/sendApproveEmail');
const { sendOrganizerApprovedEmail } = require('../../src/utils/notificationEmail');

// -------------------- TEST SUITE --------------------
describe('Email Utilities Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks(); // Clear mock calls before each test
  });

  // -------------------- sendApprovalEmail --------------------
  describe('sendApprovalEmail', () => {
    it('should send approval email to admin', async () => {
      const organizer = { organizer_name: 'John Doe', email: 'john@mail.com' };
      const approvalLink = 'http://localhost:3000/approve/1';

      await sendApprovalEmail('admin@eventify.com', organizer, approvalLink);

      // Assert sendMail was called with correct 'to' and HTML content
      const sendMailCall = mockSendMail.mock.calls[0][0];
      expect(sendMailCall.to).toBe('admin@eventify.com');
      expect(sendMailCall.html).toContain('John Doe');
      expect(sendMailCall.html).toContain(approvalLink);
    });

    it('should handle SMTP failure gracefully', async () => {
      const organizer = { organizer_name: 'John Doe', email: 'john@mail.com' };
      mockSendMail.mockRejectedValueOnce(new Error('SMTP failed'));

      await expect(sendApprovalEmail('admin@eventify.com', organizer, 'link'))
        .rejects.toThrow('SMTP failed');
    });

    it('should handle missing recipient email', async () => {
      const organizer = { organizer_name: 'John Doe', email: '' };
      await expect(sendApprovalEmail('', organizer, 'link'))
        .rejects.toThrow(); // sendMail will reject due to missing 'to'
    });

    it('should handle special characters in organizer name', async () => {
      const organizer = { organizer_name: "O'Reilly <Test>", email: 'oreilly@mail.com' };
      await sendApprovalEmail('admin@eventify.com', organizer, 'link');

      const sendMailCall = mockSendMail.mock.calls[0][0];
      expect(sendMailCall.html).toContain("O'Reilly <Test>");
    });

    it('should handle very long organizer names and approval links', async () => {
      const organizer = { organizer_name: 'A'.repeat(500), email: 'long@mail.com' };
      const link = 'http://localhost:3000/approve/' + '1'.repeat(500);

      await sendApprovalEmail('admin@eventify.com', organizer, link);
      const sendMailCall = mockSendMail.mock.calls[0][0];
      expect(sendMailCall.html).toContain('A'.repeat(500));
      expect(sendMailCall.html).toContain('1'.repeat(500));
    });
  });

  // -------------------- sendOrganizerApprovedEmail --------------------
  describe('sendOrganizerApprovedEmail', () => {
    it('should send notification to organizer', async () => {
      const organizer = { organizer_name: 'Jane Smith', email: 'jane@mail.com' };
      await sendOrganizerApprovedEmail(organizer);

      const sendMailCall = mockSendMail.mock.calls[0][0];
      expect(sendMailCall.to).toBe('jane@mail.com');
      expect(sendMailCall.html).toContain('Jane Smith');
      expect(sendMailCall.html).toContain('approved');
    });

    it('should handle email server failure', async () => {
      const organizer = { organizer_name: 'Jane Smith', email: 'jane@mail.com' };
      mockSendMail.mockRejectedValueOnce(new Error('Server down'));

      await expect(sendOrganizerApprovedEmail(organizer))
        .rejects.toThrow('Server down');
    });

    it('should handle special characters in organizer name', async () => {
      const organizer = { organizer_name: "O'Reilly Events", email: 'oreilly@mail.com' };
      await sendOrganizerApprovedEmail(organizer);

      const sendMailCall = mockSendMail.mock.calls[0][0];
      expect(sendMailCall.html).toContain("O'Reilly Events");
    });

    it('should handle empty email', async () => {
      const organizer = { organizer_name: "Test", email: "" };
      await expect(sendOrganizerApprovedEmail(organizer))
        .rejects.toThrow();
    });

    it('should handle very long names', async () => {
      const organizer = { organizer_name: 'B'.repeat(500), email: 'long@mail.com' };
      await sendOrganizerApprovedEmail(organizer);

      const sendMailCall = mockSendMail.mock.calls[0][0];
      expect(sendMailCall.html).toContain('B'.repeat(500));
    });
  });
});
