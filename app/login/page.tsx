"use client";

import React, { useState } from "react";
import { supabase } from "../../lib/supabase"; 
import { useRouter } from "next/navigation"; // 1. El router importado

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState(""); 
  const [isLoading, setIsLoading] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const router = useRouter(); // 2. El router inicializado

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMensaje("");

    try {
      if (isLogin) {
        // PROCESO DE INICIO DE SESIÓN
        const { error } = await supabase.auth.signInWithPassword({ 
          email, 
          password 
        });
        if (error) throw error;
        
        setMensaje("¡Acceso exitoso! Entrando a tu cuenta...");
        router.push("/dashboard"); // 3. El teletransportador activado
        
      } else {
        // PROCESO DE REGISTRO
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { nombre } 
          }
        });
        if (error) throw error;
        
        setMensaje("¡Registro exitoso! Tu perfil ha sido creado.");
        setIsLogin(true); 
      }
    } catch (error: any) {
      setMensaje(error.message || "Ocurrió un error de conexión.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md bg-card p-8 rounded-lg shadow-xl border border-border">
        
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl text-foreground mb-2">Control Balance</h1>
          <p className="text-muted-foreground text-sm tracking-wide uppercase">
            {isLogin ? "Acceso a tu cuenta" : "Crea tu perfil"}
          </p>
        </div>

        <form onSubmit={handleAuth} className="flex flex-col gap-5">
          
          {!isLogin && (
            <div>
              <label className="block text-xs font-medium uppercase text-muted-foreground mb-1">Nombre Completo</label>
              <input 
                type="text" 
                required 
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full border-b border-border bg-transparent py-2 text-foreground focus:outline-none focus:border-primary transition-colors" 
                placeholder="Ej. Ana Sofía"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium uppercase text-muted-foreground mb-1">Correo Electrónico</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border-b border-border bg-transparent py-2 text-foreground focus:outline-none focus:border-primary transition-colors" 
              placeholder="hola@ejemplo.com"
            />
          </div>

          <div>
            <label className="block text-xs font-medium uppercase text-muted-foreground mb-1">Contraseña</label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border-b border-border bg-transparent py-2 text-foreground focus:outline-none focus:border-primary transition-colors" 
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          {mensaje && (
            <div className="text-sm text-center p-3 bg-secondary rounded text-secondary-foreground font-medium">
              {mensaje}
            </div>
          )}

          <button 
            type="submit" 
            disabled={isLoading}
            className="mt-4 bg-primary text-primary-foreground py-4 text-sm font-medium tracking-[0.15em] uppercase hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? "Procesando..." : (isLogin ? "Entrar" : "Crear Cuenta")}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button 
            type="button" 
            onClick={() => {
              setIsLogin(!isLogin);
              setMensaje(""); 
            }}
            className="text-sm font-light text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            {isLogin ? "¿No tienes cuenta? Regístrate aquí" : "¿Ya tienes cuenta? Inicia sesión"}
          </button>
        </div>

      </div>
    </main>
  );
}