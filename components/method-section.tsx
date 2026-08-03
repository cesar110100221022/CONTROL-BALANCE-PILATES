import React from 'react';

export function MethodSection() {
  return (
    <section id="metodo" className="py-24 px-6 md:px-12 bg-secondary text-secondary-foreground relative z-10">
      <div className="max-w-[1400px] mx-auto grid md:grid-cols-2 gap-12 items-center">
        <div>
          <h2 className="text-4xl md:text-5xl font-serif font-light mb-6 tracking-tight">El Método</h2>
          <p className="text-lg font-light leading-relaxed mb-6">
            Pilates Reformer no es solo ejercicio, es reeducación postural. Nuestro enfoque se centra en la precisión, el control y la sincronización con la respiración.
          </p>
          <p className="text-lg font-light leading-relaxed">
            A través de movimientos conscientes y de bajo impacto, fortalecemos el centro (core), alargamos la musculatura y mejoramos la flexibilidad, logrando un balance perfecto entre mente y cuerpo.
          </p>
        </div>
        
        {/* Contenedor de Imagen Estética */}
        <div className="aspect-[4/5] bg-muted/50 rounded-lg overflow-hidden relative shadow-xl">
          <img 
            src="images/ismerai.jpg" 
            alt="Pilates Reformer en Control Balance" 
            className="absolute inset-0 w-full h-full object-cover opacity-90 transition-transform duration-700 hover:scale-105" 
          />
        </div>
      </div>
    </section>
  );
}