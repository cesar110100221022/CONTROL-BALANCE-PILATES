import { HeroSection } from "../components/hero-section";
import { MethodSection } from "../components/method-section";
import { StudioSection } from "../components/studio-section";
import { Footer } from "../components/footer-section";

// --- INICIO: METADATA Y SEO (PARA WHATSAPP E INSTAGRAM) ---
export const metadata = {
  title: "Control Balance | Pilates Reformer",
  description: "Estudio boutique de Pilates Reformer. Respira, conecta y transforma tu cuerpo con nuestro método consciente. Reserva tu clase de prueba hoy.",
  openGraph: {
    title: "Control Balance | Pilates Reformer",
    description: "Movimiento consciente en un espacio diseñado para el silencio, la luz y la precisión. ¡Únete a nuestro estudio!",
    images: ["/images/logo.PNG"], // Esta es la imagen que saldrá en la tarjeta de WhatsApp
  }
};
// --- FIN: METADATA Y SEO ---

export default function Page() {
  return (
    // Agregamos scroll-smooth para que al navegar entre secciones se deslice elegantemente
    <main className="scroll-smooth bg-background">
      <HeroSection />
      <MethodSection />
      <StudioSection />
      
      {/* --- INICIO: SECCIÓN DE EVENTOS PRIVADOS --- */}
      <section id="eventos" className="py-16 px-6 bg-secondary/30 border-y border-border my-12 animate-in fade-in duration-700">
        <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
          <span className="text-[10px] uppercase tracking-[0.3em] text-primary font-bold mb-3">
            Experiencias Exclusivas
          </span>
          <h2 className="font-serif text-3xl md:text-4xl text-foreground mb-4">
            Tu Evento Privado en Control Balance
          </h2>
          <p className="text-muted-foreground text-sm md:text-base mb-8 max-w-2xl leading-relaxed">
            ¿Buscas un espacio diferente para un cumpleaños wellness, una integración de equipo o una clase exclusiva con tus amigas? Renta nuestro estudio y vive una experiencia única de movimiento y conexión.
          </p>
          
          <a 
            href="https://wa.me/528124697382?text=¡Hola!%20Me%20encantaría%20recibir%20información%20para%20organizar%20un%20evento%20privado%20en%20Control%20Balance."
            target="_blank"
            rel="noreferrer"
            className="bg-foreground text-background px-8 py-3.5 rounded-full text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-opacity shadow-lg"
          >
            💬 Cotizar mi Evento
          </a>
        </div>
      </section>
      {/* --- FIN: SECCIÓN DE EVENTOS PRIVADOS --- */}

      <Footer />
    </main>
  );
}