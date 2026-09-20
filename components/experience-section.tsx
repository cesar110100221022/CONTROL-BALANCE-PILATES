"use client";

import React from 'react';
import { Star, Play, Quote } from 'lucide-react';

export function ExperienceSection() {
  return (
    <section id="experiencia" className="py-24 px-6 md:px-12 bg-background relative z-10 border-t border-border/50">
      <div className="max-w-[1400px] mx-auto">
        
        {/* ENCABEZADO DE LA SECCIÓN */}
        <div className="text-center mb-16 md:mb-24">
          <span className="text-[10px] md:text-xs font-bold uppercase tracking-[0.3em] text-primary mb-4 block">
            Comunidad y Movimiento
          </span>
          <h2 className="text-4xl md:text-5xl font-serif font-light text-foreground tracking-tight">
            La Experiencia Control Balance
          </h2>
        </div>

        {/* BLOQUE 1: CONOCE A LILIANA Y VIDEOS (SPLIT GRID) */}
        <div className="grid md:grid-cols-2 gap-12 md:gap-20 items-center mb-24">
          
          {/* Biografía de Liliana */}
          <div className="order-2 md:order-1">
            <h3 className="text-2xl md:text-3xl font-serif text-foreground mb-6">
              Guiada por Liliana
            </h3>
            <p className="text-muted-foreground font-light leading-relaxed mb-6">
              "El movimiento consciente tiene el poder de transformar no solo tu cuerpo, sino tu mente. En Control Balance no busco que hagas un ejercicio rápido, busco que entiendas tu postura, que conectes con tu respiración y que te regales una hora de paz y enfoque total."
            </p>
            <p className="text-muted-foreground font-light leading-relaxed mb-8">
              Con atención personalizada y una pasión profunda por la enseñanza, Liliana asegura que cada clase se adapte a tu nivel, guiándote para alcanzar tu mejor versión sin lesiones y con resultados reales.
            </p>
            
            {/* Redes Sociales de Liliana / Estudio */}
            <a 
              href="https://www.instagram.com/pilates.controlbalance" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border-b border-primary text-primary pb-1 text-xs font-bold uppercase tracking-widest hover:text-foreground hover:border-foreground transition-colors cursor-pointer"
            >
              Síguenos en Instagram
            </a>
          </div>

          {/* Videos (Reels / Instagram) */}
          <div className="order-1 md:order-2 grid grid-cols-2 gap-4 relative">
            
          {/* Video 1: CONOCE A LILI */}
<div className="aspect-[9/16] bg-secondary/50 rounded-lg overflow-hidden relative group border border-border shadow-sm">
  <iframe 
    src="https://www.instagram.com/reel/DYIWt6-DYr0/embed" 
    className="w-full h-full object-cover scale-[1.02] border-0 overflow-hidden"
    loading="lazy"
    title="Conoce a Lili"
  />
  <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors pointer-events-none" />
</div>

{/* Video 2: REDUCIR PROBLEMAS AL VISITAR PILATES */}
<div className="aspect-[9/16] bg-secondary/50 rounded-lg overflow-hidden relative group border border-border shadow-sm mt-8">
  <iframe 
    src="https://www.instagram.com/reel/Daf-bEKCWOy/embed" 
    className="w-full h-full object-cover scale-[1.02] border-0 overflow-hidden"
    loading="lazy"
    title="Reducir problemas y lesiones"
  />
  <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors pointer-events-none" />
</div>
            
          </div>
        </div>

        {/* BLOQUE 2: TESTIMONIOS Y PRUEBA SOCIAL */}
        <div className="pt-16 border-t border-border/50">
          <div className="grid md:grid-cols-3 gap-8">
            
            {/* Testimonio 1 */}
            <div className="bg-card p-8 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow">
              <div className="flex gap-1 text-amber-500 mb-6">
                <Star size={16} fill="currentColor" />
                <Star size={16} fill="currentColor" />
                <Star size={16} fill="currentColor" />
                <Star size={16} fill="currentColor" />
                <Star size={16} fill="currentColor" />
              </div>
              <p className="text-foreground font-light leading-relaxed mb-6 italic text-sm">
                "Las clases con Liliana son increíbles. Jamás había sentido que me corrigieran la postura de una forma tan precisa. El estudio es hermoso y realmente te desconectas de todo."
              </p>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                — Ximena Garza.
              </p>
            </div>

            {/* Testimonio 2 */}
            <div className="bg-card p-8 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow">
              <div className="flex gap-1 text-amber-500 mb-6">
                <Star size={16} fill="currentColor" />
                <Star size={16} fill="currentColor" />
                <Star size={16} fill="currentColor" />
                <Star size={16} fill="currentColor" />
                <Star size={16} fill="currentColor" />
              </div>
              <p className="text-foreground font-light leading-relaxed mb-6 italic text-sm">
                "Me encanta que los grupos sean tan reducidos. Sientes que estás tomando una clase privada. He notado muchísima diferencia en mi flexibilidad en solo un mes."
              </p>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                — Regina Garza.
              </p>
            </div>

            {/* Testimonio 3 */}
            <div className="bg-card p-8 rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow">
              <div className="flex gap-1 text-amber-500 mb-6">
                <Star size={16} fill="currentColor" />
                <Star size={16} fill="currentColor" />
                <Star size={16} fill="currentColor" />
                <Star size={16} fill="currentColor" />
                <Star size={16} fill="currentColor" />
              </div>
              <p className="text-foreground font-light leading-relaxed mb-6 italic text-sm">
                "El mejor estudio de Pilates en San Pedro. Todo está impecable, el equipo es de primera y la vibra del lugar te invita a regresar todos los días."
              </p>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                — Ismerai Cervantes.
              </p>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}