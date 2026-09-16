import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    // 1. Recibimos TODOS los datos nuevos
    const { nombreCliente, telefono, dia, clase, horario, creditosRestantes } = await request.json();

    // 🔥 NUEVO: Limpiamos el teléfono (quita espacios, guiones o paréntesis) para que el link no falle
    const numeroLimpio = telefono ? String(telefono).replace(/\D/g, '') : '';

    const data = await resend.emails.send({
      from: 'Control Balance <onboarding@resend.dev>',
      to: ['controlbalancestudio26@gmail.com'], // ⚠️ Tu correo registrado en Resend
      subject: `🔔 Nueva Reserva: ${nombreCliente}`, 
      html: `
        <div style="font-family: sans-serif; color: #333; padding: 20px;">
          <h2 style="color: #d97757;">¡Tienes una nueva reserva! 🎉</h2>
          <p>El sistema acaba de registrar una nueva clase:</p>
          
          <ul style="background: #f5efe6; padding: 20px; border-radius: 8px; list-style: none;">
            <li style="margin-bottom: 12px;">👤 <strong>Alumna:</strong> ${nombreCliente}</li>
            <li style="margin-bottom: 12px;">📱 <strong>WhatsApp:</strong> <a href="https://wa.me/${numeroLimpio}" style="color: #d97757; text-decoration: none;">${telefono}</a></li>
            <li style="margin-bottom: 12px;">📅 <strong>Día de la clase:</strong> ${dia}</li>
            <li style="margin-bottom: 12px;">⏰ <strong>Horario:</strong> ${horario}</li>
            <li style="margin-bottom: 12px;">🧘‍♀️ <strong>Clase:</strong> ${clase}</li>
            <li style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd;">
              🎟️ <strong>Créditos restantes de la alumna:</strong> ${creditosRestantes}
            </li>
          </ul>

          <p style="margin-top: 20px; font-size: 12px; color: #888;">
            Inicia sesión en tu Panel de Control para ver más detalles o da clic en el número de WhatsApp para escribirle directo a la alumna.
          </p>
        </div>
      `,
    });

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error });
  }
}