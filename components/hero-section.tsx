"use client";

import React, { useState, useEffect } from "react";
import { ArrowRight, Menu, X, Crown, Sparkles } from "lucide-react";
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [perfil, setPerfil] = useState<any>(null);
  const router = useRouter();

  // Memorias inteligentes
  const [rutaDestino, setRutaDestino] = useState("/login");
  const [pagoCancelado, setPagoCancelado] = useState(false);
  const [procesandoPagoId, setProcesandoPagoId] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
    verificarUsuario();
  }, []);

  // Auto-abrir el modal si la clienta viene del Dashboard
  useEffect(() => {
    if (perfil && window.location.search.includes("reserva=true")) {
      setIsModalOpen(true);
      window.history.replaceState(null, "", "/");
    }
  }, [perfil]);

  // Efecto aislado que lee la URL y se limpia solo (Aviso cancelación Stripe)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('pago') === 'cancelado') {
      setPagoCancelado(true);
      const timer = setTimeout(() => {
        window.history.replaceState(null, '', window.location.pathname);
        setPagoCancelado(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, []);

  const verificarUsuario = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase.from("perfiles").select("*").eq("id", user.id).single();
      if (data) {
        setPerfil({ ...data, email: user.email }); 
        setRutaDestino("/dashboard");
      }
    }
  };

  const abrirModalDeReserva = () => {
    if (!perfil) router.push("/login");
    else setIsModalOpen(true);
  };

  const procesarPagoStripe = async (priceId?: string) => {
    if (!priceId) return;

    if (!perfil) {
      // 🛒 BLINDAJE DE COMPRA: Guardamos el paquete que eligió en la memoria del navegador
      localStorage.setItem("paquetePendienteStripe", priceId);
      
      alert("Por favor, inicia sesión o regístrate para que tus créditos se carguen automáticamente a tu cuenta.");
      router.push("/login");
      return;
    }
    
    // Cerramos el candado para que no den doble clic
    setProcesandoPagoId(priceId); 
    
    try {
      const respuesta = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          priceId,
          userId: perfil.id,
          userEmail: perfil.email 
        }) 
      });
      
      const datos = await respuesta.json();
      
      if (datos.url) {
        window.location.href = datos.url; 
      } else {
        setProcesandoPagoId(null); 
        alert("No se pudo iniciar el proceso de pago. Intenta más tarde.");
      }
    } catch (error) {
      console.error("Error al procesar checkout:", error);
      setProcesandoPagoId(null); 
      alert("Hubo un problema de conexión con el servidor de pagos.");
    }
  };

  if (!isMounted) return null;
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
          <a href="#eventos" className="transition-colors duration-300 hover:text-foreground">Eventos</a>
          {perfil ? (
            <div className="flex items-center gap-6">
              {perfil.rol === 'admin' && (
                <button onClick={() => router.push("/admin")} className="group flex items-center gap-2 text-amber-600 font-medium transition-all duration-300 cursor-pointer hover:opacity-80">
                  <div className="w-8 h-8 rounded-full bg-amber-600/10 border border-amber-600/20 flex items-center justify-center text-amber-600 shadow-sm group-hover:bg-amber-600 group-hover:text-white transition-colors">
                    <Crown size={14} strokeWidth={2} />
                  </div>
                  <span className="hidden lg:inline">Panel Admin</span>
                </button>
              )}
              <button onClick={() => router.push("/dashboard")} className="group flex items-center gap-3 text-primary font-medium transition-all duration-300 cursor-pointer hover:opacity-80">
                <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-xs font-bold uppercase shadow-sm group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  {perfil.nombre ? perfil.nombre.charAt(0) : "C"}
                </div>
                <span>Mi Cuenta ({perfil.creditos || 0})</span>
              </button>
            </div>
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
            <a href="#eventos" onClick={() => setIsMobileMenuOpen(false)} className="text-xl font-serif text-foreground border-b border-border pb-3">Eventos</a>
            <div className="pt-2 flex flex-col gap-3">
              {perfil ? (
                <>
                  {perfil.rol === 'admin' && (
                    <button onClick={() => router.push("/admin")} className="flex w-full items-center justify-between bg-amber-600/10 p-4 rounded-xl border border-amber-600/20 text-amber-700">
                      <span className="flex items-center gap-2 font-medium text-lg"><Crown size={18} strokeWidth={2} /> Panel de Control</span>
                      <ArrowRight size={20} />
                    </button>
                  )}
                  <button onClick={() => router.push("/dashboard")} className="flex w-full items-center justify-between bg-primary text-primary-foreground p-4 rounded-xl shadow-lg">
                    <span className="font-medium text-lg tracking-wide">Mi Perfil ({perfil.creditos || 0} créditos)</span>
                    <ArrowRight size={20} />
                  </button>
                </>
              ) : (
                <button onClick={() => router.push("/login")} className="flex w-full items-center justify-center bg-primary text-primary-foreground p-4 rounded-xl shadow-lg font-medium text-lg tracking-wide uppercase">
                  Iniciar Sesión
                </button>
              )}
              </div>
          </div>
        </div>
      )}

      {/* 👇 AGREGAR ESTO: Banner flotante que no rompe el layout 👇 */}
      {pagoCancelado && (
        <div className="relative z-30 mx-auto mt-4 max-w-md bg-red-100 border-l-4 border-red-500 text-red-700 p-4 shadow-md rounded-r-md animate-in fade-in slide-in-from-top-4">
          <p className="font-bold text-sm">Pago cancelado</p>
          <p className="text-xs mt-1">No se ha realizado ningún cargo a tu tarjeta.</p>
        </div>
      )}

      {/* TEXTO PRINCIPAL - DISEÑO ELEGANTE Y COMPACTO */}
      <div className="relative z-10 mx-auto flex min-h-[50vh] md:min-h-[65vh] max-w-[1400px] flex-col justify-center px-6 pb-8 pt-4 md:pb-16 md:px-12">
           
        <p className="animate-rise mb-3 md:mb-6 flex items-center gap-3 text-xs md:text-sm font-bold uppercase tracking-[0.15em] md:tracking-[0.25em] text-foreground/90 drop-shadow-sm [animation-delay:0.1s]">
          PILATES REFORMER • SAN PEDRO GARZA GARCÍA
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
            <span className="flex items-center justify-center gap-1.5 bg-primary/10 text-primary px-4 py-2 rounded-full border border-primary/20 text-center">
              <Sparkles size={14} /> Aceptamos TotalPass
            </span>
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
            <strong className="font-medium">¿Cómo adquiero o recargo un paquete?</strong> Elige tu plan abajo y págalo al instante de forma segura con <strong className="font-medium text-primary">Tarjeta de Crédito o Débito</strong>. Si prefieres pagar mediante transferencia o efectivo en el estudio, contáctanos por <a href="https://wa.me/528124697382?text=Hola%20Liliana,%20me%20gustar%C3%ADa%20adquirir%20un%20paquete%20de%20clases" target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline cursor-pointer">WhatsApp</a>.
          </p>
        </div>
        {/* --- FIN: BANNER AVISO DE PAGO --- */}
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[
            { nombre: "Clase Suelta", precio: 240, desc: "Vigencia: 7 días", priceId: "price_1UCvY9PXqkbuRJkatIwCDBWw" }, // Asumiendo que este es el de 1 clase
            { nombre: "8 Clases", precio: 1200, desc: "Vigencia: 30 días", priceId: "price_1UCvfNPXqkbuRJka0Trdg8UO" }, 
            { nombre: "12 Clases", precio: 1780, desc: "Vigencia: 30 días", priceId: "price_1UCvjAPXqkbuRJkaF7V8zcEw" },
            { nombre: "16 Clases", precio: 2280, desc: "Vigencia: 30 días", priceId: "price_1UCvo1PXqkbuRJkaOJUcfZ7M" },
            { nombre: "20 Clases", precio: 2780, desc: "Vigencia: 45 días", priceId: "price_1UCvovPXqkbuRJkauMH3Ffkg" },
            { nombre: "Ilimitadas", precio: 3200, desc: "Vigencia: 60 días", esPopular: true, priceId: "price_1UCvq3PXqkbuRJkapXnB8gQ5" }
          ].map((plan, i) => (
            <div key={i} className={`relative bg-card/60 backdrop-blur-md border ${plan.esPopular ? 'border-primary shadow-lg shadow-primary/10' : 'border-border hover:border-primary/50'} p-5 md:p-6 rounded-xl transition-all hover:-translate-y-1 flex flex-col justify-between`}>
              {plan.esPopular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full whitespace-nowrap">
                  El Mejor Plan
                </span>
              )}
              <div>
                <h3 className="font-medium text-xs md:text-sm uppercase tracking-wider text-muted-foreground mb-2 md:mb-4">{plan.nombre}</h3>
                <p className="text-3xl md:text-4xl font-sans font-light tracking-tight text-foreground mb-1">${plan.precio.toLocaleString('es-MX')}</p>
                <p className="text-[10px] md:text-xs text-primary font-medium">{plan.desc}</p>
              </div>
              
              {/* --- INICIO: BOTONES DE PAGO (TARJETA VS TRANSFERENCIA) --- */}
              <div className="mt-6 flex flex-col gap-2">
                {/* Botón principal: Stripe Checkout automático */}
                <button 
                  onClick={() => procesarPagoStripe(plan.priceId)}
                  disabled={procesandoPagoId === plan.priceId}
                  className="w-full block text-center rounded-md bg-foreground text-background py-2.5 md:py-3 text-[10px] md:text-xs font-bold uppercase tracking-widest hover:bg-primary hover:text-primary-foreground transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {procesandoPagoId === plan.priceId ? "Cargando Stripe..." : "Pagar con Tarjeta"}
                </button>
                
                {/* Botón secundario: Pago manual por WhatsApp */}
                <a 
                  href={`https://wa.me/528124697382?text=Hola%20Liliana,%20me%20interesa%20adquirir%20el%20paquete%20"${plan.nombre}"%20de%20$${plan.precio}.%20%C2%BFMe%20proporcionas%20los%20datos%20para%20transferencia?`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full block text-center rounded-md border border-border bg-transparent text-foreground py-2 md:py-2.5 text-[9px] md:text-[10px] font-medium uppercase tracking-wider hover:bg-secondary transition-all duration-300 cursor-pointer"
                >
                  Transferencia / Efectivo
                </a>
              </div>
              {/* --- FIN: BOTONES DE PAGO --- */}
              
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