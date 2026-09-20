import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// 1. Conectamos con Stripe y con tu Base de Datos (Supabase)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20' as any,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  // 2. Recibimos el aviso de pago que manda Stripe
  const body = await request.text();
  const sig = request.headers.get('stripe-signature') as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event;

  try {
    // 3. Verificamos que el aviso sea legítimo (Seguridad anti-hackers)
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error(`❌ Alerta de seguridad: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // 4. Si el pago fue EXITOSO, sumamos los créditos a la alumna
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    
    if (userId) {
      // Le preguntamos a Stripe exactamente qué producto se pagó
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
      const priceId = lineItems.data[0]?.price?.id;

      let creditosComprados = 0;
      let diasVigencia = 0; // <-- NUEVO: Memoria para los días

      // 👇 RECUERDA REEMPLAZAR ESTOS POR TUS CÓDIGOS price_... REALES DE PRODUCCIÓN 👇
      if (priceId === 'price_1UCvY9PXqkbuRJkatIwCDBWw') { creditosComprados = 1; diasVigencia = 7; }
      else if (priceId === 'price_1UCvfNPXqkbuRJka0Trdg8UO') { creditosComprados = 8; diasVigencia = 30; }
      else if (priceId === 'price_1UCvjAPXqkbuRJkaF7V8zcEw') { creditosComprados = 12; diasVigencia = 30; }
      else if (priceId === 'price_1UCvo1PXqkbuRJkaOJUcfZ7M') { creditosComprados = 16; diasVigencia = 30; }
      else if (priceId === 'price_1UCvovPXqkbuRJkauMH3Ffkg') { creditosComprados = 20; diasVigencia = 45; }
      else if (priceId === 'price_1UCvq3PXqkbuRJkapXnB8gQ5') { creditosComprados = 999; diasVigencia = 60; }

      if (creditosComprados > 0) {
         // Buscamos cuántos créditos y cuándo vencían antes
         const { data: perfilActual } = await supabase
         .from('perfiles')
         .select('creditos, fecha_expiracion, nombre, whatsapp') // <-- AGREGAMOS nombre y whatsapp
         .eq('id', userId)
         .single();

         const creditosAnteriores = perfilActual?.creditos || 0;
         const nuevosCreditos = creditosAnteriores + creditosComprados;

         // 🛡️ BLINDAJE 1: ZONA HORARIA DE MONTERREY PARA LA EXPIRACIÓN
         const horaOficialString = new Date().toLocaleString("en-US", { timeZone: "America/Monterrey" });
         const nuevaFecha = new Date(horaOficialString);
         nuevaFecha.setDate(nuevaFecha.getDate() + diasVigencia);
         const fechaExpiracionSQL = nuevaFecha.toISOString().split('T')[0];

         // 1. ASIGNAR CRÉDITOS Y FECHA LÍMITE
         await supabase
            .from('perfiles')
            .update({ creditos: nuevosCreditos, fecha_expiracion: fechaExpiracionSQL })
            .eq('id', userId);
         
         // 🛡️ BLINDAJE 2: EL ESLABÓN PERDIDO CONTABLE (REGISTRAR EN FINANZAS)
         // Stripe manda el monto en centavos, lo dividimos entre 100
         const montoPagado = session.amount_total ? session.amount_total / 100 : 0; 
         
         // Asegúrate de que el nombre de la tabla ('transacciones' o 'pagos') sea el correcto
         await supabase
            .from('transacciones') 
            .insert([{
                cliente_nombre: perfilActual?.nombre || session.customer_details?.name || 'Venta Online',
                cliente_whatsapp: perfilActual?.whatsapp || 'Sin registro', // <-- Columna de tu imagen
                paquete_comprado: creditosComprados === 999 ? 'Ilimitadas' : `${creditosComprados} Clases`, // <-- Columna de tu imagen
                monto_mxn: montoPagado, // <-- Columna de tu imagen
                metodo_pago: 'Tarjeta',
                estatus_pago: 'Pagado', // <-- Columna de tu imagen
                fecha_pago: new Date(horaOficialString).toISOString() // <-- Columna de tu imagen
            }]);

         console.log(`✅ ¡Éxito! Se sumaron ${creditosComprados} clases y se registró $${montoPagado} en finanzas.`);
      }
    }
  }

  // Le avisamos a Stripe que recibimos el mensaje bien para que no lo vuelva a mandar
  return NextResponse.json({ received: true });
}