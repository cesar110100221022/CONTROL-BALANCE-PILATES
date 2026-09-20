import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 1. Detectamos el tipo de aviso (Si el código viejo no lo envía, asumimos RESERVA)
    const tipo = body.tipo || 'RESERVA'; 
    const datos = body.datos || body;

    const { nombreCliente, telefono, dia, clase, horario, creditosRestantes } = datos;
    const numeroLimpio = telefono ? String(telefono).replace(/\D/g, '') : '';
    const correoAdmin = 'controlbalancestudio26@gmail.com';

    // 2. Variables dinámicas para el diseño del correo
    let subject = "";
    let tituloHtml = "";
    let colorTema = "";
    let mensajeExtra = "";

    // 3. Lógica según lo que haya pasado en el estudio
    if (tipo === 'RESERVA') {
      subject = `🔔 Nueva Reserva: ${nombreCliente}`;
      tituloHtml = "¡Tienes una nueva reserva! 🎉";
      colorTema = "#059669"; // Verde esmeralda
      mensajeExtra = "El sistema ha descontado su crédito y apartado la cama de forma automática.";
    } else if (tipo === 'CANCELACION') {
      subject = `⚠️ Cancelación: ${nombreCliente} liberó una cama`;
      tituloHtml = "¡Una alumna ha cancelado! 🔄";
      colorTema = "#dc2626"; // Rojo alerta
      mensajeExtra = "Se acaba de liberar una cama en esta clase. Si hay personas en la fila de espera, te aparecerán en tu Panel de Control.";
    } else if (tipo === 'LISTA_ESPERA') {
      subject = `⏳ Fila de Espera: ${nombreCliente}`;
      tituloHtml = "¡Alguien se formó en la fila! 🙋‍♀️";
      colorTema = "#f59e0b"; // Naranja/Ámbar
      mensajeExtra = "Esta clienta no alcanzó cama y está esperando que alguien cancele para tomar su lugar.";
    }

    // 4. Enviamos el correo con el diseño adaptado
    const { data, error } = await resend.emails.send({
      from: 'Control Balance <onboarding@resend.dev>', // Recuerda cambiar esto cuando verifiques tu dominio en Resend
      to: [correoAdmin],
      subject: subject,
      html: `
        <div style="font-family: sans-serif; color: #333; padding: 20px;">
          <h2 style="color: ${colorTema};">${tituloHtml}</h2>
          <p>${mensajeExtra}</p>
          
          <ul style="background: #f5efe6; padding: 20px; border-radius: 8px; list-style: none;">
            <li style="margin-bottom: 12px;">👤 <strong>Alumna:</strong> ${nombreCliente || 'No especificado'}</li>
            <li style="margin-bottom: 12px;">📱 <strong>WhatsApp:</strong> <a href="https://wa.me/${numeroLimpio}" style="color: ${colorTema}; text-decoration: none; font-weight: bold;">${telefono || 'No especificado'}</a></li>
            <li style="margin-bottom: 12px;">📅 <strong>Día de la clase:</strong> ${dia || 'No especificado'}</li>
            <li style="margin-bottom: 12px;">⏰ <strong>Horario:</strong> ${horario || 'No especificado'}</li>
            <li style="margin-bottom: 12px;">🧘‍♀️ <strong>Clase:</strong> ${clase || 'No especificada'}</li>
            <li style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd;">
              🎟️ <strong>Créditos restantes:</strong> ${creditosRestantes !== undefined ? creditosRestantes : 'N/A'}
            </li>
          </ul>

          <p style="margin-top: 20px; font-size: 12px; color: #888;">
            Inicia sesión en tu Panel de Control para ver más detalles o da clic en el número de WhatsApp para escribirle directo a la alumna.
          </p>
        </div>
      `,
    });
    // 🛡️ BLINDAJE: Verificamos si Resend respondió con un error interno sin colapsar
    if (error) {
      console.error("⚠️ Resend bloqueó el envío:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  } catch (error: any) {
    // 🛡️ Atrapa fallos de red o caídas del servidor
    console.error("🚨 Fallo crítico en el servidor de correos:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}