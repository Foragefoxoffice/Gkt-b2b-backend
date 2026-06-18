/**
 * Mock WhatsApp Service
 * In a real application, you would integrate with a provider like Twilio, MessageBird, or WhatsApp Cloud API.
 */

export const sendWhatsappOtp = async (phone, otpCode) => {
  if (!phone) {
    console.log(`[Mock WhatsApp] Warning: No phone number provided to send OTP: ${otpCode}`);
    return false;
  }

  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('====================================================');
  console.log(`[Mock WhatsApp] Sending message to ${phone}`);
  console.log(`[Mock WhatsApp] Message: Your Ambigaa Silks B2B login OTP is: ${otpCode}. It is valid for 10 minutes.`);
  console.log('====================================================');

  return true;
};
