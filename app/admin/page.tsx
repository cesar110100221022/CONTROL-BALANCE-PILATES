"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useRouter } from "next/navigation";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState("clientas"); // clientas, reservas, horarios
  
  // Memorias para almacenar los datos
  const [clientes, setClientes] = useState<any[]>([]);
  const [reservas, setReservas] = useState<any[]>([]);
  const [clases, setClases] = useState<any[]>([]);
  const [listaEspera, setListaEspera] = useState<any[]>([]);

 // Mini-función para obligar a usar la hora local de México
 const obtenerFechaLocal = (fecha: Date) => {
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, '0');
  const day = String(fecha.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Generador dinámico de los próximos 7 días con fecha exacta local
const obtenerDias = () => [...Array(7)].map((_, i) => {
  const d = new Date();
  d.setDate(d.getDate() + i);
  return {
    id: obtenerFechaLocal(d),
    nombre: d.toLocaleDateString('es-MX', { weekday: 'short' }),
    numero: d.getDate(),
    completo: d.toLocaleDateString('es-MX', { weekday: 'long' })
  };
});

  const diasCalendario = obtenerDias();
  const [diaSeleccionado, setDiaSeleccionado] = useState(diasCalendario[0].id);

  // Formulario para crear nueva clase
  const [nuevoNombreClase, setNuevoNombreClase] = useState("Pilates Reformer");
  const [nuevoHorario, setNuevoHorario] = useState("08:00 AM");
  const [nuevoCupo, setNuevoCupo] = useState(6);
  const [isCreandoClase, setIsCreandoClase] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  
 // --- INICIO: CATÁLOGO DE PAQUETES ---
 const PAQUETES = [
  { id: 1, nombre: "Clase suelta", clases: 1, precio: 240 },
  { id: 2, nombre: "Paquete de 8 clases", clases: 8, precio: 1050 },
  { id: 3, nombre: "Paquete de 12 clases", clases: 12, precio: 1680 },
  { id: 4, nombre: "Paquete de 16 clases", clases: 16, precio: 2160 },
  { id: 5, nombre: "Paquete de 20 clases", clases: 20, precio: 2640 },
  { id: 6, nombre: "Clases ilimitadas", clases: 30, precio: 3040 },
  { id: 7, nombre: "Usuaria TotalPass", clases: 1, precio: 0 },
  { id: 8, nombre: "Clase de Prueba", clases: 1, precio: 0 },
];

// Función de Inteligencia Financiera (Calcula exacto por clienta)
const calcularFinanzasExactas = () => {
  let ingresosTotales = 0;
  let totalClasesVendidas = 0;
  
  clientes.forEach(cliente => {
    // 1. ¿Cuántas reservas activas tiene?
    const reservasCliente = reservas.filter(r => r.whatsapp === cliente.whatsapp).length;
    // 2. Sumamos sus reservas + los créditos que aún no usa
    const totalClases = (cliente.creditos || 0) + reservasCliente;
    
    if (totalClases > 0) {
      totalClasesVendidas += totalClases;
      let clasesPorCalcular = totalClases;
      
      // Ordenamos paquetes del más grande al más chico (ignorando los de $0)
      const paquetesOrdenados = PAQUETES.filter(p => p.precio > 0).sort((a, b) => b.clases - a.clases);
      
      // 3. Algoritmo: Empaqueta las clases de la clienta al precio exacto
      for (const paquete of paquetesOrdenados) {
        if (clasesPorCalcular >= paquete.clases) {
          const cantidadPaquetes = Math.floor(clasesPorCalcular / paquete.clases);
          ingresosTotales += cantidadPaquetes * paquete.precio;
          clasesPorCalcular -= cantidadPaquetes * paquete.clases;
        }
      }
    }
  });
  
  return { ingresosTotales, totalClasesVendidas };
};

const finanzas = calcularFinanzasExactas();
// --- FIN: CATÁLOGO DE PAQUETES ---
// Memorias para los buscadores
const [busquedaCliente, setBusquedaCliente] = useState("");
const [busquedaReserva, setBusquedaReserva] = useState("");
  const router = useRouter();

  useEffect(() => {
    cargarDatosGenerales();
  }, []);

  const cargarDatosGenerales = async () => {
    // 4. Cargamos la lista de espera
    const { data: dataEspera } = await supabase.from("lista_espera").select("*").order("fecha_solicitud", { ascending: true });
    if (dataEspera) setListaEspera(dataEspera);
    setIsLoading(true);
    
    // Candado VIP
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }

    const { data: perfilValidador } = await supabase
      .from("perfiles")
      .select("rol")
      .eq("id", user.id)
      .single();

    if (perfilValidador?.rol !== "admin") {
      alert("Acceso denegado. Esta zona es exclusiva para administración.");
      router.push("/dashboard");
      return;
    }

    // Cargar datos
    const { data: dataClientes } = await supabase.from("perfiles").select("*").order("nombre", { ascending: true });
    if (dataClientes) setClientes(dataClientes);

    const { data: dataClases } = await supabase.from("clases").select("*");
    if (dataClases) setClases(dataClases);

    const { data: dataReservas } = await supabase.from("reservas").select("*").order("fecha_reserva", { ascending: false });
    if (dataReservas) setReservas(dataReservas);

    setIsLoading(false);
  };

  const modificarCreditos = async (id: string, creditosActuales: number, cambio: number) => {
    const nuevosCreditos = creditosActuales + cambio;
    if (nuevosCreditos < 0) return; 

    const { error } = await supabase.from("perfiles").update({ creditos: nuevosCreditos }).eq("id", id);
    if (error) {
      alert("Hubo un error al actualizar los créditos.");
      return;
    }
    setClientes(clientes.map(c => c.id === id ? { ...c, creditos: nuevosCreditos } : c));
  };

  const crearClase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoNombreClase || !nuevoHorario) {
      alert("Por favor llena el nombre y horario de la clase.");
      return;
    }

    // Candado anti-duplicados manual
    const yaExiste = clases.some(c => c.dia === diaSeleccionado && c.horario === nuevoHorario);
    if (yaExiste) {
      alert(`Bloqueo de seguridad: Ya existe una clase a las ${nuevoHorario} para este día.`);
      return;
    }

    setIsCreandoClase(true);
    const { data, error } = await supabase
      .from("clases")
      .insert([{ nombre: nuevoNombreClase, horario: nuevoHorario, dia: diaSeleccionado, cupo_max: nuevoCupo }])
      .select();

    setIsCreandoClase(false);

    if (error) {
      alert("Error al guardar la clase.");
    } else if (data) {
      setClases([...clases, data[0]]);
      alert("¡Clase agregada con éxito!");
    }
  };

  const eliminarClase = async (id: string) => {
    if (!confirm("¿Segura que deseas eliminar esta clase?")) return;
    const { error } = await supabase.from("clases").delete().eq("id", id);
    if (error) alert("No se pudo eliminar la clase.");
    else setClases(clases.filter(c => String(c.id) !== String(id)));
  };

  const cancelarReserva = async (reserva: any) => {
    const clase = clases.find(c => String(c.id) === String(reserva.clase_id));
    const clienta = clientes.find(c => c.whatsapp === reserva.whatsapp);

    let devuelveCredito = false;

    if (clase) {
      // Calcular horas faltantes para la clase
      const [year, month, day] = clase.dia.split('-');
      const [horaMin, ampm] = clase.horario.split(' ');
      let h = parseInt(horaMin.split(':')[0], 10);
      const m = parseInt(horaMin.split(':')[1], 10);
      if (ampm.toUpperCase() === 'PM' && h !== 12) h += 12;
      if (ampm.toUpperCase() === 'AM' && h === 12) h = 0;
      
      const fechaClase = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), h, m);
      const ahora = new Date();
      const horasFaltantes = (fechaClase.getTime() - ahora.getTime()) / (1000 * 60 * 60);

      // Regla de Oro: Más de 12 horas = Devolución. Menos de 12 horas = Penalización.
      devuelveCredito = horasFaltantes >= 12;
    }

    const mensaje = devuelveCredito 
      ? `¿Cancelar reserva de ${reserva.nombre_cliente}?\n\n⏳ Faltan MÁS de 12 horas para la clase.\n✅ SE LE DEVOLVERÁ 1 crédito automáticamente a su cuenta.` 
      : `¿Cancelar reserva de ${reserva.nombre_cliente}?\n\n⏳ Faltan MENOS de 12 horas (o ya pasó).\n❌ NO se le devolverá el crédito por política de cancelación tardía.`;

    const confirmar = window.confirm(mensaje);
    if (!confirmar) return;

    setIsLoading(true);
    try {
      // 1. Borrar la reserva
      const { error } = await supabase.from("reservas").delete().eq("id", reserva.id);
      if (error) throw error;

      // 2. Devolver crédito SI cumple la regla
      if (devuelveCredito && clienta) {
        const nuevosCreditos = (clienta.creditos || 0) + 1;
        await supabase.from("perfiles").update({ creditos: nuevosCreditos }).eq("id", clienta.id);
        setClientes(clientes.map(c => c.id === clienta.id ? { ...c, creditos: nuevosCreditos } : c));
      }

      setReservas(reservas.filter(r => r.id !== reserva.id));
      alert(`Reserva cancelada con éxito.${devuelveCredito ? " El crédito fue devuelto a la clienta." : " (Sin devolución de crédito)"}`);
    } catch (error) {
      console.error("Error al cancelar reserva:", error);
      alert("Hubo un problema al cancelar la reserva.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- INICIO: FUNCIÓN WHATSAPP 1-CLIC ---
  const abrirWhatsApp = (nombre: string, telefono: string, claseNombre: string, horario: string) => {
    // Limpiamos el teléfono de guiones, espacios o símbolos
    const numeroLimpio = telefono.replace(/\D/g, ''); 
    const mensaje = `¡Hola ${nombre}! Se liberó un lugar para la clase de ${claseNombre} a las ${horario}. ¿Deseas que te reservemos la cama?`;
    const url = `https://wa.me/${numeroLimpio}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };
  // --- FIN: FUNCIÓN WHATSAPP 1-CLIC ---

  // --- INICIO: BOTÓN DE PÁNICO (CANCELAR DÍA COMPLETO) ---
  const ejecutarBotonPanico = async () => {
    const clasesAfectadas = clases.filter(c => c.dia === diaSeleccionado);
    
    if (clasesAfectadas.length === 0) {
      alert(`No hay clases programadas para el ${diaSeleccionado}.`);
      return;
    }

    const confirmar = window.confirm(`🚨 ADVERTENCIA: BOTÓN DE PÁNICO 🚨\n\n¿Estás 100% segura de cancelar TODAS las clases del ${diaSeleccionado}?\n\nEl sistema:\n1. Borrará la agenda del día.\n2. Devolverá automáticamente 1 crédito a cada alumna que ya había reservado.\n\nEsta acción NO se puede deshacer.`);
    if (!confirmar) return;

    setIsLoading(true);

    try {
      const idsClases = clasesAfectadas.map(c => c.id);
      const reservasAfectadas = reservas.filter(r => idsClases.includes(String(r.clase_id)));

      // 1. Devolver créditos automáticamente
      for (const reserva of reservasAfectadas) {
        const clienta = clientes.find(c => c.whatsapp === reserva.whatsapp);
        if (clienta) {
          const nuevosCreditos = (clienta.creditos || 0) + 1;
          await supabase.from("perfiles").update({ creditos: nuevosCreditos }).eq("id", clienta.id);
        }
      }

      // 2. Borrar reservas de las clases afectadas
      if (idsClases.length > 0) {
        await supabase.from("reservas").delete().in("clase_id", idsClases);
      }

      // 3. Borrar clases del día
      await supabase.from("clases").delete().eq("dia", diaSeleccionado);

      // 4. Refrescar datos
      await cargarDatosGenerales();
      alert(`✅ Pánico resuelto: El día ${diaSeleccionado} ha sido cancelado y los créditos fueron devueltos a las clientas afectadas.`);

    } catch (error) {
      console.error("Error en Botón de Pánico:", error);
      alert("Hubo un error de conexión al intentar cancelar el día.");
    } finally {
      setIsLoading(false);
    }
  };
  // --- FIN: BOTÓN DE PÁNICO ---
  const obtenerInfoClase = (claseId: string) => {
    const clase = clases.find(c => String(c.id) === String(claseId));
    return clase ? `${clase.nombre} - ${clase.horario}` : "Clase no encontrada";
  };

  const convertirAMinutos = (horario: string) => {
    if (!horario) return 0;
    const [horaMin, ampm] = horario.split(' ');
    if (!horaMin || !ampm) return 0;
    const [h, m] = horaMin.split(':');
    let hora = parseInt(h, 10);
    if (ampm.toUpperCase() === 'PM' && hora !== 12) hora += 12;
    if (ampm.toUpperCase() === 'AM' && hora === 12) hora = 0;
    return hora * 60 + parseInt(m, 10);
  };

  const clasesDelDia = clases
    .filter(c => c.dia === diaSeleccionado || c.horario?.includes(diaSeleccionado) || c.nombre?.includes(diaSeleccionado))
    .sort((a, b) => convertirAMinutos(a.horario) - convertirAMinutos(b.horario));

  const contarReservasClase = (claseId: string) => reservas.filter(r => String(r.clase_id) === String(claseId)).length;

  const HORARIOS_FIJOS = [
    { diaNum: 1, nombre: "Pilates Reformer", horario: "07:00 AM" }, { diaNum: 1, nombre: "Pilates Reformer", horario: "08:00 AM" }, { diaNum: 1, nombre: "Pilates Reformer", horario: "09:00 AM" }, { diaNum: 1, nombre: "Pilates Reformer", horario: "10:00 AM" }, { diaNum: 1, nombre: "Pilates Reformer", horario: "11:00 AM" }, { diaNum: 1, nombre: "Pilates Reformer", horario: "05:00 PM" }, { diaNum: 1, nombre: "Pilates Reformer", horario: "06:00 PM" }, { diaNum: 1, nombre: "Pilates Reformer", horario: "07:00 PM" },
    { diaNum: 2, nombre: "Pilates Reformer", horario: "07:00 AM" }, { diaNum: 2, nombre: "Pilates Reformer", horario: "08:00 AM" }, { diaNum: 2, nombre: "Pilates Reformer", horario: "09:00 AM" }, { diaNum: 2, nombre: "Pilates Reformer", horario: "10:00 AM" }, { diaNum: 2, nombre: "Pilates Reformer", horario: "11:00 AM" }, { diaNum: 2, nombre: "Pilates Reformer", horario: "05:00 PM" }, { diaNum: 2, nombre: "Pilates Reformer", horario: "06:00 PM" }, { diaNum: 2, nombre: "Pilates Reformer", horario: "07:00 PM" }, { diaNum: 2, nombre: "Pilates Reformer", horario: "08:00 PM" },
    { diaNum: 3, nombre: "Pilates Reformer", horario: "07:00 AM" }, { diaNum: 3, nombre: "Pilates Reformer", horario: "08:00 AM" }, { diaNum: 3, nombre: "Pilates Reformer", horario: "09:00 AM" }, { diaNum: 3, nombre: "Pilates Reformer", horario: "10:00 AM" }, { diaNum: 3, nombre: "Pilates Reformer", horario: "11:00 AM" }, { diaNum: 3, nombre: "Pilates Reformer", horario: "05:00 PM" }, { diaNum: 3, nombre: "Pilates Reformer", horario: "06:00 PM" }, { diaNum: 3, nombre: "Pilates Reformer", horario: "07:00 PM" },
    { diaNum: 4, nombre: "Pilates Reformer", horario: "07:00 AM" }, { diaNum: 4, nombre: "Pilates Reformer", horario: "08:00 AM" }, { diaNum: 4, nombre: "Pilates Reformer", horario: "09:00 AM" }, { diaNum: 4, nombre: "Pilates Reformer", horario: "10:00 AM" }, { diaNum: 4, nombre: "Pilates Reformer", horario: "11:00 AM" }, { diaNum: 4, nombre: "Pilates Reformer", horario: "05:00 PM" }, { diaNum: 4, nombre: "Pilates Reformer", horario: "06:00 PM" }, { diaNum: 4, nombre: "Pilates Reformer", horario: "07:00 PM" }, { diaNum: 4, nombre: "Pilates Reformer", horario: "08:00 PM" },
    { diaNum: 5, nombre: "Pilates Reformer", horario: "07:00 AM" }, { diaNum: 5, nombre: "Pilates Reformer", horario: "08:00 AM" }, { diaNum: 5, nombre: "Pilates Reformer", horario: "09:00 AM" }, { diaNum: 5, nombre: "Pilates Reformer", horario: "10:00 AM" }, { diaNum: 5, nombre: "Pilates Reformer", horario: "11:00 AM" }, { diaNum: 5, nombre: "Pilates Reformer", horario: "05:00 PM" }, { diaNum: 5, nombre: "Pilates Reformer", horario: "06:00 PM" }, { diaNum: 5, nombre: "Pilates Reformer", horario: "07:00 PM" },
    { diaNum: 6, nombre: "Pilates Reformer", horario: "09:00 AM" }, { diaNum: 6, nombre: "Pilates Reformer", horario: "10:00 AM" }, { diaNum: 6, nombre: "Pilates Reformer", horario: "11:00 AM" },
  ];

  const generarHorariosFijosSemana = async () => {
    setIsLoading(true);
    let clasesCreadas = 0;

    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const fechaIso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const diaSemanaNum = d.getDay();

      const plantillaParaHoy = HORARIOS_FIJOS.filter(h => h.diaNum === diaSemanaNum);

      for (const item of plantillaParaHoy) {
        const yaExiste = clases.some(c => c.dia === fechaIso && c.horario === item.horario);
        if (!yaExiste) {
          const { data, error } = await supabase.from("clases").insert([{ nombre: item.nombre, horario: item.horario, dia: fechaIso, cupo_max: 6 }]).select();
          if (!error && data) clasesCreadas++;
        }
      }
    }
    await cargarDatosGenerales();
    setIsLoading(false);
    if (clasesCreadas > 0) alert(`¡Éxito! Se generaron ${clasesCreadas} clases fijas automáticamente.`);
    else alert("Todos los horarios fijos ya estaban cargados. No se duplicó nada.");
  };
// --- INICIO: LÓGICA DE BUSCADORES Y LIMPIEZA VISUAL ---
  // 1. Filtrar Clientas por nombre o WhatsApp
  const clientesFiltrados = clientes.filter(c => 
    (c.nombre || "").toLowerCase().includes(busquedaCliente.toLowerCase()) || 
    (c.whatsapp || "").includes(busquedaCliente)
  );

  // 2. Limpieza y Búsqueda en Reservas
  const diasValidos = diasCalendario.map(d => d.id); // Solo los 7 días actuales
  const reservasActivasFiltradas = reservas.filter(r => {
    // Busca por nombre o número
    const coincideBusqueda = (r.nombre_cliente || "").toLowerCase().includes(busquedaReserva.toLowerCase()) || (r.whatsapp || "").includes(busquedaReserva);
    // Identifica la clase a la que pertenece
    const clase = clases.find(c => String(c.id) === String(r.clase_id));
    // Si la clase ya pasó (su fecha no está en los 7 días), la oculta visualmente
    const esClaseFutura = clase && diasValidos.includes(clase.dia);
    return coincideBusqueda && esClaseFutura;
  });
  // --- FIN: LÓGICA DE BUSCADORES ---
  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-background text-foreground tracking-widest uppercase text-xs">Cargando panel operativo...</div>;

  return (
    <main className="min-h-screen bg-background text-foreground p-6 md:p-12">
      <div className="max-w-[1200px] mx-auto">
        
        <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <span className="font-serif text-3xl tracking-tight block">Panel de Administración</span>
            <p className="text-muted-foreground font-light text-sm mt-2">Control total del estudio Control Balance</p>
          </div>
        </header>

        {/* TABS */}
        <div className="flex border-b border-border mb-8 overflow-x-auto">
          <button onClick={() => setActiveTab("clientas")} className={`px-6 py-4 text-sm uppercase tracking-widest font-medium transition-colors whitespace-nowrap cursor-pointer ${activeTab === "clientas" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            Clientas y Créditos
          </button>
          <button onClick={() => setActiveTab("reservas")} className={`px-6 py-4 text-sm uppercase tracking-widest font-medium transition-colors whitespace-nowrap cursor-pointer ${activeTab === "reservas" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            Recepción (Reservas)
          </button>
          <button onClick={() => setActiveTab("horarios")} className={`px-6 py-4 text-sm uppercase tracking-widest font-medium transition-colors whitespace-nowrap cursor-pointer ${activeTab === "horarios" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            Gestor de Horarios
          </button>
          <button onClick={() => setActiveTab("finanzas")} className={`px-6 py-4 text-sm uppercase tracking-widest font-medium transition-colors whitespace-nowrap cursor-pointer ${activeTab === "finanzas" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            Finanzas 💰
          </button>
        </div>

        {/* PESTAÑA 1 (CLIENTAS) */}
        {activeTab === "clientas" && (
          <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden animate-in fade-in duration-300">
            {/* BUSCADOR DE CLIENTAS */}
            <div className="p-4 border-b border-border bg-secondary/10 flex items-center">
              <span className="text-xl mr-3">🔍</span>
              <input 
                type="text" 
                placeholder="Buscar por nombre o número de WhatsApp..." 
                value={busquedaCliente}
                onChange={(e) => setBusquedaCliente(e.target.value)}
                className="w-full bg-transparent border-none focus:outline-none text-foreground text-sm font-medium"
              />
            </div>

            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-secondary/30 text-xs uppercase tracking-widest text-muted-foreground">
                  <th className="p-5 font-medium">Nombre de la Clienta</th>
                  <th className="p-5 font-medium text-center">Créditos</th>
                  <th className="p-5 font-medium text-right">Ajustar</th>
                </tr>
              </thead>
              <tbody>
                {clientesFiltrados.map((cliente) => (
                  <tr key={cliente.id} className="border-b border-border last:border-0 hover:bg-secondary/10 transition-colors">
                    <td className="p-5">
                      <p className="font-medium text-lg">{cliente.nombre || "Sin nombre"}</p>
                      <p className="text-xs text-muted-foreground mt-1 tracking-wider">{cliente.whatsapp || "Registrada por email"}</p>
                    </td>
                    <td className="p-5 text-center"><span className="text-3xl font-serif text-primary">{cliente.creditos || 0}</span></td>
                    <td className="p-5 text-right">
                      <div className="flex justify-end gap-3">
                        <button onClick={() => modificarCreditos(cliente.id, cliente.creditos || 0, -1)} className="w-10 h-10 flex items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors text-xl cursor-pointer">-</button>
                        <button onClick={() => modificarCreditos(cliente.id, cliente.creditos || 0, 1)} className="w-10 h-10 flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity text-xl cursor-pointer">+</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {clientesFiltrados.length === 0 && (
                  <tr><td colSpan={3} className="p-10 text-center text-muted-foreground">No se encontraron clientas con esa búsqueda.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* PESTAÑA 2 (RESERVAS) */}
        {activeTab === "reservas" && (
          <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden animate-in fade-in duration-300">
            {/* BUSCADOR DE RESERVAS */}
            <div className="p-4 border-b border-border bg-secondary/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center w-full">
                <span className="text-xl mr-3">🔍</span>
                <input 
                  type="text" 
                  placeholder="Buscar reserva por alumna..." 
                  value={busquedaReserva}
                  onChange={(e) => setBusquedaReserva(e.target.value)}
                  className="w-full bg-transparent border-none focus:outline-none text-foreground text-sm font-medium"
                />
              </div>
              <span className="text-[10px] uppercase tracking-widest text-primary font-bold whitespace-nowrap bg-primary/10 px-3 py-1.5 rounded-full">
                Ocultando Historial Pasado
              </span>
            </div>

            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-secondary/30 text-xs uppercase tracking-widest text-muted-foreground">
                  <th className="p-5 font-medium">Alumna</th>
                  <th className="p-5 font-medium">Clase Reservada</th>
                  <th className="p-5 font-medium text-right">Fecha de Registro</th>
                  <th className="p-5 font-medium text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {reservasActivasFiltradas.map((reserva) => (
                  <tr key={reserva.id} className="border-b border-border last:border-0 hover:bg-secondary/10 transition-colors">
                    <td className="p-5">
                      <p className="font-medium text-lg">{reserva.nombre_cliente}</p>
                      <p className="text-xs text-muted-foreground mt-1 tracking-wider">WA: {reserva.whatsapp}</p>
                    </td>
                    <td className="p-5">
                      <span className="inline-block px-3 py-1 bg-secondary text-secondary-foreground rounded-full text-sm font-medium">
                        {obtenerInfoClase(reserva.clase_id)}
                      </span>
                    </td>
                    <td className="p-5 text-right text-sm text-muted-foreground font-light">
                      {new Date(reserva.fecha_reserva).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-5 text-center">
                      <button onClick={() => cancelarReserva(reserva)} className="text-xs text-red-500 hover:text-red-700 hover:underline px-3 py-1.5 border border-red-200/60 rounded transition-colors cursor-pointer">
                        Cancelar
                      </button>
                    </td>
                  </tr>
                ))}
                {reservasActivasFiltradas.length === 0 && (
                  <tr><td colSpan={4} className="p-10 text-center text-muted-foreground">No hay reservas activas en los próximos días o para esta búsqueda.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* PESTAÑA 3 (HORARIOS) */}
        {activeTab === "horarios" && (
          <div className="space-y-8">
            <div className="flex gap-2 overflow-x-auto pb-2 border-b border-border">
              {diasCalendario.map((dia) => (
                <button key={dia.id} onClick={() => setDiaSeleccionado(dia.id)} className={`min-w-[75px] p-3 rounded-lg text-center transition-all cursor-pointer ${diaSeleccionado === dia.id ? "bg-primary text-primary-foreground shadow-md" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}>
                  <span className="block text-[10px] uppercase tracking-widest">{dia.nombre}</span>
                  <span className="block font-serif text-2xl mt-1">{dia.numero}</span>
                </button>
              ))}
            </div>

            <div className="bg-secondary/30 p-4 rounded-lg border border-border mb-6 mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h4 className="font-medium text-sm text-foreground">¿Generar agenda semanal automática?</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Carga las clases fijas de Liliana para los próximos 7 días con un solo clic.</p>
              </div>
              <button type="button" onClick={generarHorariosFijosSemana} className="bg-primary text-primary-foreground px-5 py-2.5 rounded text-xs font-medium uppercase tracking-widest hover:opacity-90 transition-opacity cursor-pointer whitespace-nowrap">
                ⚡ Cargar Horarios Fijos
              </button>
            </div>

            <div className="grid md:grid-cols-3 gap-8 items-start">
              <div className="bg-card p-6 rounded-lg border border-border shadow-sm md:col-span-1">
                <h3 className="font-serif text-xl mb-4 text-foreground">Agregar Clase para el {diaSeleccionado}</h3>
                <form onSubmit={crearClase} className="flex flex-col gap-4">
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1">Nombre / Nivel</label>
                    <input type="text" value={nuevoNombreClase} onChange={(e) => setNuevoNombreClase(e.target.value)} className="w-full border-b border-border bg-transparent py-2 text-foreground focus:outline-none focus:border-primary text-sm" placeholder="Ej. Pilates Reformer Básico" />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1">Horario</label>
                    <input type="text" value={nuevoHorario} onChange={(e) => setNuevoHorario(e.target.value)} className="w-full border-b border-border bg-transparent py-2 text-foreground focus:outline-none focus:border-primary text-sm" placeholder="Ej. 08:00 AM" />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1">Capacidad Máxima (Camas)</label>
                    <input type="number" value={nuevoCupo} onChange={(e) => setNuevoCupo(parseInt(e.target.value) || 6)} className="w-full border-b border-border bg-transparent py-2 text-foreground focus:outline-none focus:border-primary text-sm font-bold text-primary" />
                  </div>
                  <button type="submit" disabled={isCreandoClase} className="mt-2 bg-primary text-primary-foreground py-3 text-xs uppercase tracking-widest font-medium hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50">
                    {isCreandoClase ? "Guardando..." : `+ Añadir a ${diaSeleccionado}`}
                  </button>
                </form>
              </div>

              <div className="md:col-span-2 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-border pb-4">
                  <h3 className="font-serif text-2xl text-foreground">Clases programadas para el <span className="text-primary italic">{diaSeleccionado}</span></h3>
                  
                  {/* --- BOTÓN DE PÁNICO VISUAL --- */}
                  <button 
                    type="button"
                    onClick={ejecutarBotonPanico}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-xs font-bold uppercase tracking-widest transition-colors shadow-md cursor-pointer"
                  >
                    🚨 Cancelar Todo el Día
                  </button>
                </div>
                {clasesDelDia.length === 0 ? (
                  <div className="bg-card p-10 text-center rounded-lg border border-border text-muted-foreground font-light">
                    No hay clases registradas para esta fecha.
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {clasesDelDia.map((clase) => {
                      const ocupadas = contarReservasClase(clase.id);
                      const maxCamas = clase.cupo_max || 6;
                      const disponibles = maxCamas - ocupadas;
                      const reservasDeEstaClase = reservas.filter(r => String(r.clase_id) === String(clase.id));

                      return (
                        <div key={clase.id} className="bg-card p-6 rounded-lg border border-border shadow-sm flex flex-col gap-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-serif text-2xl text-foreground">{clase.nombre}</h4>
                              <p className="text-sm font-medium text-primary mt-1">{clase.horario}</p>
                              <div className="mt-3 flex items-center gap-2">
                                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${disponibles > 0 ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                                  {ocupadas} / {maxCamas} Camas ocupadas
                                </span>
                                {disponibles > 0 && <span className="text-xs text-muted-foreground">({disponibles} disponibles)</span>}
                              </div>
                            </div>
                            <button onClick={() => eliminarClase(clase.id)} className="text-xs text-red-500 hover:text-red-700 hover:underline cursor-pointer px-3 py-2 border border-red-200 rounded transition-colors">
                              Eliminar
                            </button>
                          </div>
                          {reservasDeEstaClase.length > 0 && (
                            <div className="pt-4 border-t border-border">
                              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Alumnas Registradas:</p>
                              {/* Grid de 1 columna en celular y 2 en computadora */}
                              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {reservasDeEstaClase.map(reserva => (
                                  <li key={reserva.id} className="flex items-center gap-3 bg-secondary/5 p-3 rounded-lg border border-border/50 hover:border-primary/40 transition-colors shadow-sm">
                                    {/* Avatar con la inicial del nombre */}
                                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 uppercase">
                                      {(reserva.nombre_cliente || "A").charAt(0)}
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                      <p className="text-sm font-semibold text-foreground truncate">{reserva.nombre_cliente}</p>
                                      <p className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">
                                        WA: {reserva.whatsapp}
                                      </p>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* --- INICIO: LISTA DE ESPERA Y WHATSAPP 1-CLIC --- */}
                          {(() => {
                            const enEspera = listaEspera.filter(e => String(e.clase_id) === String(clase.id));
                            if (enEspera.length === 0) return null;
                            return (
                              <div className="pt-4 border-t border-border">
                                <p className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-3 flex items-center gap-2">
                                  ⏳ Fila de Espera ({enEspera.length})
                                </p>
                                <ul className="space-y-2">
                                  {enEspera.map(espera => (
                                    <li key={espera.id} className="text-sm flex justify-between items-center text-foreground bg-amber-500/10 px-3 py-2 rounded border border-amber-500/20">
                                      <div>
                                        <span className="font-medium block">{espera.nombre_cliente}</span>
                                        <span className="text-xs text-muted-foreground font-mono">{espera.whatsapp}</span>
                                      </div>
                                      <button 
                                        type="button"
                                        onClick={() => abrirWhatsApp(espera.nombre_cliente, espera.whatsapp, clase.nombre, clase.horario)}
                                        className="bg-[#25D366] hover:bg-[#1ebd5a] text-white px-3 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
                                      >
                                        WhatsApp
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            );
                          })()}
                          {/* --- FIN: LISTA DE ESPERA Y WHATSAPP 1-CLIC --- */}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {/* PESTAÑA 4 (FINANZAS) */}
        {activeTab === "finanzas" && (
          <div className="space-y-6 animate-in fade-in zoom-in duration-500">
            
            <div className="grid md:grid-cols-3 gap-6">
              {/* Tarjeta 1: Total de Reservas */}
              <div className="bg-card p-8 rounded-lg border border-border shadow-sm flex flex-col justify-center items-center text-center">
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4">Reservas Activas</p>
                <span className="text-6xl font-serif text-foreground">{reservas.length}</span>
                <p className="text-[10px] text-muted-foreground mt-4 uppercase">Camas apartadas hoy</p>
              </div>

              {/* Tarjeta 2: Clases Vendidas (Créditos + Reservas) */}
              <div className="bg-card p-8 rounded-lg border border-border shadow-sm flex flex-col justify-center items-center text-center">
                <p className="text-xs uppercase tracking-widest text-muted-foreground mb-4">Total Clases Vendidas</p>
                <span className="text-6xl font-serif text-primary">{finanzas.totalClasesVendidas}</span>
                <p className="text-[10px] text-muted-foreground mt-4 uppercase">Créditos en bolsa + Reservas</p>
              </div>

              {/* Tarjeta 3: Ingresos Exactos Calculados */}
              <div className="bg-primary p-8 rounded-lg shadow-lg flex flex-col justify-center items-center text-center text-primary-foreground transform transition-all hover:scale-105">
                <p className="text-xs uppercase tracking-widest text-primary-foreground/80 mb-4">Ingresos Generados</p>
                <span className="text-6xl font-serif">${finanzas.ingresosTotales.toLocaleString('es-MX')}</span>
                <p className="text-[10px] text-primary-foreground/70 mt-4 uppercase">Cálculo algorítmico exacto</p>
              </div>
            </div>

            {/* Explicación del Algoritmo */}
            <div className="bg-secondary/30 p-6 rounded-lg border border-border">
              <h4 className="font-serif text-xl mb-2 text-foreground">¿Cómo funciona la Inteligencia Financiera?</h4>
              <p className="text-sm text-muted-foreground">
                El sistema escanea el perfil de <b>cada una de tus clientas</b>. Suma sus créditos disponibles más sus reservas. Luego, empaqueta automáticamente sus clases usando tu lista de precios. Por ejemplo: Si Ana tiene 7 clases en total, el sistema calcula <b>7 x $240 (Clase Suelta)</b>. Pero si Sofía tiene 8 clases, el sistema aplica automáticamente el precio de <b>$1,050 (Paquete 8)</b>. Esto te da el valor real y exacto del dinero que has generado.
              </p>
            </div>

            {/* --- NUEVA SECCIÓN: LISTA DE PAQUETES --- */}
            <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
              <div className="p-5 border-b border-border bg-secondary/20">
                <h4 className="font-serif text-lg text-foreground">Tus Paquetes y Precios</h4>
                <p className="text-xs text-muted-foreground">La calculadora usa estos precios reales para hacer el algoritmo financiero.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase tracking-widest text-muted-foreground">
                      <th className="p-4 font-medium">Paquete</th>
                      <th className="p-4 font-medium text-center">Créditos</th>
                      <th className="p-4 font-medium text-right">Precio Total</th>
                      <th className="p-4 font-medium text-right">Costo x Clase</th>
                    </tr>
                  </thead>
                  <tbody>
                    {PAQUETES.map((paquete) => (
                      <tr key={paquete.id} className="border-b border-border last:border-0 hover:bg-secondary/10 transition-colors">
                        <td className="p-4 font-medium">{paquete.nombre}</td>
                        <td className="p-4 text-center">
                          <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-bold">{paquete.clases}</span>
                        </td>
                        <td className="p-4 text-right font-medium">
                          {paquete.precio === 0 ? "GRATIS" : `$${paquete.precio.toLocaleString('es-MX')}`}
                        </td>
                        <td className="p-4 text-right text-muted-foreground">
                          {paquete.precio === 0 ? "-" : `$${Math.round(paquete.precio / paquete.clases)}`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
          </div>
        )}
      </div>
    </main>
  );
}