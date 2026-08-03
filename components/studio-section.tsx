import React from 'react';

export function StudioSection() {
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
      </div>
    </section>
  );
}