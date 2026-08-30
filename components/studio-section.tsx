"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase'; // <-- Asegúrate de que esta ruta coincida con tu proyecto

export function StudioSection() {
  // 1. Memoria inteligente para el botón (por defecto manda a login)
  const [rutaDestino, setRutaDestino] = useState("/login");

  // 2. Verificación silenciosa al cargar la página
  useEffect(() => {
    const verificarSesion = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setRutaDestino("/dashboard"); // Si ya tiene llaves, la manda directo a su panel
      }
    };
    verificarSesion();
  }, []);

  return (
    <section id="estudio" className="py-24 px-6 md:px-12 bg-background text-foreground relative z-10">
      <div className="max-w-[1400px] mx-auto text-center">
        <span className="text-xs font-medium uppercase tracking-[0.35em] text-muted-foreground block mb-4">San Pedro Garza García</span>
        <h2 className="text-4xl md:text-5xl font-serif font-light mb-16 tracking-tight">El Estudio</h2>
        
        <div className="grid md:grid-cols-3 gap-8 text-left">
          {/* Tarjeta 1 */}
          <div className="p-8 border border-border rounded-lg bg-card hover:shadow-md transition-shadow duration-300">
            <h3 className="font-serif text-2xl mb-4 tracking-tight">Grupos Reducidos</h3>
            <p className="text-muted-foreground font-light leading-relaxed">
              Máximo 6 camas por clase para garantizar atención completamente personalizada y corrección postural exacta.
            </p>
          </div>
          
          {/* Tarjeta 2 */}
          <div className="p-8 border border-border rounded-lg bg-card hover:shadow-md transition-shadow duration-300">
            <h3 className="font-serif text-2xl mb-4 tracking-tight">Lujo Silencioso</h3>
            <p className="text-muted-foreground font-light leading-relaxed">
              Un espacio boutique diseñado para desconectar. Iluminación cálida, detalles mínimos y una atmósfera serena.
            </p>
          </div>
          
          {/* Tarjeta 3 */}
          <div className="p-8 border border-border rounded-lg bg-card hover:shadow-md transition-shadow duration-300">
            <h3 className="font-serif text-2xl mb-4 tracking-tight">Equipo Premium</h3>
            <p className="text-muted-foreground font-light leading-relaxed">
              Camas Reformer de última generación que garantizan un movimiento fluido, seguro y completamente silencioso.
            </p>
          </div>
        </div>
        {/* --- INICIO: BOTÓN DE CIERRE DE VENTA INTELIGENTE --- */}
        <div className="mt-16 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          <a 
            href={rutaDestino} 
            className="inline-flex items-center justify-center gap-3 bg-primary text-primary-foreground px-8 py-4 rounded-full text-xs font-bold uppercase tracking-[0.2em] shadow-xl hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 cursor-pointer"
          >
            Vivir la Experiencia
            <span className="text-lg">→</span>
          </a>
        </div>
        {/* --- FIN: BOTÓN DE CIERRE DE VENTA INTELIGENTE --- */}
      </div>
    </section>
  );
}