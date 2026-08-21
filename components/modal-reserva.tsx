"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export function ModalReserva({ isOpen, onClose, perfil, onActualizarPerfil, onReservaExitosa }: any) {
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
    if (!nombreInput || !whatsappInput) return alert("Ingresa tu nombre y WhatsApp.");
    setIsActualizando(true);
    
    // Mandamos el referido. Si está vacío, mandamos null para no ensuciar la base de datos.
    const { error } = await supabase.from("perfiles").update({ 
      nombre: nombreInput, 
      whatsapp: whatsappInput,
      referido_por: referidoInput || null 
    }).eq("id", perfil.id);
    
    setIsActualizando(false);
    if (error) alert("Error al guardar tus datos.");
    else onActualizarPerfil({ ...perfil, nombre: nombreInput, whatsapp: whatsappInput, referido_por: referidoInput });
  };

  const confirmarReserva = async () => {
    if (!claseSeleccionada) return alert("Selecciona un horario.");
    if (perfil.creditos <= 0) return alert("No tienes créditos suficientes.");

    const claseElegida = clasesDisponibles.find(c => String(c.id) === String(claseSeleccionada));
    const maxCamas = claseElegida?.cupo_max || 6;
    const ocupadas = reservasActivas.filter(r => String(r.clase_id) === String(claseSeleccionada)).length;

    if (ocupadas >= maxCamas) return alert("Esta clase acaba de llenarse.");

    setIsSubmitting(true);
    const { error } = await supabase.from('reservas').insert([{ nombre_cliente: perfil.nombre, whatsapp: perfil.whatsapp, clase_id: claseSeleccionada }]);
    
    if (error) {
      setIsSubmitting(false);
      return alert("Hubo un problema de conexión.");
    }

    const nuevosCreditos = perfil.creditos - 1;
    await supabase.from('perfiles').update({ creditos: nuevosCreditos }).eq('id', perfil.id);
    
    setIsSubmitting(false);
    onActualizarPerfil({ ...perfil, creditos: nuevosCreditos });
    alert("¡Reserva confirmada con éxito!");
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

    if (error) alert("Error al unirte a la lista.");
    else {
      alert("¡Listo! Estás en la fila de espera.");
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
    .filter((c) => c.dia && c.dia.startsWith(diaSeleccionado))
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
                  <button onClick={() => window.open("https://wa.me/528124697382?text=Hola%20Liliana,%20ya%20no%20tengo%20cr%C3%A9ditos%20en%20mi%20cuenta.%20Me%20gustar%C3%ADa%20comprar%20un%20paquete%20nuevo.", "_blank")} className="w-full bg-emerald-600 text-white py-3 md:py-4 text-xs md:text-sm uppercase tracking-widest transition-opacity hover:bg-emerald-700 cursor-pointer shadow-lg rounded-md">
                    💬 Sin créditos: Comprar Paquete
                  </button>
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
    </div>
  );
}