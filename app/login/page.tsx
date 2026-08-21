"use client";

import React, { useState } from "react";
import { supabase } from "../../lib/supabase"; 
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ArrowLeft } from "lucide-react"; // Usaremos iconos limpios

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState(""); 
  const [showPassword, setShowPassword] = useState(false); // Memoria para ver/ocultar password
  const [isLoading, setIsLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMensaje("");

    try {
      if (isLogin) {
        // INICIO DE SESIÓN (La sesión se queda guardada automáticamente por Supabase)
        const { error } = await supabase.auth.signInWithPassword({ 
          email, 
          password 
        });
        if (error) throw error;
        
        setMensaje("¡Acceso exitoso! Entrando a tu cuenta...");
        router.push("/dashboard");
        
      } else {
        // REGISTRO
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { nombre } 
          }
        });
        if (error) throw error;
        
        if (data.session) {
          router.push("/dashboard");
        } else {
          setMensaje("¡Registro exitoso! Tu perfil ha sido creado. Ya puedes iniciar sesión.");
          setIsLogin(true); 
        }
      }
    } catch (error: any) {
      let errorAmigable = "Ocurrió un error. Verifica tus datos e intenta de nuevo.";
      if (error.message.includes("Invalid login")) errorAmigable = "Correo o contraseña incorrectos.";
      if (error.message.includes("already registered")) errorAmigable = "Este correo ya está registrado. Inicia sesión.";
      if (error.message.includes("Password should be")) errorAmigable = "La contraseña debe ser de al menos 6 caracteres.";
      
      setMensaje(errorAmigable);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4 relative">
      
      {/* Botón flotante para regresar al inicio */}
      <button 
        onClick={() => router.push("/")}
        className="absolute top-6 left-6 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
      >
        <ArrowLeft size={16} /> Volver al Inicio
      </button>

      <div className="w-full max-w-md bg-card p-8 md:p-10 rounded-2xl shadow-2xl border border-border">
        
        <div className="text-center mb-8">
          <span className="text-[10px] uppercase tracking-[0.25em] text-primary font-bold block mb-2">Control Balance</span>
          <h1 className="font-serif text-3xl text-foreground mb-1">
            {isLogin ? "Te damos la bienvenida" : "Crea tu cuenta"}
          </h1>
          <p className="text-muted-foreground text-xs">
            {isLogin ? "Ingresa para gestionar tus clases y créditos" : "Empieza tu camino en el estudio"}
          </p>
        </div>

        <form onSubmit={handleAuth} className="flex flex-col gap-5">
          
          {!isLogin && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Nombre Completo</label>
              <input 
                type="text" 
                required 
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full border-b border-border bg-transparent py-2 text-foreground focus:outline-none focus:border-primary transition-colors text-sm" 
                placeholder="Ej. Ana Sofía Garza"
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Correo Electrónico</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border-b border-border bg-transparent py-2 text-foreground focus:outline-none focus:border-primary transition-colors text-sm" 
              placeholder="tucorreo@ejemplo.com"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Contraseña</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border-b border-border bg-transparent py-2 pr-10 text-foreground focus:outline-none focus:border-primary transition-colors text-sm" 
                placeholder="Mínimo 6 caracteres"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 top-2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {mensaje && (
            <div className={`text-xs text-center p-3 rounded-lg font-medium border ${mensaje.includes("exitoso") || mensaje.includes("Entrando") ? "bg-emerald-500/10 text-emerald-700 border-emerald-200" : "bg-red-500/10 text-red-700 border-red-200"}`}>
              {mensaje}
            </div>
          )}

          <button 
            type="submit" 
            disabled={isLoading}
            className="mt-2 bg-primary text-primary-foreground py-3.5 rounded-lg text-xs font-bold tracking-[0.2em] uppercase hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer shadow-md"
          >
            {isLoading ? "Procesando..." : (isLogin ? "Iniciar Sesión" : "Crear Mi Cuenta")}
          </button>
        </form>

        <div className="mt-8 text-center pt-6 border-t border-border/50">
          <button 
            type="button" 
            onClick={() => {
              setIsLogin(!isLogin);
              setMensaje(""); 
            }}
            className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            {isLogin ? (
              <>¿No tienes cuenta? <span className="text-primary font-bold underline">Regístrate aquí</span></>
            ) : (
              <>¿Ya tienes cuenta? <span className="text-primary font-bold underline">Inicia sesión</span></>
            )}
          </button>
        </div>

      </div>
    </main>
  );
}