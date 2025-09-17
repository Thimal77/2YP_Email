// -------------------- MOCK NODEMAILER --------------------
const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'mock-message-id' });
const mockCreateTransport = jest.fn().mockReturnValue({ sendMail: mockSendMail });

jest.mock('nodemailer', () => ({
  createTransport: mockCreateTransport
}));

// -------------------- IMPORT EMAIL UTILS --------------------
const { sendApprovalEmail } = require('../../src/utils/sendApproveEmail');
const { sendOrganizerApprovedEmail } = require('../../src/utils/notificationEmail');

process.env.SMTP_EMAIL = 'test@example.com';
process.env.ADMIN_EMAIL = 'admin@example.com';

// -------------------- TEST SUITE --------------------
describe('Email Utilities Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendApprovalEmail', () => {
    it('should send approval email to admin', async () => {
      const organizer = { organizer_name: 'John Doe', email: 'john@mail.com' };
      const approvalLink = 'http://localhost:3000/approve/1';

      await sendApprovalEmail('admin@eventify.com', organizer, approvalLink);

      expect(mockCreateTransport).toHaveBeenCalled();
      const sendMailCall = mockSendMail.mock.calls[0][0];
      expect(sendMailCall.to).toBe('admin@eventify.com');
      expect(sendMailCall.html).toContain('John Doe');
      expect(sendMailCall.html).toContain(approvalLink);
    });

    it('should handle failure gracefully', async () => {
      const organizer = { organizer_name: 'John Doe', email: 'john@mail.com' };
      const approvalLink = 'http://localhost:3000/approve/1';
      mockSendMail.mockRejectedValueOnce(new Error('SMTP failed'));

      await expect(sendApprovalEmail('admin@eventify.com', organizer, approvalLink))
        .rejects.toThrow('SMTP failed');
    });
  });

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
  });
});
