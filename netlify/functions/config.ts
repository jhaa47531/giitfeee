export const handler = async () => {
  const keyId = process.env.RAZORPAY_KEY_ID || '';
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      configured: Boolean(keyId && process.env.RAZORPAY_KEY_SECRET),
      keyId: keyId
    })
  };
};
