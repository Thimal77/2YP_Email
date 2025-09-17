// -------------------- IMPORT EMAIL UTILITIES --------------------

// Import the functions that send emails
const { sendApprovalEmail } = require('../../src/utils/sendApproveEmail');
const { sendOrganizerApprovedEmail } = require('../../src/utils/notificationEmail');

// -------------------- MOCK EXTERNAL DEPENDENCIES --------------------

// Mock nodemailer to avoid sending real emails during tests
jest.mock('nodemailer');

// -------------------- TEST SUITE FOR EMAIL UTILITIES --------------------
describe('Email Utilities', () => {

  // Clear all mocks before each test so no call history is shared
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // -------------------- TEST: ADMIN APPROVAL EMAIL --------------------
  it('should send approval email to admin', async () => {
    // Sample organizer data
    const organizer = {
      organizer_name: 'John Doe',
      email: 'john@email.com'
    };

    // Sample approval link that would be included in the email
    const approvalLink = 'http://localhost/approve/1';

    // Call the function that should send the email
    await sendApprovalEmail('admin@email.com', organizer, approvalLink);

    // Require nodemailer after mocking it
    const nodemailer = require('nodemailer');

    // Check that nodemailer.sendMail was called
    // This ensures that our function attempted to send an email
    expect(nodemailer.createTransport().sendMail).toHaveBeenCalled();
  });

  // -------------------- TEST: NOTIFY ORGANIZER EMAIL --------------------
  it('should send approval notification to organizer', async () => {
    // Sample organizer data
    const organizer = {
      organizer_name: 'John Doe',
      email: 'john@email.com'
    };

    // Call the function that should notify the organizer
    await sendOrganizerApprovedEmail(organizer);

    // Require nodemailer after mocking it
    const nodemailer = require('nodemailer');

    // Check that nodemailer.sendMail was called
    // Confirms that our notification function attempted to send an email
    expect(nodemailer.createTransport().sendMail).toHaveBeenCalled();
  });
});
