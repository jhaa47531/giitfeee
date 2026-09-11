import crypto from 'crypto';

const netlifyProcessedPayments = new Set<string>();

export const handler = async (event: any) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ success: false, error: 'Method Not Allowed' })
    };
  }

  try {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
      return {
        statusCode: 503,
        body: JSON.stringify({
          success: false,
          error: 'RAZORPAY_KEY_SECRET is not configured on Netlify server environment.'
        })
      };
    }

    const body = JSON.parse(event.body || '{}');
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      studentId,
      studentDocId,
      amount
    } = body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return {
        statusCode: 400,
        body: JSON.stringify({ success: false, error: 'Missing payment verification data.' })
      };
    }

    // Idempotency check
    if (netlifyProcessedPayments.has(razorpay_payment_id)) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          alreadyProcessed: true,
          paymentId: razorpay_payment_id,
          orderId: razorpay_order_id,
          amount: Number(amount),
          message: 'Payment has already been verified and processed.'
        })
      };
    }

    // HMAC SHA256 Signature Verification
    const bodyToSign = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(bodyToSign)
      .digest('hex');

    const sigBuffer = Buffer.from(String(razorpay_signature), 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

    const isValid =
      sigBuffer.length === expectedBuffer.length &&
      crypto.timingSafeEqual(sigBuffer, expectedBuffer);

    if (!isValid) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: 'Payment signature verification failed. Invalid transaction signature.'
        })
      };
    }

    netlifyProcessedPayments.add(razorpay_payment_id);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        alreadyProcessed: false,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        studentId: studentId,
        studentDocId: studentDocId,
        amount: Number(amount),
        status: 'SUCCESS',
        message: 'Payment verified successfully.'
      })
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: err.message || 'Verification Error' })
    };
  }
};
