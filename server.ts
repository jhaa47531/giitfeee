import express, { Request, Response } from 'express';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

// Idempotency tracking sets to prevent duplicate credits
const processedPaymentIds = new Set<string>();
const processedOrderIds = new Set<string>();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --------------------------------------------------------------------------
  // API ROUTE: GET /api/razorpay/config
  // Returns the public Key ID only. NEVER exposes RAZORPAY_KEY_SECRET.
  // --------------------------------------------------------------------------
  app.get('/api/razorpay/config', (_req: Request, res: Response) => {
    const keyId = process.env.RAZORPAY_KEY_ID || '';
    res.json({
      configured: Boolean(keyId && process.env.RAZORPAY_KEY_SECRET),
      keyId: keyId
    });
  });

  // --------------------------------------------------------------------------
  // API ROUTE: POST /api/razorpay/create-order
  // Creates an official Razorpay Order server-side using Live/Configured credentials.
  // Amount converted to paise (₹1 = 100 paise) and strictly validated.
  // --------------------------------------------------------------------------
  app.post('/api/razorpay/create-order', async (req: Request, res: Response) => {
    try {
      const { amount, studentId, studentName, course, sem } = req.body;

      const keyId = process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;

      if (!keyId || !keySecret) {
        return res.status(503).json({
          success: false,
          error: 'Razorpay API credentials (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) are not configured on the server environment. Please set them in your environment settings.'
        });
      }

      // Strict validation
      const parsedAmount = Number(amount);
      if (!parsedAmount || isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid payment amount specified. Amount must be greater than zero.'
        });
      }

      if (parsedAmount > 1000000) {
        return res.status(400).json({
          success: false,
          error: 'Specified amount exceeds maximum transaction limit (₹10,00,000).'
        });
      }

      if (!studentId || typeof studentId !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Student identification ID is required for fee order creation.'
        });
      }

      // Convert INR rupees to paise (e.g. ₹1000 = 100000 paise)
      const amountInPaise = Math.round(parsedAmount * 100);

      // Generate a distinct receipt reference for this order
      const safeId = studentId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 15);
      const receipt = `rcpt_${safeId}_${Date.now()}`.slice(0, 40);

      const payload = {
        amount: amountInPaise,
        currency: 'INR',
        receipt: receipt,
        notes: {
          studentId: String(studentId),
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
        const errorDesc =
          data?.error?.description ||
          data?.error?.message ||
          'Failed to create order with Razorpay gateway.';
        console.error('Razorpay Order API Error:', data);
        return res.status(response.status).json({
          success: false,
          error: errorDesc
        });
      }

      // Return public order details for checkout initialization
      return res.json({
        success: true,
        orderId: data.id,
        amount: data.amount,
        currency: data.currency || 'INR',
        receipt: data.receipt,
        keyId: keyId
      });
    } catch (err: any) {
      console.error('Error in /api/razorpay/create-order:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Internal server error while creating payment order.'
      });
    }
  });

  // --------------------------------------------------------------------------
  // API ROUTE: POST /api/razorpay/verify-payment
  // Server-side HMAC SHA256 signature verification using RAZORPAY_KEY_SECRET.
  // Enforces strict idempotency to prevent duplicate crediting.
  // --------------------------------------------------------------------------
  app.post('/api/razorpay/verify-payment', async (req: Request, res: Response) => {
    try {
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        studentId,
        studentDocId,
        amount
      } = req.body;

      const keySecret = process.env.RAZORPAY_KEY_SECRET;

      if (!keySecret) {
        return res.status(503).json({
          success: false,
          error: 'RAZORPAY_KEY_SECRET is not configured on the server. Cannot verify signature.'
        });
      }

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({
          success: false,
          error: 'Missing required Razorpay payment verification parameters.'
        });
      }

      // ----------------------------------------------------------------------
      // STEP 9: Idempotency check - Prevent duplicate payment credit
      // ----------------------------------------------------------------------
      if (processedPaymentIds.has(razorpay_payment_id) || processedOrderIds.has(razorpay_order_id)) {
        return res.json({
          success: true,
          alreadyProcessed: true,
          paymentId: razorpay_payment_id,
          orderId: razorpay_order_id,
          amount: Number(amount),
          message: 'Payment has already been verified and credited.'
        });
      }

      // ----------------------------------------------------------------------
      // STEP 7: Server-side HMAC SHA256 signature verification
      // ----------------------------------------------------------------------
      const bodyToSign = `${razorpay_order_id}|${razorpay_payment_id}`;
      const expectedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(bodyToSign)
        .digest('hex');

      const sigBuffer = Buffer.from(String(razorpay_signature), 'utf8');
      const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

      const isSignatureValid =
        sigBuffer.length === expectedBuffer.length &&
        crypto.timingSafeEqual(sigBuffer, expectedBuffer);

      if (!isSignatureValid) {
        console.warn(`Payment signature mismatch for payment ${razorpay_payment_id} / order ${razorpay_order_id}`);
        return res.status(400).json({
          success: false,
          error: 'Payment signature verification failed. Invalid transaction signature.'
        });
      }

      // Mark as processed in idempotency set to block any future duplicate submissions
      processedPaymentIds.add(razorpay_payment_id);
      processedOrderIds.add(razorpay_order_id);

      return res.json({
        success: true,
        alreadyProcessed: false,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        studentId: studentId,
        studentDocId: studentDocId,
        amount: Number(amount),
        status: 'SUCCESS',
        message: 'Payment signature verified successfully by banking gateway.'
      });
    } catch (err: any) {
      console.error('Error in /api/razorpay/verify-payment:', err);
      return res.status(500).json({
        success: false,
        error: err.message || 'Server error during payment verification.'
      });
    }
  });

  // --------------------------------------------------------------------------
  // Vite integration: Dev middleware or Static production serving
  // --------------------------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`GIIT Fee Portal Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
