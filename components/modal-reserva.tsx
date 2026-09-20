"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { ModalLegal } from "./modal-legal"; // <-- 1. Importamos al fantasma
import Swal from 'sweetalert2';

export function ModalReserva({ isOpen, onClose, perfil, onActualizarPerfil, onReservaExitosa }: any) {
  const [modalLegal, setModalLegal] = useState<"terminos" | "privacidad" | "cancelaciones" | "">(""); // <-- 2. Memoria del clic
  
  const [clasesDisponibles, setClasesDisponibles] = useState<any[]>([]);
  const [reservasActivas, setReservasActivas] = useState<any[]>([]);
  const [claseSeleccionada, setClaseSeleccionada] = useState("");
  
  const obtenerFechaLocal = (fecha: Date) => {
    const year = fecha.getFullYear();
    const month = String(fecha.getMonth() + 1).padStart(2, '0');
    const day = String(fecha.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const [diaSeleccionado, setDiaSeleccionado] = useState(obtenerFechaLocal(new Date()));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nombreInput, setNombreInput] = useState("");
  const [whatsappInput, setWhatsappInput] = useState("");
  const [referidoInput, setReferidoInput] = useState(""); // <-- NUEVA MEMORIA
  const [isActualizando, setIsActualizando] = useState(false);

  useEffect(() => {
    if (isOpen && perfil) {
      setNombreInput(perfil.nombre || "");
      setWhatsappInput(perfil.whatsapp || "");
      obtenerClases();
    }
  }, [isOpen, perfil]);

  if (!isOpen || !perfil) return null;

  const obtenerClases = async () => {
    const { data: dataClases } = await supabase.from('clases').select('*');
    if (dataClases) setClasesDisponibles(dataClases);
    const { data: dataReservas } = await supabase.from('reservas').select('clase_id');
    if (dataReservas) setReservasActivas(dataReservas);
  };

  const guardarPerfil = async () => {
    if (!nombreInput || !whatsappInput) {
      return Swal.fire({ title: "Faltan datos", text: "Por favor ingresa tu nombre y WhatsApp.", icon: "warning", confirmButtonColor: "#f59e0b" });
    }
    setIsActualizando(true);
    
    const { error } = await supabase.from("perfiles").update({ 
      nombre: nombreInput, 
      whatsapp: whatsappInput,
      referido_por: referidoInput || null 
    }).eq("id", perfil.id);
    
    setIsActualizando(false);
    if (error) {
      Swal.fire({ title: "Error", text: "No pudimos guardar tus datos.", icon: "error", confirmButtonColor: "#dc2626" });
    } else {
      onActualizarPerfil({ ...perfil, nombre: nombreInput, whatsapp: whatsappInput, referido_por: referidoInput });
      Swal.fire({ title: "¡Listo!", text: "Tus datos se guardaron correctamente.", icon: "success", confirmButtonColor: "#059669", timer: 2000, showConfirmButton: false });
    }
  };

  const confirmarReserva = async () => {
    if (!claseSeleccionada) return Swal.fire({ title: "Aviso", text: "Por favor selecciona un horario primero.", icon: "info", confirmButtonColor: "#059669" });
    if (perfil.creditos <= 0) return Swal.fire({ title: "Sin créditos", text: "No tienes créditos suficientes para reservar.", icon: "warning", confirmButtonColor: "#f59e0b" });

    const claseElegida = clasesDisponibles.find(c => String(c.id) === String(claseSeleccionada));
    const maxCamas = claseElegida?.cupo_max || 6;
    const ocupadas = reservasActivas.filter(r => String(r.clase_id) === String(claseSeleccionada)).length;

    if (ocupadas >= maxCamas) return Swal.fire({ title: "Clase Llena", text: "Alguien más acaba de tomar el último lugar.", icon: "error", confirmButtonColor: "#dc2626" });

    setIsSubmitting(true);
    
    // 1. PRIMERO cobramos el crédito (Aseguramos el ingreso del estudio)
    const nuevosCreditos = perfil.creditos - 1;
    const { error: errorPago } = await supabase.from('perfiles').update({ creditos: nuevosCreditos }).eq('id', perfil.id);

    if (errorPago) {
      setIsSubmitting(false);
      return Swal.fire({ title: "Error", text: "No pudimos procesar tu crédito. Revisa tu conexión a internet.", icon: "error", confirmButtonColor: "#dc2626" });
    }

    // 2. LUEGO apartamos la cama oficial
    const { error: errorReserva } = await supabase.from('reservas').insert([{ nombre_cliente: perfil.nombre, whatsapp: perfil.whatsapp, clase_id: claseSeleccionada }]);
    
    if (errorReserva) {
      // 🚨 PLAN DE EMERGENCIA: Si alguien le ganó el lugar o se cayó la red, le devolvemos su crédito intacto.
      await supabase.from('perfiles').update({ creditos: perfil.creditos }).eq('id', perfil.id);
      setIsSubmitting(false);
      return Swal.fire({ title: "Clase no disponible", text: "No se pudo separar la cama. Tu crédito ha sido devuelto.", icon: "warning", confirmButtonColor: "#f59e0b" });
    }
    
    setIsSubmitting(false);
    onActualizarPerfil({ ...perfil, creditos: nuevosCreditos });
    Swal.fire({ title: "¡Reserva Confirmada!", text: "Tu cama te está esperando.", icon: "success", confirmButtonColor: "#059669" });
    // --- INICIO: ENVIAR CORREO A LA TÍA ---
    try {
      // Ya no declaramos claseElegida porque ya la calculamos arriba
      await fetch('/api/notificacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombreCliente: perfil.nombre,
          telefono: perfil.whatsapp, // <- NUEVO: Mandamos el WhatsApp
          dia: diaSeleccionado,      // <- NUEVO: Mandamos la fecha
          clase: claseElegida?.nombre || "Pilates Reformer",
          horario: claseElegida?.horario || "Horario reservado",
          creditosRestantes: nuevosCreditos // <- NUEVO: Mandamos los créditos
        }),
      });
    } catch (error) {
      console.error("No se pudo enviar el correo de alerta:", error);
    }
    // --- FIN: ENVIAR CORREO A LA TÍA ---
    setClaseSeleccionada("");
    onReservaExitosa(); 
    onClose();
  };

  const unirseListaEspera = async () => {
    if (!claseSeleccionada) return;
    setIsSubmitting(true);
    const { error } = await supabase.from('lista_espera').insert([{ 
      clase_id: claseSeleccionada, nombre_cliente: perfil.nombre, whatsapp: perfil.whatsapp
    }]);
    setIsSubmitting(false);

    if (error) {
      Swal.fire({ title: "Error", text: "No pudimos agregarte a la lista de espera.", icon: "error", confirmButtonColor: "#dc2626" });
    } else {
      Swal.fire({ title: "¡Estás en la fila!", text: "Te avisaremos por WhatsApp si se libera un lugar.", icon: "success", confirmButtonColor: "#059669" });
      setClaseSeleccionada("");
      onClose();
    }
  };

  const convertirAMinutos = (horario: string) => {
    if (!horario) return 0;
    const [horaMin, ampm] = horario.split(' ');
    if (!horaMin || !ampm) return 0;
    const [h, m] = horaMin.split(':');
    let hora = parseInt(h, 10);
    if (ampm?.toUpperCase() === 'PM' && hora !== 12) hora += 12;
    if (ampm?.toUpperCase() === 'AM' && hora === 12) hora = 0;
    return hora * 60 + parseInt(m, 10);
  };

  const clasesDelDia = clasesDisponibles
    .filter((c) => {
      if (!c.dia || !c.dia.startsWith(diaSeleccionado)) return false;
      
      // CANDADO DE TIEMPO REAL: Si seleccionaron "Hoy", ocultar las clases que ya pasaron
      const hoy = obtenerFechaLocal(new Date());
      if (c.dia === hoy) {
        const ahora = new Date();
        const minutosActuales = ahora.getHours() * 60 + ahora.getMinutes();
        const minutosClase = convertirAMinutos(c.horario);
        
        // Solo mostrar la clase si todavía faltan minutos para que empiece
        return minutosClase > minutosActuales;
      }
      
      // Si es un día en el futuro, mostrar todas las clases
      return true;
    })
    .sort((a, b) => convertirAMinutos(a.horario) - convertirAMinutos(b.horario));

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-8">
      <div className="bg-background p-6 md:p-8 max-w-lg w-full relative shadow-2xl border border-border rounded-lg animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-5 text-muted-foreground hover:text-foreground text-2xl font-bold cursor-pointer">✕</button>
        {(!perfil.nombre || !perfil.whatsapp) ? (
          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-serif font-light mb-4 mt-4">Solo falta un paso</h2>
            <p className="text-xs md:text-sm text-muted-foreground mb-6">Completa estos 2 datos para continuar.</p>
            <div className="space-y-4 text-left mb-6">
              <div>
                <label className="block text-[10px] md:text-xs uppercase tracking-widest text-muted-foreground mb-1">Nombre Completo</label>
                <input type="text" value={nombreInput} onChange={(e) => setNombreInput(e.target.value)} className="w-full border-b border-border bg-transparent py-2 text-foreground focus:outline-none focus:border-primary text-sm" placeholder="Ej. Ana Sofía" />
              </div>
              <div>
                <label className="block text-[10px] md:text-xs uppercase tracking-widest text-muted-foreground mb-1">WhatsApp</label>
                <input type="tel" value={whatsappInput} onChange={(e) => setWhatsappInput(e.target.value)} className="w-full border-b border-border bg-transparent py-2 text-foreground focus:outline-none focus:border-primary text-sm" placeholder="Ej. 81 1234 5678" />
              </div>
              <div>
                <label className="block text-[10px] md:text-xs uppercase tracking-widest text-primary mb-1 flex items-center gap-1">
                  WhatsApp de quien te invitó <span className="bg-primary/20 text-primary px-1.5 py-0.5 rounded text-[8px]">Opcional 🎁</span>
                </label>
                <input type="tel" value={referidoInput} onChange={(e) => setReferidoInput(e.target.value)} className="w-full border-b border-border bg-transparent py-2 text-foreground focus:outline-none focus:border-primary text-sm" placeholder="Si alguien te invitó, pon su número aquí" />
              </div>
            </div>
            <button onClick={guardarPerfil} disabled={isActualizando} className="w-full bg-primary text-primary-foreground py-3 md:py-4 text-xs md:text-sm uppercase tracking-widest cursor-pointer disabled:opacity-50 hover:opacity-90 transition-opacity">
              {isActualizando ? "Guardando..." : "Guardar mis datos"}
            </button>
            
            {/* --- INICIO: DISCLAIMER LEGAL --- */}
            <p className="text-[9px] md:text-[10px] text-center text-muted-foreground mt-4 leading-relaxed">
              Al guardar tus datos y realizar una reserva, confirmas que aceptas nuestros <br className="hidden md:block"/>
              <button onClick={() => setModalLegal("terminos")} className="underline hover:text-primary transition-colors cursor-pointer">Términos y Condiciones</button> y nuestra <button onClick={() => setModalLegal("cancelaciones")} className="underline hover:text-primary transition-colors cursor-pointer">Política de Cancelaciones</button>.
            </p>
            {/* --- FIN: DISCLAIMER LEGAL --- */}

          </div>
        ) : (
          <>
            <div className="text-center mb-6 mt-2">
              <h2 className="text-2xl md:text-3xl font-serif font-light">Hola, {perfil.nombre}</h2>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">Créditos: <span className="font-bold text-primary">{perfil.creditos}</span></p>
            </div>
            <div className="mb-5 md:mb-6">
              <label className="block text-[10px] md:text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2 md:mb-3">Elige un día</label>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {[...Array(7)].map((_, i) => {
                  const d = new Date();
                  d.setDate(d.getDate() + i);
                  const idFecha = obtenerFechaLocal(d);
                  const nombreDia = d.toLocaleDateString('es-MX', { weekday: 'short' });
                  const numeroDia = d.getDate();
                  return (
                    <button type="button" key={i} onClick={() => setDiaSeleccionado(idFecha)} className={`min-w-[55px] md:min-w-[65px] p-2 rounded-lg border text-center transition-all cursor-pointer ${diaSeleccionado === idFecha ? 'bg-primary text-primary-foreground border-primary shadow-md' : 'border-border bg-card text-muted-foreground hover:text-foreground'}`}>
                      <span className="block text-[9px] md:text-[10px] uppercase tracking-wider">{nombreDia}</span>
                      <span className="block font-serif text-lg md:text-xl mt-1">{numeroDia}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="mb-5 md:mb-6">
              <label className="block text-[10px] md:text-xs font-medium uppercase tracking-widest text-muted-foreground mb-2">Horarios disponibles ({diaSeleccionado})</label>
              {clasesDelDia.length === 0 ? (
                <p className="text-xs md:text-sm text-muted-foreground border border-dashed border-border rounded-lg py-4 px-3 text-center">No hay clases disponibles para esta fecha.</p>
              ) : (
                <select value={claseSeleccionada} onChange={(e) => setClaseSeleccionada(e.target.value)} className="w-full border-b border-border bg-transparent py-2 cursor-pointer focus:outline-none focus:border-primary text-sm">
                  <option value="">Selecciona una clase...</option>
                  {clasesDelDia.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre} - {c.horario}</option>
                  ))}
                </select>
              )}
            </div>
            <p className="text-[9px] md:text-[10px] text-center text-muted-foreground mb-4 uppercase tracking-wider leading-relaxed">Las reservas son personales. Cada acompañante debe crear su propia cuenta.</p>
            {(() => {
              const claseElegidaObj = clasesDelDia.find(c => String(c.id) === String(claseSeleccionada));
              const maxCamas = claseElegidaObj?.cupo_max || 6;
              const ocupadas = reservasActivas.filter(r => String(r.clase_id) === String(claseSeleccionada)).length;
              
              if (claseSeleccionada && ocupadas >= maxCamas) {
                return (
                  <button onClick={unirseListaEspera} disabled={isSubmitting} className="w-full bg-amber-500 text-white py-3 md:py-4 text-xs md:text-sm uppercase tracking-widest transition-opacity hover:bg-amber-600 cursor-pointer shadow-lg rounded-md">
                    {isSubmitting ? "Procesando..." : "Clase Llena - Unirme a Lista de Espera"}
                  </button>
                );
              }

              // --- INICIO: INTERCEPTOR DE VENTAS (0 CRÉDITOS) ---
              if (claseSeleccionada && perfil.creditos <= 0) {
                return (
                  <a 
                    href="https://wa.me/528124697382?text=Hola%20Liliana,%20ya%20no%20tengo%20cr%C3%A9ditos%20en%20mi%20cuenta.%20Me%20gustar%C3%ADa%20comprar%20un%20paquete%20nuevo." 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={() => onClose()}
                    className="w-full block text-center bg-emerald-600 text-white py-3 md:py-4 text-xs md:text-sm uppercase tracking-widest transition-opacity hover:bg-emerald-700 cursor-pointer shadow-lg rounded-md no-underline"
                  >
                    💬 Sin créditos: Comprar Paquete
                  </a>
                );
              }
              // --- FIN: INTERCEPTOR DE VENTAS ---

              return (
                <button onClick={confirmarReserva} disabled={isSubmitting || clasesDelDia.length === 0 || !claseSeleccionada} className="w-full bg-primary text-white py-3 md:py-4 text-xs md:text-sm uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed transition-opacity hover:opacity-90 cursor-pointer rounded-md">
                  {isSubmitting ? "Procesando..." : "Confirmar Reserva"}
                </button>
              );
            })()}
          </>
        )}
      </div>

      {/* --- INICIO: RENDERIZADO DEL MODAL LEGAL --- */}
      <ModalLegal 
        isOpen={modalLegal !== ""} 
        onClose={() => setModalLegal("")} 
        tipo={modalLegal} 
      />
      {/* --- FIN: RENDERIZADO DEL MODAL LEGAL --- */}

    </div>
  );
}