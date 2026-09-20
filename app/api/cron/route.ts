export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase'; 

// 1. LA PLANTILLA DE TU TÍA (El cerebro de los horarios)
const HORARIOS_FIJOS = [
  { diaNum: 1, nombre: "Pilates Reformer", horario: "07:00 AM" }, { diaNum: 1, nombre: "Pilates Reformer", horario: "08:00 AM" }, { diaNum: 1, nombre: "Pilates Reformer", horario: "09:00 AM" }, { diaNum: 1, nombre: "Pilates Reformer", horario: "10:00 AM" }, { diaNum: 1, nombre: "Pilates Reformer", horario: "11:00 AM" }, { diaNum: 1, nombre: "Pilates Reformer", horario: "05:00 PM" }, { diaNum: 1, nombre: "Pilates Reformer", horario: "06:00 PM" }, { diaNum: 1, nombre: "Pilates Reformer", horario: "07:00 PM" },
  { diaNum: 2, nombre: "Pilates Reformer", horario: "07:00 AM" }, { diaNum: 2, nombre: "Pilates Reformer", horario: "08:00 AM" }, { diaNum: 2, nombre: "Pilates Reformer", horario: "09:00 AM" }, { diaNum: 2, nombre: "Pilates Reformer", horario: "10:00 AM" }, { diaNum: 2, nombre: "Pilates Reformer", horario: "11:00 AM" }, { diaNum: 2, nombre: "Pilates Reformer", horario: "05:00 PM" }, { diaNum: 2, nombre: "Pilates Reformer", horario: "06:00 PM" }, { diaNum: 2, nombre: "Pilates Reformer", horario: "07:00 PM" }, { diaNum: 2, nombre: "Pilates Reformer", horario: "08:00 PM" },
  { diaNum: 3, nombre: "Pilates Reformer", horario: "07:00 AM" }, { diaNum: 3, nombre: "Pilates Reformer", horario: "08:00 AM" }, { diaNum: 3, nombre: "Pilates Reformer", horario: "09:00 AM" }, { diaNum: 3, nombre: "Pilates Reformer", horario: "10:00 AM" }, { diaNum: 3, nombre: "Pilates Reformer", horario: "11:00 AM" }, { diaNum: 3, nombre: "Pilates Reformer", horario: "05:00 PM" }, { diaNum: 3, nombre: "Pilates Reformer", horario: "06:00 PM" }, { diaNum: 3, nombre: "Pilates Reformer", horario: "07:00 PM" },
  { diaNum: 4, nombre: "Pilates Reformer", horario: "07:00 AM" }, { diaNum: 4, nombre: "Pilates Reformer", horario: "08:00 AM" }, { diaNum: 4, nombre: "Pilates Reformer", horario: "09:00 AM" }, { diaNum: 4, nombre: "Pilates Reformer", horario: "10:00 AM" }, { diaNum: 4, nombre: "Pilates Reformer", horario: "11:00 AM" }, { diaNum: 4, nombre: "Pilates Reformer", horario: "05:00 PM" }, { diaNum: 4, nombre: "Pilates Reformer", horario: "06:00 PM" }, { diaNum: 4, nombre: "Pilates Reformer", horario: "07:00 PM" }, { diaNum: 4, nombre: "Pilates Reformer", horario: "08:00 PM" },
  { diaNum: 5, nombre: "Pilates Reformer", horario: "07:00 AM" }, { diaNum: 5, nombre: "Pilates Reformer", horario: "08:00 AM" }, { diaNum: 5, nombre: "Pilates Reformer", horario: "09:00 AM" }, { diaNum: 5, nombre: "Pilates Reformer", horario: "10:00 AM" }, { diaNum: 5, nombre: "Pilates Reformer", horario: "11:00 AM" }, { diaNum: 5, nombre: "Pilates Reformer", horario: "05:00 PM" }, { diaNum: 5, nombre: "Pilates Reformer", horario: "06:00 PM" }, { diaNum: 5, nombre: "Pilates Reformer", horario: "07:00 PM" },
  { diaNum: 6, nombre: "Pilates Reformer", horario: "09:00 AM" }, { diaNum: 6, nombre: "Pilates Reformer", horario: "10:00 AM" }, { diaNum: 6, nombre: "Pilates Reformer", horario: "11:00 AM" },
];

export async function GET(request: Request) {
  // CANDADO DE SEGURIDAD
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Acceso denegado. Llave incorrecta.', { status: 401 });
  }

  try {
    // --- TAREA 1: LIMPIEZA DE PAQUETES VENCIDOS ---
    const hoyDate = new Date();
    const hoyStr = hoyDate.toISOString().split('T')[0];

    const { data: dataLimpieza } = await supabase
      .from('perfiles')
      .update({ creditos: 0 })
      .lt('fecha_expiracion', hoyStr)
      .gt('creditos', 0)
      .select('nombre');

    // --- TAREA 2: APERTURA DEL DÍA EN LA VENTANA MÓVIL (7 DÍAS EN EL FUTURO) ---
    const futuro = new Date();
    futuro.setDate(futuro.getDate() + 7); // Nos adelantamos 7 días exactos
    const year = futuro.getFullYear();
    const month = String(futuro.getMonth() + 1).padStart(2, '0');
    const day = String(futuro.getDate()).padStart(2, '0');
    
    const fechaIsoFuturo = `${year}-${month}-${day}`;
    const diaSemanaNum = futuro.getDay(); // 0 = Domingo, 1 = Lunes, etc.

    const plantillaParaEseDia = HORARIOS_FIJOS.filter(h => h.diaNum === diaSemanaNum);
    let clasesCreadas = 0;

    if (plantillaParaEseDia.length > 0) {
      // Candado anti-duplicados por si el robot corre dos veces por error
      const { data: clasesExistentes } = await supabase.from('clases').select('horario').eq('dia', fechaIsoFuturo);
      const horariosExistentes = clasesExistentes?.map(c => c.horario) || [];

      // Creamos la lista masiva de clases (saltando las que ya existen)
      const nuevasClases = plantillaParaEseDia
        .filter(item => !horariosExistentes.includes(item.horario))
        .map(item => ({
          nombre: item.nombre,
          horario: item.horario,
          dia: fechaIsoFuturo,
          cupo_max: 6
        }));

      // Insertamos a la base de datos de un solo golpe
      if (nuevasClases.length > 0) {
        const { error: errorClases } = await supabase.from('clases').insert(nuevasClases);
        if (!errorClases) clasesCreadas = nuevasClases.length;
      }
    }
    return NextResponse.json({ 
      success: true, 
     mensaje: `Cron operando. Vencimientos aplicados: ${dataLimpieza?.length || 0}. Clases creadas para el ${fechaIsoFuturo}:${clasesCreadas}.`
    });

  } catch (error: any) {
    console.error("Error crítico en Cron:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}