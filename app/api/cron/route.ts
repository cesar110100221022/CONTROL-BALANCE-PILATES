export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase'; // Ajusta los '../' si tu carpeta lib está en otro lado

export async function GET(request: Request) {
  // 1. CANDADO DE SEGURIDAD: Validar que la petición viene de Vercel y no de un intruso
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Acceso denegado. Llave incorrecta.', { status: 401 });
  }

  try {
    // 2. Calcular la fecha actual (Corte exacto en formato YYYY-MM-DD)
    const hoy = new Date().toISOString().split('T')[0];

    // 3. Ejecutar la limpieza masiva en Supabase
    const { data, error } = await supabase
      .from('perfiles')
      .update({ creditos: 0 })
      // Regla A: Solo afectar a las que su fecha ya pasó (es menor a hoy)
      .lt('fecha_expiracion', hoy)
      // Regla B: Solo afectar a las que todavía tienen créditos (para no gastar recursos a lo tonto)
      .gt('creditos', 0)
      .select('nombre, whatsapp'); // Guardamos los nombres para el reporte

    if (error) {
      throw error;
    }

    // 4. Reporte de éxito para los registros de Vercel
    return NextResponse.json({ 
      success: true, 
      mensaje: `Limpieza exitosa. Se vencieron los paquetes de ${data?.length || 0} clientas.`,
      clientas_afectadas: data 
    });

  } catch (error: any) {
    console.error("Error crítico en el Cron Job de limpieza:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}