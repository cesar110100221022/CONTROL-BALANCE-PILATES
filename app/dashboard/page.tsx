"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";
import { ModalReserva } from "../../components/modal-reserva";

export default function DashboardClienta() {
  const [perfil, setPerfil] = useState<any>(null);
  const [misReservas, setMisReservas] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);

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
    : `⚠️ PENALIZACIÓN POR TIEMPO ⚠️\n\nFaltan menos de 12 horas para tu clase. Si cancelas ahora, perderás tu lugar y NO se te devolverá el crédito.\n\n¿Confirmas que deseas cancelar?`;

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

  // --- INICIO: SKELETON LOADER PREMIUM ---
  if (isLoading) return (
    <div className="min-h-screen bg-background relative z-10 max-w-[1000px] mx-auto p-6 md:p-12 pt-20">
      <div className="flex flex-col md:flex-row justify-between items-center mb-16 gap-6 animate-pulse">
        <div className="space-y-3 w-full md:w-1/3">
          <div className="h-3 w-32 bg-secondary/80 rounded"></div>
          <div className="h-10 w-48 bg-secondary/60 rounded-xl"></div>
        </div>
        <div className="h-10 w-32 bg-secondary/50 rounded-full"></div>
      </div>
      <div className="grid lg:grid-cols-12 gap-10">
        <div className="lg:col-span-5 h-[350px] bg-secondary/40 rounded-[2rem] animate-pulse"></div>
        <div className="lg:col-span-7 space-y-4">
          <div className="h-4 w-40 bg-secondary/50 rounded mb-6 animate-pulse"></div>
          <div className="h-28 bg-secondary/30 rounded-3xl animate-pulse"></div>
          <div className="h-28 bg-secondary/30 rounded-3xl animate-pulse"></div>
        </div>
      </div>
    </div>
  );
  // --- FIN: SKELETON LOADER PREMIUM ---

 // Filtramos y ORDENAMOS cronológicamente las clases (las más próximas primero)
 const misClasesActivas = misReservas
 .filter(r => calcularHorasFaltantes(r.claseInfo.dia, r.claseInfo.horario) > -2)
 .sort((a, b) => calcularHorasFaltantes(a.claseInfo.dia, a.claseInfo.horario) - calcularHorasFaltantes(b.claseInfo.dia, b.claseInfo.horario));

 return (
  <main className="min-h-screen bg-background text-foreground bg-[url('/images/studio-hero.png')] bg-cover bg-fixed bg-center relative">
    <div className="absolute inset-0 bg-background/95 backdrop-blur-3xl"></div>
    
    <div className="relative z-10 max-w-[1000px] mx-auto p-6 md:p-12 pt-20">
      
      {/* --- INICIO: ENCABEZADO VIP --- */}
      <header className="flex flex-col md:flex-row justify-between items-center mb-16 gap-6">
        <div className="text-center md:text-left">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 font-bold">Mi Espacio Balance</p>
          <h1 className="font-serif text-5xl text-foreground">Hola, {perfil?.nombre?.split(' ')[0] || "Atleta"}</h1>
        </div>
        <div className="flex flex-wrap justify-center items-center gap-4 md:gap-6">
          <button onClick={() => router.push("/")} className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer">← Inicio</button>
          <button onClick={cerrarSesion} className="text-[10px] uppercase tracking-widest font-bold text-red-500 hover:text-red-700 transition-colors cursor-pointer border border-red-500/30 px-4 py-2 rounded-full hover:bg-red-500/10">Cerrar Sesión</button>
        </div>
      </header>
      {/* --- FIN: ENCABEZADO VIP --- */}

      <div className="grid lg:grid-cols-12 gap-10">
        
       {/* COLUMNA IZQUIERDA: TARJETA DE CRÉDITOS CLARA Y LIMPIA */}
       <div className="lg:col-span-5 space-y-6">
            <div className="bg-card border border-border p-10 rounded-[2rem] shadow-xl relative overflow-hidden">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 font-bold">Créditos Disponibles</p>
              <div className="flex items-baseline gap-3">
                <span className="text-8xl font-sans font-light tracking-tighter text-foreground">{perfil?.creditos || 0}</span>
                <span className="text-xs uppercase tracking-widest text-muted-foreground font-bold">Clases</span>
              </div>
              
              <div className="mt-12 flex flex-col gap-3">
                {/* BOTÓN LIMPIO Y DE ALTO CONTRASTE */}
                <button 
                  onClick={() => setIsModalOpen(true)} 
                  className="w-full bg-foreground text-background py-4 rounded-xl text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-all cursor-pointer shadow-md hover:shadow-lg transform hover:-translate-y-1"
                >
                  + Reservar Clase
                </button>
                {perfil?.creditos <= 0 && (
                  <button onClick={() => window.open("https://wa.me/528124697382", "_blank")} className="w-full bg-secondary text-foreground py-4 rounded-xl text-xs uppercase tracking-widest font-bold hover:bg-secondary/80 transition-colors cursor-pointer border border-border">
                    Recargar Paquete
                  </button>
                )}
              </div>
            </div>

          {/* AVISO DE POLÍTICAS (AHORA ES SUTIL Y ELEGANTE) */}
          <div className="bg-card/30 backdrop-blur-md border border-border p-6 rounded-3xl flex items-start gap-4">
            <span className="text-2xl mt-1 text-muted-foreground/50">⚖️</span>
            <div>
              <h3 className="text-[10px] font-bold uppercase tracking-widest mb-1 text-foreground">Política de Cancelación</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Cancela con al menos <b>12 horas de anticipación</b> para no perder tu crédito.
              </p>
            </div>
          </div>
        </div>
        {/* --- FIN: TARJETA NEGRA --- */}

        {/* --- INICIO: LISTA DE CLASES LIMPIA --- */}
        <div className="lg:col-span-7">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-6">Tus Próximas Reservas</h3>
          
          {misClasesActivas.length === 0 ? (
            <div className="bg-card/10 backdrop-blur-sm border border-dashed border-border/60 p-12 rounded-[2rem] text-center flex flex-col items-center justify-center h-64">
              <span className="text-4xl mb-4 opacity-40 block filter grayscale">🍃</span>
              <p className="text-muted-foreground text-sm font-medium">Tu agenda está libre.</p>
              <button onClick={() => setIsModalOpen(true)} className="mt-4 text-[10px] uppercase tracking-widest font-bold text-primary hover:underline cursor-pointer">
                Ver horarios disponibles
              </button>
            </div>
          ) : (
            <div className="space-y-4">
             {misClasesActivas.map((reserva) => {
                const horasFaltantes = calcularHorasFaltantes(reserva.claseInfo.dia, reserva.claseInfo.horario);
                const estaEnPenalizacion = horasFaltantes > 0 && horasFaltantes < 12;
                
                const [year, month, day] = reserva.claseInfo.dia.split('-');
                const fechaLocalExacta = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

                return (
                  <div key={reserva.id} className="bg-card/40 backdrop-blur-md border border-border p-6 rounded-3xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6 transition-transform hover:-translate-y-1">
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="bg-foreground text-background px-3 py-1 rounded-full text-[9px] uppercase font-bold tracking-wider">
                          {reserva.claseInfo.nombre}
                        </span>
                        {estaEnPenalizacion && (
                          <span className="text-[9px] bg-red-100 text-red-600 px-2 py-1 rounded-full font-bold uppercase tracking-wider flex items-center gap-1 border border-red-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                            Penalización Activa
                          </span>
                        )}
                      </div>
                      <h4 className="font-serif text-2xl mt-1 text-foreground capitalize">
                        {fechaLocalExacta.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </h4>
                      <p className="text-primary font-bold text-sm tracking-wider mt-1">{reserva.claseInfo.horario}</p>
                    </div>

                    <button 
                      onClick={() => cancelarMiReserva(reserva)}
                      className="w-full sm:w-auto px-5 py-3 border border-red-200 text-red-500 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-50 hover:border-red-300 transition-colors cursor-pointer text-center"
                    >
                      Cancelar Clase
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {/* --- FIN: LISTA DE CLASES LIMPIA --- */}
      </div>
    </div>
    
    {/* AQUÍ INYECTAMOS EL MODAL FLOTANTE QUE YA TENÍAS */}
    <ModalReserva 
      isOpen={isModalOpen} 
      onClose={() => setIsModalOpen(false)} 
      perfil={perfil}
      onActualizarPerfil={(nuevoPerfil: any) => setPerfil(nuevoPerfil)}
      onReservaExitosa={cargarDatos}
    />
  </main>
);
}