"use client";

import React from "react";

interface ModalLegalProps {
  isOpen: boolean;
  onClose: () => void;
  tipo: "terminos" | "privacidad" | "cancelaciones" | "";
}

export function ModalLegal({ isOpen, onClose, tipo }: ModalLegalProps) {
  if (!isOpen || !tipo) return null;

  // --- CONTENIDO DE LOS DOCUMENTOS ---
  const contenido = {
    terminos: {
      titulo: "Términos y Condiciones",
      texto: (
        <div className="space-y-4 text-sm text-muted-foreground">
          <p><strong>Responsabilidad física:</strong> Al realizar una reserva, declaras estar en condiciones físicas óptimas y asumes la responsabilidad de cualquier riesgo o lesión durante la práctica de Pilates Reformer.</p>
          <p><strong>Puntualidad:</strong> Existe una tolerancia máxima de 10 minutos para ingresar a la clase. Después de este tiempo, por tu seguridad y respeto al calentamiento grupal, no se permitirá el acceso.</p>
          <p><strong>Higiene y equipo:</strong> Es estrictamente obligatorio el uso de calcetines con antiderrapante (grip socks) para subir a las camas Reformer.</p>
        </div>
      )
    },
    privacidad: {
      titulo: "Aviso de Privacidad",
      texto: (
        <div className="space-y-4 text-sm text-muted-foreground">
          <p><strong>Uso de información:</strong> Tu nombre completo y número de WhatsApp se utilizan exclusivamente para gestionar tu perfil, administrar tus créditos y enviarte notificaciones sobre tus reservas en Control Balance.</p>
          <p><strong>Protección de datos:</strong> Control Balance se compromete a no compartir, rentar ni vender tu información personal a terceros bajo ninguna circunstancia. Tu información está resguardada de manera segura.</p>
        </div>
      )
    },
    cancelaciones: {
      titulo: "Políticas de Cancelación",
      texto: (
        <div className="space-y-4 text-sm text-muted-foreground">
          <p><strong>Ventana de cancelación:</strong> Para que tu crédito sea devuelto a tu cuenta, las clases deben cancelarse a través del sistema o WhatsApp con al menos 12 horas de anticipación.</p>
          <p><strong>Ausencias (No-shows):</strong> Las cancelaciones fuera de tiempo o el no presentarse a la clase resultarán en la pérdida automática del crédito sin excepción.</p>
          <p><strong>Reembolsos:</strong> Los paquetes comprados no son transferibles a otras personas ni reembolsables en dinero bajo ninguna circunstancia.</p>
          <p><strong>Vigencia de paquetes:</strong> Cada paquete tiene una caducidad de 30 días a partir de su fecha de compra; los créditos no utilizados no se acumulan para el mes siguiente.</p>
        </div>
      )
    }
  };

  const documento = contenido[tipo as keyof typeof contenido];

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 py-8">
      <div className="bg-background p-6 md:p-8 max-w-2xl w-full relative shadow-2xl border border-border rounded-lg animate-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-5 text-muted-foreground hover:text-foreground text-2xl font-bold cursor-pointer">
          ✕
        </button>
        
        <h2 className="text-2xl font-serif text-foreground mb-6 pb-4 border-b border-border/50">
          {documento.titulo}
        </h2>
        
        <div className="leading-relaxed">
          {documento.texto}
        </div>
        
        <div className="mt-8 pt-4">
          <button onClick={onClose} className="w-full bg-secondary text-foreground border border-border py-3 rounded-md text-xs uppercase tracking-widest font-medium hover:bg-secondary/70 transition-colors cursor-pointer">
            Entendido y Aceptado
          </button>
        </div>
      </div>
    </div>
  );
}