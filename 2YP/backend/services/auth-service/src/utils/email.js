// utils/email.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail', // or your email provider
    auth: {
        user: process.env.ADMIN_EMAIL, // set in .env
        pass: process.env.ADMIN_EMAIL_PASSWORD // set in .env
    }
});

async function sendApprovalEmail(adminEmail, organizer, approvalLink) {
    const mailOptions = {
        from: process.env.ADMIN_EMAIL,
        to: adminEmail,
        subject: 'Organizer Approval Request',
        html: `<p>New organizer registration request:</p>
               <ul>
                 <li>Name: ${organizer.organizer_name}</li>
                 <li>Email: ${organizer.email}</li>
               </ul>
               <p><a href="${approvalLink}">Approve this organizer</a></p>`
    };
    await transporter.sendMail(mailOptions);
}

module.exports = { sendApprovalEmail };
