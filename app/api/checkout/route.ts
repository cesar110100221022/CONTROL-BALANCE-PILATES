export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2024-06-20' as any, // <-- AGREGAR "as any"
  });

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { priceId, userId, userEmail } = body;

    if (!priceId || !userId) {
      return NextResponse.json({ error: "Faltan datos de la compra o del usuario" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      customer_email: userEmail || undefined,
      success_url: `http://localhost:3000/dashboard?pago=exitoso`,
      cancel_url: `http://localhost:3000/?pago=cancelado`,
      metadata: {
        userId: userId,
      },
    });

    return NextResponse.json({ url: session.url });

  } catch (error: any) {
    console.error("Error crítico en el checkout de Stripe:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}