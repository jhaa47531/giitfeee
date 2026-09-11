import crypto from 'crypto';

export const handler = async (event: any) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ success: false, error: 'Method Not Allowed' })
    };
  }

  try {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return {
        statusCode: 503,
        body: JSON.stringify({
          success: false,
          error: 'Razorpay credentials (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) not set in Netlify environment variables.'
        })
      };
    }

    const body = JSON.parse(event.body || '{}');
    const { amount, studentId, studentName, course, sem } = body;

    const parsedAmount = Number(amount);
    if (!parsedAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: 'Invalid payment amount.' })
      };
    }

    const amountInPaise = Math.round(parsedAmount * 100);
    const safeId = (studentId || 'std').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 15);
    const receipt = `rcpt_${safeId}_${Date.now()}`.slice(0, 40);

    const payload = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: receipt,
      notes: {
        studentId: String(studentId || ''),
        studentName: String(studentName || ''),
        course: String(course || ''),
        sem: String(sem || ''),
        platform: 'GIIT Fee Portal'
      }
    };

    const authString = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authString}`
      },
      body: JSON.stringify(payload)
    });

    const data: any = await response.json();

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: JSON.stringify({
          success: false,
          error: data?.error?.description || 'Failed to create order with Razorpay.'
        })
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        orderId: data.id,
        amount: data.amount,
        currency: data.currency || 'INR',
        receipt: data.receipt,
        keyId: keyId
      })
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: err.message || 'Internal Server Error' })
    };
  }
};
