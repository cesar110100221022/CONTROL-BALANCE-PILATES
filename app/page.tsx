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
      <Footer />
    </main>
  );
}