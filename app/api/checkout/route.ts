export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20' as any, 
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { priceId, userId, userEmail } = body;

    if (!priceId || !userId) {
      return NextResponse.json({ error: "Faltan datos de la compra o del usuario" }, { status: 400 });
    }

    // Usamos la variable de Vercel, o localhost si estás en tu computadora
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://controlbalancestudio.com';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      allow_promotion_codes: true, // 🔥 LA LÍNEA MÁGICA
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment',
      customer_email: userEmail || undefined,
      success_url: `${baseUrl}/dashboard?pago=exitoso`,
      cancel_url: `${baseUrl}/dashboard?pago=cancelado`, // Te regreso al dashboard en vez de la página de inicio
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