import { HeroSection } from "../components/hero-section";
import { MethodSection } from "../components/method-section";
import { StudioSection } from "../components/studio-section";
import { Footer } from "../components/footer-section";

export default function Page() {
  return (
    <main>
      <HeroSection />
      <MethodSection />
      <StudioSection />
      <Footer /> {/* 2. Etiqueta corregida */}
    </main>
  );
}