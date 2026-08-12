"use client";

import React from "react";
import { ArrowRight} from "lucide-react";

export function Footer() {
  return (
    <>
      {/* --- INICIO: FOOTER (PIE DE PÁGINA) --- */}
      <footer className="relative z-10 bg-background/80 backdrop-blur-md border-t border-border py-12 px-6 md:px-12 mt-20">
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 items-center text-center md:text-left">
          
          {/* 1. Marca y Logo */}
          <div className="flex flex-col items-center md:items-start">
            <img src="/images/logo.PNG" alt="Control Balance" className="h-10 w-auto mb-4 opacity-80 hover:opacity-100 transition-opacity" />
            <p className="text-sm text-muted-foreground font-light max-w-xs">
              Respira. Conecta. Transforma. Tu espacio exclusivo de Pilates Reformer.
            </p>
          </div>

          {/* 2. Contacto y Ubicación + MAPA */}
          <div className="flex flex-col items-center md:items-start text-sm text-muted-foreground font-light space-y-3 w-full">
            <p>📍 Calz. Mauricio Fernández Garza 217, Del Valle, 66220 San Pedro Garza García, N.L.</p>
            <p>📞 +52 81 3262 4421</p>
            
            <div className="w-full h-32 md:h-40 rounded-lg overflow-hidden border border-border shadow-sm">
              <iframe
                title="Ubicación de Control Balance Pilates"
                src="https://maps.google.com/maps?q=Calz.+Mauricio+Fern%C3%A1ndez+Garza+217,+Del+Valle,+66220+San+Pedro+Garza+Garc%C3%ADa,+N.L.&output=embed"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="grayscale-[0.3] contrast-[0.9] hover:grayscale-0 transition-all duration-500"
              />
            </div>
          </div>

          {/* 3. Redes Sociales (Links) */}
          <div className="flex flex-col items-center md:items-end">
            <p className="text-xs uppercase tracking-widest font-bold text-foreground mb-4">Síguenos</p>
            <div className="flex gap-4">
              {/* Botón Instagram */}
              <a href="https://www.instagram.com/pilates.controlbalance?igsh=MWV1c3FvZHlxMnIydA==" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground hover:bg-primary hover:text-primary-foreground transition-all cursor-pointer shadow-sm">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
              </a>
              {/* Botón Facebook */}
              <a href="https://www.facebook.com/share/18ynvqxTwm/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground hover:bg-[#1877F2] hover:text-white transition-all cursor-pointer shadow-sm">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
        <div className="max-w-[1400px] mx-auto mt-12 pt-6 border-t border-border/50 text-center text-[10px] uppercase tracking-widest text-muted-foreground/70">
          © {new Date().getFullYear()} Control Balance Pilates. Todos los derechos reservados.
        </div>
      </footer>
      {/* --- FIN: FOOTER --- */}

      {/* --- INICIO: BOTÓN FLOTANTE WHATSAPP --- */}
      <a 
        href="https://wa.me/528124697382?text=Hola%20Liliana,%20tengo%20una%20duda%20sobre%20las%20clases%20de%20Pilates" 
        target="_blank" 
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-[99999] bg-[#25D366] text-white p-4 rounded-full shadow-[0_10px_40px_-10px_rgba(37,211,102,0.8)] hover:scale-110 transition-transform duration-300 flex items-center justify-center cursor-pointer"
        aria-label="Contactar por WhatsApp"
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.305-.885-.653-1.482-1.46-1.656-1.759-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51h-.57c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
        </svg>
      </a>
      {/* --- FIN: BOTÓN FLOTANTE WHATSAPP --- */}
    </>
  );
}