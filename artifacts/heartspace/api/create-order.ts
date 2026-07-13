import Razorpay from 'razorpay';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { amount, currency = 'INR', receipt, notes } = req.body;

  if (!amount) {
    return res.status(400).json({ error: 'Amount is required' });
  }

  const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
  });

  try {
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // paise
      currency,
      receipt,
      notes,
    });
    return res.status(200).json(order);
  } catch (err: any) {
    console.error('Razorpay order creation failed:', err);
    return res.status(500).json({ error: 'Failed to create order' });
  }
}
