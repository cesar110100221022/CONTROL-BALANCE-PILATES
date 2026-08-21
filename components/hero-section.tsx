"use client";

import React, { useState, useEffect } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { supabase } from "../lib/supabase"; 
import { useRouter } from "next/navigation";
import { ModalReserva } from "./modal-reserva";

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
  // AGREGAR ESTO: Estado para controlar el menú móvil
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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

  // AGREGAR ESTO: Auto-abrir el modal si la clienta viene del Dashboard
  useEffect(() => {
    if (perfil && window.location.search.includes("reserva=true")) {
      setIsModalOpen(true);
      // Borramos la señal secreta de la URL para que no se quede pegada
      window.history.replaceState(null, "", "/");
    }
  }, [perfil]);

  const verificarUsuario = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from("perfiles").select("*").eq("id", user.id).single();
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
    .filter((c) => c.dia && c.dia.startsWith(diaSeleccionado))
    .sort((a, b) => convertirAMinutos(a.horario) - convertirAMinutos(b.horario));

  return (
    <section className="relative min-h-screen w-full overflow-hidden bg-background text-foreground">
      {/* FONDO ANIMADO - OPTIMIZADO PARA MÓVIL Y PC */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 animate-kenburns bg-cover bg-[center_top] md:bg-center will-change-transform" style={{ backgroundImage: "url('/images/fondo.jpeg')" }} aria-hidden="true" />
        {/* Filtro inteligente: 85% en celular para contraste perfecto, 40% en compu */}
        <div className="absolute inset-0 bg-background/85 md:bg-background/40" />
        {/* Gradiente extra en la parte inferior para fusionarse suavemente con los paquetes */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      </div>

      {/* MENÚ SUPERIOR */}
      <header className="relative z-20 mx-auto flex max-w-[1400px] items-center justify-between px-6 py-6 md:py-8 md:px-12">
        <img src="/images/logo.PNG" alt="Control Balance" className="h-12 md:h-16 w-auto object-contain" />
        <nav className="hidden items-center gap-8 text-base font-medium tracking-wide text-foreground drop-shadow-md md:flex">
          <a href="#metodo" className="transition-colors duration-300 hover:text-foreground">El Método</a>
          <a href="#estudio" className="transition-colors duration-300 hover:text-foreground">El Estudio</a>
          {perfil ? (
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

        {/* AGREGAR ESTO: BOTÓN HAMBURGUESA SOLO PARA CELULAR */}
        <button 
          className="md:hidden text-foreground p-2 z-50 transition-transform active:scale-95 cursor-pointer"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Abrir menú"
        >
          {isMobileMenuOpen ? <X size={32} /> : <Menu size={32} />}
        </button>
      </header>

      {/* AGREGAR ESTO: PANEL DESPLEGABLE CELULAR */}
      {isMobileMenuOpen && (
        <div className="absolute top-[80px] left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-xl border-b border-border shadow-xl animate-in slide-in-from-top-2">
          <div className="flex flex-col px-6 py-8 gap-6">
            <a href="#metodo" onClick={() => setIsMobileMenuOpen(false)} className="text-xl font-serif text-foreground border-b border-border pb-3">El Método</a>
            <a href="#estudio" onClick={() => setIsMobileMenuOpen(false)} className="text-xl font-serif text-foreground border-b border-border pb-3">El Estudio</a>
            
            <div className="pt-2">
              {perfil ? (
                (perfil.rol === 'admin' || perfil.email === 'tu-correo@ejemplo.com' || perfil.email === 'controlbalance@gmail.com') ? (
                  <button onClick={() => router.push("/admin")} className="flex w-full items-center justify-between bg-amber-600/10 p-4 rounded-xl border border-amber-600/20 text-amber-700">
                    <span className="font-medium text-lg">Panel de Control 👑</span>
                    <ArrowRight size={20} />
                  </button>
                ) : (
                  <button onClick={() => router.push("/dashboard")} className="flex w-full items-center justify-between bg-primary text-primary-foreground p-4 rounded-xl shadow-lg">
                    <span className="font-medium text-lg tracking-wide">Mi Perfil ({perfil.creditos} créditos)</span>
                    <ArrowRight size={20} />
                  </button>
                )
              ) : (
                <button onClick={() => router.push("/login")} className="flex w-full items-center justify-center bg-primary text-primary-foreground p-4 rounded-xl shadow-lg font-medium text-lg tracking-wide uppercase">
                  Iniciar Sesión
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TEXTO PRINCIPAL - DISEÑO ELEGANTE Y COMPACTO */}
      <div className="relative z-10 mx-auto flex min-h-[50vh] md:min-h-[65vh] max-w-[1400px] flex-col justify-center px-6 pb-8 pt-4 md:pb-16 md:px-12">
        <p className="animate-rise mb-3 md:mb-6 flex items-center gap-3 text-xs md:text-sm font-bold uppercase tracking-[0.15em] md:tracking-[0.25em] text-foreground/90 drop-shadow-sm [animation-delay:0.1s]">
          ESTUDIO PILATES REFORMER
        </p>

        {/* Letras con más cuerpo (font-medium) y sombra (drop-shadow) para que no se pierdan con el fondo */}
        <h1 className="animate-rise max-w-full text-balance font-serif font-medium leading-[1.1] tracking-[-0.02em] text-foreground drop-shadow-md [animation-delay:0.25s] text-4xl sm:text-5xl md:text-6xl lg:text-7xl">
          Respira. <span className="italic text-primary drop-shadow-sm">Conecta.</span> Transforma.
        </h1>

        {/* Párrafo más oscuro (text-foreground/90) y con sombra para lectura cómoda y nítida */}
        <p className="animate-rise mt-4 md:mt-6 max-w-[90%] md:max-w-md text-pretty text-sm md:text-lg font-normal leading-relaxed text-foreground/90 drop-shadow-sm [animation-delay:0.45s]">
          Movimiento consciente en un espacio diseñado para el silencio, la luz y la precisión. Reformer en grupos reducidos, guiado con intención.
        </p>

        <div className="animate-rise mt-6 md:mt-8 flex flex-col items-start gap-6 [animation-delay:0.6s] sm:flex-row sm:items-center">
          <button
            onClick={abrirModalDeReserva}
            className="group relative w-full sm:w-auto inline-flex justify-center items-center gap-3 overflow-hidden rounded-full bg-primary px-8 md:px-9 py-4 text-xs md:text-sm font-medium uppercase tracking-[0.15em] text-primary-foreground shadow-[0_10px_40px_-12px_rgba(63,82,102,0.5)] transition-all duration-500 ease-out hover:-translate-y-0.5 hover:shadow-[0_22px_60px_-15px_rgba(63,82,102,0.65)] cursor-pointer"
          >
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-primary-foreground/20 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-full" aria-hidden="true" />
            <span className="relative">Reserva tu Clase</span>
            <ArrowRight className="relative h-4 w-4 transition-transform duration-500 ease-out group-hover:translate-x-1" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* --- INICIO: SECCIÓN DE PRECIOS PÚBLICA --- */}
      <div className="relative z-10 mx-auto max-w-[1400px] px-6 pb-20 md:pb-32 md:px-12 animate-in fade-in duration-1000 delay-500">
        <div className="mb-8 flex flex-col items-start gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="font-serif text-3xl md:text-4xl text-foreground">Nuestros Paquetes</h2>
            <p className="text-muted-foreground mt-2 font-light text-sm md:text-base">Invierte en ti. Elige el plan que mejor se adapte a tu rutina.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 text-[10px] md:text-xs tracking-wider uppercase font-medium w-full md:w-auto">
            <span className="bg-primary/10 text-primary px-4 py-2 rounded-full border border-primary/20 text-center">✨ Aceptamos TotalPass</span>
            <span className="bg-secondary/50 text-foreground px-4 py-2 rounded-full border border-border text-center">Primera Clase Gratis</span>
          </div>
        </div>

        {/* --- INICIO: BANNER AVISO DE PAGO --- */}
        <div className="mb-8 md:mb-10 flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-xl border border-primary/20 bg-primary/5 p-4 md:p-5 text-xs md:text-sm text-foreground shadow-sm">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="font-light leading-relaxed">
            <strong className="font-medium">¿Cómo adquiero o recargo un paquete?</strong> La solicitud de paquetes se realiza mediante <a href="https://wa.me/528124697382?text=Hola%20Liliana,%20me%20gustar%C3%ADa%20adquirir%20un%20paquete%20de%20clases" target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline cursor-pointer">WhatsApp</a>. Podrás realizar tu pago por transferencia bancaria, o bien, pagar directamente en el estudio.
          </p>
        </div>
        {/* --- FIN: BANNER AVISO DE PAGO --- */}
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[
            { nombre: "Clase Suelta", precio: 240,  },
            { nombre: "8 Clases", precio: 1200,  },
            { nombre: "12 Clases", precio: 1680,  },
            { nombre: "16 Clases", precio: 2160,  },
            { nombre: "20 Clases", precio: 2640, },
            { nombre: "Ilimitadas", precio: 3040, desc: "Entrena sin límites", esPopular: true }
          ].map((plan, i) => (
            <div key={i} className={`relative bg-card/60 backdrop-blur-md border ${plan.esPopular ? 'border-primary shadow-lg shadow-primary/10' : 'border-border hover:border-primary/50'} p-5 md:p-6 rounded-xl transition-all hover:-translate-y-1 flex flex-col justify-between`}>
              {plan.esPopular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full whitespace-nowrap">
                  El Mejor Plan
                </span>
              )}
              <div>
                <h3 className="font-medium text-xs md:text-sm uppercase tracking-wider text-muted-foreground mb-2 md:mb-4">{plan.nombre}</h3>
                <p className="text-3xl md:text-4xl font-serif text-foreground mb-1">${plan.precio.toLocaleString('es-MX')}</p>
                <p className="text-[10px] md:text-xs text-primary font-medium">{plan.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* --- FIN: SECCIÓN DE PRECIOS PÚBLICA --- */}

      {/* MODAL BLINDADO DE RESERVAS (AHORA USA EL COMPONENTE CENTRAL) */}
      <ModalReserva 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        perfil={perfil}
        onActualizarPerfil={(nuevoPerfil: any) => setPerfil(nuevoPerfil)}
        onReservaExitosa={() => {}} 
      />

    </section>
  );
}