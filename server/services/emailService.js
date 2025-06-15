const nodemailer = require('nodemailer');

// Email configuration
const createTransporter = () => {
  if (process.env.NODE_ENV === 'production') {
    // AWS SES configuration for production
    return nodemailer.createTransporter({
      SES: {
        aws: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          region: process.env.AWS_REGION || 'us-east-1'
        }
      }
    });
  } else {
    // Development configuration (using Gmail or other SMTP)
    return nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
};

const sendShipmentNotification = async (notificationData) => {
  try {
    const transporter = createTransporter();
    
    const {
      type,
      contractId,
      shipmentId,
      batteriesShipped,
      totalShipped,
      threshold,
      deviceCount,
      userEmail,
      userName
    } = notificationData;

    let subject, htmlBody, textBody;

    switch (type) {
      case 'SHIPMENT_BLOCKED':
        subject = `⚠ PBR Battery Shipment Limit Reached (Contract: ${contractId})`;
        htmlBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #dc2626; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0;">⚠ Shipment Limit Reached</h1>
            </div>
            <div style="padding: 20px; background-color: #f9fafb;">
              <p>The battery shipment limit for PBR contract <strong>${contractId}</strong> has been reached.</p>
              
              <div style="background-color: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #374151;">Contract Details:</h3>
                <ul style="list-style: none; padding: 0;">
                  <li><strong>Contract ID:</strong> ${contractId}</li>
                  <li><strong>Devices under contract:</strong> ${deviceCount}</li>
                  <li><strong>Batteries shipped:</strong> ${totalShipped}</li>
                  <li><strong>Threshold:</strong> ${threshold}</li>
                  <li><strong>Attempted shipment:</strong> ${batteriesShipped} batteries</li>
                  <li><strong>Initiated by:</strong> ${userName}</li>
                </ul>
              </div>
              
              <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
                <p style="margin: 0; color: #991b1b;">
                  <strong>Action Required:</strong> Further shipments are BLOCKED until manual review.
                </p>
              </div>
              
              <p>Please review the contract and take appropriate action.</p>
            </div>
          </div>
        `;
        textBody = `
PBR Battery Shipment Limit Reached

Contract: ${contractId}
Devices under contract: ${deviceCount}
Batteries shipped: ${totalShipped}
Threshold: ${threshold}
Attempted shipment: ${batteriesShipped} batteries
Initiated by: ${userName}

Further shipments are BLOCKED until manual review.
        `;
        break;

      case 'THRESHOLD_WARNING':
        subject = `⚠ PBR Battery Shipment Approaching Limit (Contract: ${contractId})`;
        htmlBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #f59e0b; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0;">⚠ Approaching Shipment Limit</h1>
            </div>
            <div style="padding: 20px; background-color: #f9fafb;">
              <p>The battery shipment for PBR contract <strong>${contractId}</strong> is approaching its limit.</p>
              
              <div style="background-color: white; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #374151;">Contract Details:</h3>
                <ul style="list-style: none; padding: 0;">
                  <li><strong>Contract ID:</strong> ${contractId}</li>
                  <li><strong>Devices under contract:</strong> ${deviceCount}</li>
                  <li><strong>Batteries shipped:</strong> ${totalShipped}</li>
                  <li><strong>Threshold:</strong> ${threshold}</li>
                  <li><strong>Percentage used:</strong> ${Math.round((totalShipped / threshold) * 100)}%</li>
                </ul>
              </div>
              
              <p>Please monitor this contract closely to avoid exceeding the limit.</p>
            </div>
          </div>
        `;
        textBody = `
PBR Battery Shipment Approaching Limit

Contract: ${contractId}
Devices under contract: ${deviceCount}
Batteries shipped: ${totalShipped}
Threshold: ${threshold}
Percentage used: ${Math.round((totalShipped / threshold) * 100)}%

Please monitor this contract closely.
        `;
        break;

      default:
        throw new Error(`Unknown notification type: ${type}`);
    }

    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@pbr-system.com',
      to: userEmail,
      subject,
      text: textBody,
      html: htmlBody
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', result.messageId);
    
    return {
      success: true,
      messageId: result.messageId
    };

  } catch (error) {
    console.error('Email sending failed:', error);
    throw error;
  }
};

const sendBulkNotifications = async (notifications) => {
  const results = [];
  
  for (const notification of notifications) {
    try {
      const result = await sendShipmentNotification(notification);
      results.push({ ...notification, success: true, result });
    } catch (error) {
      results.push({ ...notification, success: false, error: error.message });
    }
  }
  
  return results;
};

module.exports = {
  sendShipmentNotification,
  sendBulkNotifications
};
