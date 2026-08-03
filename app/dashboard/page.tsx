"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

export default function DashboardClienta() {
  const [perfil, setPerfil] = useState<any>(null);
  const [misReservas, setMisReservas] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    // Traer Perfil
    const { data: dataPerfil } = await supabase.from("perfiles").select("*").eq("id", user.id).single();
    if (dataPerfil) setPerfil(dataPerfil);

    // Traer Reservas + Clases (Para saber la fecha y hora exacta de la clase)
    if (dataPerfil?.whatsapp) {
      const { data: reservas } = await supabase.from("reservas").select("*").eq("whatsapp", dataPerfil.whatsapp).order("fecha_reserva", { ascending: false });
      const { data: clases } = await supabase.from("clases").select("*");
      
      if (reservas && clases) {
        // Unimos la reserva con la información de su clase
        const reservasArmadas = reservas.map(r => ({
          ...r,
          claseInfo: clases.find(c => String(c.id) === String(r.clase_id))
        })).filter(r => r.claseInfo); // Solo mostrar si la clase aún existe
        setMisReservas(reservasArmadas);
      }
    }
    setIsLoading(false);
  };

  // --- INICIO: INTELIGENCIA DE TIEMPO (12 HORAS) ---
  const calcularHorasFaltantes = (dia: string, horario: string) => {
    const [year, month, day] = dia.split('-');
    const [horaMin, ampm] = horario.split(' ');
    let h = parseInt(horaMin.split(':')[0], 10);
    const m = parseInt(horaMin.split(':')[1], 10);
    if (ampm.toUpperCase() === 'PM' && h !== 12) h += 12;
    if (ampm.toUpperCase() === 'AM' && h === 12) h = 0;
    
    const fechaClase = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), h, m);
    return (fechaClase.getTime() - new Date().getTime()) / (1000 * 60 * 60);
  };

  const cancelarMiReserva = async (reserva: any) => {
    // Calculamos si faltan más o menos de 12 horas
    const horasFaltantes = calcularHorasFaltantes(reserva.claseInfo.dia, reserva.claseInfo.horario);
    const devuelveCredito = horasFaltantes >= 12;

    const mensaje = devuelveCredito 
      ? `¿Deseas cancelar tu clase de ${reserva.claseInfo.nombre}?\n\nAl cancelar con más de 12 horas de anticipación, tu crédito será devuelto a tu cuenta inmediatamente.` 
      : `⚠️ PENALIZACIÓN POR TIEMPO ⚠️\n\nFaltan menos de 12 horas para tu clase. Si cancelas ahora, perderás tu lugar y NO se te devolverá el crédito.\n\n¿Estás segura de cancelar?`;

    if (!window.confirm(mensaje)) return;

    setIsLoading(true);
    try {
      // 1. Borramos la reserva (liberamos la cama)
      await supabase.from("reservas").delete().eq("id", reserva.id);

      // 2. SOLO devolvemos el crédito si cumplió la regla de las 12 horas
      if (devuelveCredito && perfil) {
        const nuevosCreditos = perfil.creditos + 1;
        await supabase.from("perfiles").update({ creditos: nuevosCreditos }).eq("id", perfil.id);
        setPerfil({ ...perfil, creditos: nuevosCreditos });
      }

      setMisReservas(misReservas.filter(r => r.id !== reserva.id));
      alert(devuelveCredito ? "Clase cancelada. Tu crédito ha sido devuelto." : "Clase cancelada. No hubo devolución de crédito por política de 12 horas.");
    } catch (error) {
      alert("Hubo un error al cancelar. Intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };
  // --- FIN: INTELIGENCIA DE TIEMPO ---

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-background text-foreground text-xs uppercase tracking-widest">Cargando tu estudio...</div>;

  // Filtramos para ocultar las clases de ayer o más antiguas
  const misClasesActivas = misReservas.filter(r => calcularHorasFaltantes(r.claseInfo.dia, r.claseInfo.horario) > -2);

  return (
    <main className="min-h-screen bg-background text-foreground bg-[url('/images/studio-hero.png')] bg-cover bg-fixed bg-center relative">
      {/* Capa de cristal difuminado para el fondo */}
      <div className="absolute inset-0 bg-background/90 backdrop-blur-xl"></div>
      
      <div className="relative z-10 max-w-4xl mx-auto p-6 md:p-12 pt-20">
        <header className="flex justify-between items-end mb-12 border-b border-border/30 pb-6">
          <div>
            <p className="text-xs uppercase tracking-widest text-primary mb-2 font-bold">Mi Espacio</p>
            <h1 className="font-serif text-4xl text-foreground">Hola, {perfil?.nombre?.split(' ')[0] || "Clienta"}</h1>
          </div>
          <div className="flex gap-4">
            <button onClick={() => router.push("/")} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer">← Volver al Inicio</button>
            <button onClick={cerrarSesion} className="text-sm font-medium text-red-500 hover:text-red-700 transition-colors cursor-pointer">Cerrar Sesión</button>
          </div>
        </header>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Columna Izquierda: Perfil y Créditos */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-card/40 backdrop-blur-md border border-border/50 p-8 rounded-2xl shadow-xl text-center">
              <div className="w-20 h-20 mx-auto bg-primary/20 text-primary rounded-full flex items-center justify-center text-3xl font-serif mb-4 uppercase">
                {perfil?.nombre?.charAt(0) || "A"}
              </div>
              <h2 className="font-medium text-lg">{perfil?.nombre}</h2>
              <p className="text-xs text-muted-foreground font-mono mt-1">{perfil?.whatsapp}</p>
              
              <div className="mt-8 pt-8 border-t border-border/30">
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Créditos Disponibles</p>
                <span className="text-7xl font-serif text-primary">{perfil?.creditos || 0}</span>
                {perfil?.creditos <= 0 && (
                  <button onClick={() => window.open("https://wa.me/528132624421", "_blank")} className="w-full mt-6 bg-primary text-white py-3 rounded-lg text-xs uppercase tracking-widest font-bold hover:bg-primary/90 transition-colors cursor-pointer">
                    Recargar Paquete
                  </button>
                )}
              </div>
            </div>

            {/* Aviso de Política */}
            <div className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-2xl shadow-sm">
              <h3 className="text-amber-700 text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2">⚠️ Política del Estudio</h3>
              <p className="text-xs text-muted-foreground/80 leading-relaxed">
                Las cancelaciones deben realizarse con al menos <b>12 horas de anticipación</b>. Si cancelas después de este tiempo, perderás la clase y no se devolverá el crédito.
              </p>
            </div>
          </div>

          {/* Columna Derecha: Próximas Clases */}
          <div className="md:col-span-2">
            <h3 className="font-serif text-2xl mb-6">Tus Próximas Clases</h3>
            
            {misClasesActivas.length === 0 ? (
              <div className="bg-card/30 backdrop-blur-md border border-dashed border-border p-12 rounded-2xl text-center">
                <span className="text-4xl mb-4 block">🧘‍♀️</span>
                <p className="text-muted-foreground">No tienes ninguna clase programada.</p>
                <button onClick={() => router.push("/")} className="mt-6 bg-foreground text-background px-6 py-3 rounded text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity cursor-pointer">
                  Reservar Ahora
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {misClasesActivas.map((reserva) => {
                  const horasFaltantes = calcularHorasFaltantes(reserva.claseInfo.dia, reserva.claseInfo.horario);
                  const estaEnPenalizacion = horasFaltantes > 0 && horasFaltantes < 12;

                  return (
                    <div key={reserva.id} className="bg-card/60 backdrop-blur-md border border-border/50 p-6 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6 transition-transform hover:-translate-y-1">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider">
                            {reserva.claseInfo.nombre}
                          </span>
                          {/* Alerta si está en las 12 horas */}
                          {estaEnPenalizacion && (
                            <span className="text-[10px] text-red-500 font-bold uppercase tracking-wider flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                              Penalización Activa
                            </span>
                          )}
                        </div>
                        <h4 className="font-serif text-2xl mt-2">{new Date(reserva.claseInfo.dia).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}</h4>
                        <p className="text-primary font-medium">{reserva.claseInfo.horario}</p>
                      </div>

                      <button 
                        onClick={() => cancelarMiReserva(reserva)}
                        className="w-full sm:w-auto px-5 py-2.5 border border-red-200 text-red-500 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-red-500 hover:text-white transition-colors cursor-pointer text-center"
                      >
                        Cancelar Clase
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}