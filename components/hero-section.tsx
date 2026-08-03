"use client";

import React, { useState, useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { supabase } from "../lib/supabase"; 
import { useRouter } from "next/navigation";

interface Clase {
  id: string;
  nombre: string;
  horario: string;
  dia?: string;
  cupo_max?: number;
}

export function HeroSection() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  
  const [clasesDisponibles, setClasesDisponibles] = useState<Clase[]>([]);
  const [reservasActivas, setReservasActivas] = useState<any[]>([]);
  
  const [perfil, setPerfil] = useState<any>(null);
  const router = useRouter();

 // Mini-función para obligar a usar la hora local de México
 const obtenerFechaLocal = (fecha: Date) => {
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, '0');
  const day = String(fecha.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const [claseSeleccionada, setClaseSeleccionada] = useState("");
const [diaSeleccionado, setDiaSeleccionado] = useState(obtenerFechaLocal(new Date()));
const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [nombreInput, setNombreInput] = useState("");
  const [whatsappInput, setWhatsappInput] = useState("");
  const [isActualizando, setIsActualizando] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    obtenerClases();
    verificarUsuario();
  }, []);

  const verificarUsuario = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from("perfiles").select("*").eq("id", user.id).single();
      // Agregamos el email para validaciones de seguridad
      if (data) setPerfil({ ...data, email: user.email }); 
    }
  };
  const obtenerClases = async () => {
    const { data: dataClases } = await supabase.from('clases').select('*');
    if (dataClases) setClasesDisponibles(dataClases as Clase[]);

    const { data: dataReservas } = await supabase.from('reservas').select('clase_id');
    if (dataReservas) setReservasActivas(dataReservas);
  };

  const abrirModalDeReserva = () => {
    if (!perfil) router.push("/login");
    else setIsModalOpen(true);
  };

  const guardarPerfil = async () => {
    if (!nombreInput || !whatsappInput) {
      alert("Por favor ingresa tu nombre y WhatsApp para continuar.");
      return;
    }
    setIsActualizando(true);
    const { error } = await supabase.from("perfiles").update({ nombre: nombreInput, whatsapp: whatsappInput }).eq("id", perfil.id);
    setIsActualizando(false);
    if (error) alert("Hubo un error al guardar tus datos. Intenta de nuevo.");
    else setPerfil({ ...perfil, nombre: nombreInput, whatsapp: whatsappInput });
  };

  const confirmarReserva = async () => {
    if (!claseSeleccionada) {
      alert("Por favor, selecciona un horario para asegurar tu lugar.");
      return;
    }

    if (perfil.creditos <= 0) {
      alert("No tienes créditos suficientes. Por favor, contacta a Liliana para recargar tu paquete.");
      return;
    }

    const claseElegida = clasesDisponibles.find(c => String(c.id) === String(claseSeleccionada));
    const maxCamas = claseElegida?.cupo_max || 6;
    const ocupadasActuales = reservasActivas.filter(r => String(r.clase_id) === String(claseSeleccionada)).length;

    if (ocupadasActuales >= maxCamas) {
      alert("Lo sentimos, esta clase acaba de llenarse. Por favor, utiliza el botón naranja para unirte a la lista de espera.");
      return;
    }

    setIsSubmitting(true);
    const { error: errorReserva } = await supabase.from('reservas').insert([{ nombre_cliente: perfil.nombre, whatsapp: perfil.whatsapp, clase_id: claseSeleccionada }]);

    if (errorReserva) {
      console.error("Error al insertar en Supabase:", errorReserva);
      alert("Hubo un problema de conexión. Intenta de nuevo.");
      setIsSubmitting(false);
      return;
    }

    const nuevosCreditos = perfil.creditos - 1;
    const { error: errorUpdate } = await supabase.from('perfiles').update({ creditos: nuevosCreditos }).eq('id', perfil.id);

    setIsSubmitting(false);
    if (errorUpdate) {
      console.error("Reserva exitosa, pero error al restar crédito:", errorUpdate);
    } else {
      setPerfil({ ...perfil, creditos: nuevosCreditos });
      setReservasActivas([...reservasActivas, { clase_id: claseSeleccionada }]);
      alert("¡Reserva confirmada con éxito! Se ha descontado 1 crédito de tu cuenta.");
      setClaseSeleccionada("");
      setIsModalOpen(false);
    }
  };

  const unirseListaEspera = async () => {
    if (!claseSeleccionada) return;
    setIsSubmitting(true);

    const { error } = await supabase.from('lista_espera').insert([{ 
      clase_id: claseSeleccionada,
      nombre_cliente: perfil.nombre,
      whatsapp: perfil.whatsapp
    }]);

    setIsSubmitting(false);

    if (error) {
      console.error("Error al unirse a la lista:", error);
      alert("Hubo un error al unirte a la lista. Intenta de nuevo.");
    } else {
      alert("¡Listo! Estás en la fila de espera. Si se libera una cama, te avisaremos por WhatsApp.");
      setClaseSeleccionada("");
      setIsModalOpen(false);
    }
  };

  if (!isMounted) return null;

  const convertirAMinutos = (horario: string) => {
    if (!horario) return 0;
    const [horaMin, ampm] = horario.split(' ');
    if (!horaMin || !ampm) return 0;
    const [h, m] = horaMin.split(':');
    let hora = parseInt(h, 10);
    if (ampm.toUpperCase() === 'PM' && hora !== 12) hora += 12;
    if (ampm.toUpperCase() === 'AM' && hora === 12) hora = 0;
    return hora * 60 + parseInt(m, 10);
  };

  const clasesDelDia = clasesDisponibles
    // Usamos .startsWith() por si Supabase le pega horas (ej. 2026-08-03T00:00:00)
    .filter((c) => c.dia && c.dia.startsWith(diaSeleccionado))
    .sort((a, b) => convertirAMinutos(a.horario) - convertirAMinutos(b.horario));

  return (
    <section className="relative min-h-screen w-full overflow-hidden bg-background text-foreground">
      {/* FONDO ANIMADO */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 animate-kenburns bg-cover bg-center will-change-transform" style={{ backgroundImage: "url('/images/fondo.jpeg')" }} aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-r from-cream/85 via-cream/45 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-cream/70 via-transparent to-cream/30" />
      </div>

      {/* MENÚ SUPERIOR */}
      <header className="relative z-20 mx-auto flex max-w-[1400px] items-center justify-between px-6 py-8 md:px-12">
        <img src="/images/logo.PNG" alt="Control Balance" className="h-16 w-auto object-contain" />
        <nav className="hidden items-center gap-8 text-base font-medium tracking-wide text-foreground drop-shadow-md md:flex">
          <a href="#metodo" className="transition-colors duration-300 hover:text-foreground">El Método</a>
          <a href="#estudio" className="transition-colors duration-300 hover:text-foreground">El Estudio</a>
          {perfil ? (
            /* Verificamos si es admin por su rol o por sus correos */
            (perfil.rol === 'admin' || perfil.email === 'tu-correo@ejemplo.com' || perfil.email === 'controlbalance@gmail.com') ? (
              
              <button onClick={() => router.push("/admin")} className="group flex items-center gap-3 text-amber-600 font-medium transition-all duration-300 cursor-pointer hover:opacity-80">
                <div className="w-8 h-8 rounded-full bg-amber-600/10 border border-amber-600/20 flex items-center justify-center text-amber-600 text-[10px] shadow-sm group-hover:bg-amber-600 group-hover:text-white transition-colors">
                  👑
                </div>
                <span>Panel de Control</span>
              </button>

            ) : (

              <button onClick={() => router.push("/dashboard")} className="group flex items-center gap-3 text-primary font-medium transition-all duration-300 cursor-pointer hover:opacity-80">
                <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs font-bold uppercase shadow-sm group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  {perfil.nombre ? perfil.nombre.charAt(0) : "C"}
                </div>
                <span>Mi Cuenta ({perfil.creditos} clases)</span>
              </button>

            )
          ) : (
            <button onClick={() => router.push("/login")} className="transition-colors duration-300 hover:text-foreground cursor-pointer">
              Iniciar Sesión
            </button>
          )}
        </nav>
      </header>

      {/* TEXTO PRINCIPAL */}
      <div className="relative z-10 mx-auto flex min-h-[70vh] max-w-[1400px] flex-col justify-center px-6 pb-24 pt-10 md:px-12">
      <p className="animate-rise mb-8 flex items-center gap-3 text-sm font-bold uppercase tracking-[0.25em] text-foreground/90 drop-shadow-sm [animation-delay:0.1s]">
          Estudio Boutique de Pilates Reformer
        </p>

        <h1 className="animate-rise max-w-[16ch] text-balance font-serif font-light leading-[0.92] tracking-[-0.02em] text-foreground [animation-delay:0.25s] text-[clamp(3.5rem,11vw,10rem)]">
          Respira.<br /><span className="italic text-primary">Conecta.</span><br />Transforma.
        </h1>

        <p className="animate-rise mt-10 max-w-md text-pretty text-base font-light leading-relaxed text-muted-foreground [animation-delay:0.45s] md:text-lg">
          Movimiento consciente en un espacio diseñado para el silencio, la luz y la precisión. Reformer en grupos reducidos, guiado con intención.
        </p>

        <div className="animate-rise mt-12 flex flex-col items-start gap-6 [animation-delay:0.6s] sm:flex-row sm:items-center">
          <button
            onClick={abrirModalDeReserva}
            className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-primary px-9 py-4 text-sm font-medium uppercase tracking-[0.15em] text-primary-foreground shadow-[0_10px_40px_-12px_rgba(63,82,102,0.5)] transition-all duration-500 ease-out hover:-translate-y-0.5 hover:shadow-[0_22px_60px_-15px_rgba(63,82,102,0.65)] cursor-pointer"
          >
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-primary-foreground/20 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" aria-hidden="true" />
            <span className="relative">Reserva tu Clase</span>
            <ArrowRight className="relative h-4 w-4 transition-transform duration-500 ease-out group-hover:translate-x-1" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* --- INICIO: SECCIÓN DE PRECIOS PÚBLICA --- */}
      <div className="relative z-10 mx-auto max-w-[1400px] px-6 pb-32 md:px-12 animate-in fade-in duration-1000 delay-500">
        <div className="mb-8 flex flex-col items-start gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="font-serif text-3xl md:text-4xl text-foreground">Nuestros Paquetes</h2>
            <p className="text-muted-foreground mt-2 font-light">Invierte en ti. Elige el plan que mejor se adapte a tu rutina.</p>
          </div>
          <div className="flex flex-wrap gap-3 text-xs tracking-wider uppercase font-medium">
            <span className="bg-primary/10 text-primary px-4 py-2 rounded-full border border-primary/20">✨ Aceptamos TotalPass</span>
            <span className="bg-secondary/50 text-foreground px-4 py-2 rounded-full border border-border">Primera Clase de Prueba Gratis</span>
          </div>
        </div>

        {/* --- INICIO: BANNER AVISO DE PAGO --- */}
        <div className="mb-10 flex items-center gap-4 rounded-xl border border-primary/20 bg-primary/5 p-4 md:p-5 text-sm text-foreground shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="font-light leading-relaxed">
            <strong className="font-medium">¿Cómo adquiero o recargo un paquete?</strong> La solicitud de paquetes se realiza mediante <a href="https://wa.me/528132624421?text=Hola%20Liliana,%20me%20gustar%C3%ADa%20adquirir%20un%20paquete%20de%20clases" target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline cursor-pointer">WhatsApp</a>. Podrás realizar tu pago por medio de transferencia bancaria, o bien, pagar directamente en el estudio.
          </p>
        </div>
        {/* --- FIN: BANNER AVISO DE PAGO --- */}
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[
            { nombre: "Clase Suelta", precio: 240,  },
            { nombre: "8 Clases", precio: 1050,  },
            { nombre: "12 Clases", precio: 1680,  },
            { nombre: "16 Clases", precio: 2160,  },
            { nombre: "20 Clases", precio: 2640, },
            { nombre: "Ilimitadas", precio: 3040, desc: "Entrena sin límites", esPopular: true }
          ].map((plan, i) => (
            <div key={i} className={`relative bg-card/60 backdrop-blur-md border ${plan.esPopular ? 'border-primary shadow-lg shadow-primary/10' : 'border-border hover:border-primary/50'} p-6 rounded-xl transition-all hover:-translate-y-1 flex flex-col justify-between`}>
              {plan.esPopular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full whitespace-nowrap">
                  El Mejor Plan
                </span>
              )}
              <div>
                <h3 className="font-medium text-sm uppercase tracking-wider text-muted-foreground mb-4">{plan.nombre}</h3>
                <p className="text-4xl font-serif text-foreground mb-1">${plan.precio.toLocaleString('es-MX')}</p>
                <p className="text-xs text-primary font-medium">{plan.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* --- FIN: SECCIÓN DE PRECIOS PÚBLICA --- */}

      {/* MODAL BLINDADO DE RESERVAS */}
      {isModalOpen && perfil && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-background p-8 max-w-lg w-full relative shadow-2xl border border-border rounded-lg animate-in zoom-in-95 duration-200">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-5 text-muted-foreground hover:text-foreground text-2xl font-bold cursor-pointer">✕</button>

            {(!perfil.nombre || !perfil.whatsapp) ? (
              <div className="text-center">
                <h2 className="text-3xl font-serif font-light mb-4">Ya casi estás lista</h2>
                <p className="text-sm text-muted-foreground mb-6">Para asegurar tu lugar y que Liliana pueda contactarte, por favor completa estos 2 datos.</p>
                <div className="space-y-4 text-left mb-6">
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1">Nombre Completo</label>
                    <input type="text" value={nombreInput} onChange={(e) => setNombreInput(e.target.value)} className="w-full border-b border-border bg-transparent py-2 text-foreground focus:outline-none focus:border-primary text-sm" placeholder="Ej. Ana Sofía" />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1">WhatsApp</label>
                    <input type="tel" value={whatsappInput} onChange={(e) => setWhatsappInput(e.target.value)} className="w-full border-b border-border bg-transparent py-2 text-foreground focus:outline-none focus:border-primary text-sm" placeholder="Ej. 81 1234 5678" />
                  </div>
                </div>
                <button onClick={guardarPerfil} disabled={isActualizando} className="w-full bg-primary text-primary-foreground py-4 text-sm uppercase tracking-widest cursor-pointer disabled:opacity-50 hover:opacity-90 transition-opacity">
                  {isActualizando ? "Guardando..." : "Guardar mis datos"}
                </button>
              </div>
            ) : (
              <>
                <div className="text-center mb-6">
                  <h2 className="text-3xl font-serif font-light">Hola, {perfil.nombre}</h2>
                  <p className="text-sm text-muted-foreground mt-2">Créditos: <span className="font-bold text-primary">{perfil.creditos}</span></p>
                </div>

                <div className="mb-6">
                  <label className="block text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">Elige un día</label>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                  {[...Array(7)].map((_, i) => {
                      const d = new Date();
                      d.setDate(d.getDate() + i);
                      const idFecha = obtenerFechaLocal(d); // <- Usamos la función local
                      const nombreDia = d.toLocaleDateString('es-MX', { weekday: 'short' });
                      const numeroDia = d.getDate();

                      return (
                        <button type="button" key={i} onClick={() => setDiaSeleccionado(idFecha)} className={`min-w-[65px] p-2 rounded-lg border text-center transition-all cursor-pointer ${diaSeleccionado === idFecha ? 'bg-primary text-primary-foreground border-primary shadow-md' : 'border-border bg-card text-muted-foreground hover:text-foreground'}`}>
                          <span className="block text-[10px] uppercase tracking-wider">{nombreDia}</span>
                          <span className="block font-serif text-xl mt-1">{numeroDia}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">Horarios disponibles ({diaSeleccionado})</label>
                  {clasesDelDia.length === 0 ? (
                    <p className="text-sm text-muted-foreground border border-dashed border-border rounded-lg py-4 px-3 text-center">No hay clases disponibles para esta fecha.</p>
                  ) : (
                    <select value={claseSeleccionada} onChange={(e) => setClaseSeleccionada(e.target.value)} className="w-full border-b border-border bg-transparent py-2 cursor-pointer focus:outline-none focus:border-primary">
                      <option value="">Selecciona una clase...</option>
                      {clasesDelDia.map((c) => (
                        <option key={c.id} value={c.id}>{c.nombre} - {c.horario}</option>
                      ))}
                    </select>
                  )}
                </div>

                <p className="text-[10px] text-center text-muted-foreground mb-4 uppercase tracking-wider">Las reservas son personales. Cada acompañante debe crear su propia cuenta.</p>

                {(() => {
                  const claseElegidaObj = clasesDelDia.find(c => String(c.id) === String(claseSeleccionada));
                  const ocupadas = reservasActivas.filter(r => String(r.clase_id) === String(claseSeleccionada)).length;
                  const maxCamas = claseElegidaObj?.cupo_max || 6;
                  const estaLlena = claseSeleccionada && (ocupadas >= maxCamas);

                  if (estaLlena) {
                    return (
                      <button onClick={unirseListaEspera} disabled={isSubmitting} className="w-full bg-amber-500 text-white py-4 text-sm uppercase tracking-widest transition-opacity hover:bg-amber-600 cursor-pointer shadow-lg">
                        {isSubmitting ? "Procesando..." : "Clase Llena - Unirme a Lista de Espera"}
                      </button>
                    );
                  }

                  return (
                    <button onClick={confirmarReserva} disabled={isSubmitting || perfil.creditos <= 0 || clasesDelDia.length === 0 || !claseSeleccionada} className="w-full bg-primary text-white py-4 text-sm uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed transition-opacity hover:opacity-90 cursor-pointer">
                      {isSubmitting ? "Procesando..." : "Confirmar Reserva"}
                    </button>
                  );
                })()}
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}


// Forzando a Vercel