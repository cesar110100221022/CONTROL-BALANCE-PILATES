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
  { id: 2, nombre: "Paquete de 8 clases", clases: 8, precio: 1200 },
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
const [filtroCeroCreditos, setFiltroCeroCreditos] = useState(false); // <-- AGREGAR ESTO
  const router = useRouter();

  // --- INICIO: MÓDULO FINANCIERO (ESTADOS Y FUNCIÓN) ---
  const [isVentaModalOpen, setIsVentaModalOpen] = useState(false);
  const [clienteVenta, setClienteVenta] = useState<any>(null);
  const [paqueteSeleccionado, setPaqueteSeleccionado] = useState(PAQUETES[1]); // Por defecto Paquete de 8
  const [metodoPago, setMetodoPago] = useState("Transferencia");
  const [estatusPago, setEstatusPago] = useState("Pagado");
  const [isProcesandoVenta, setIsProcesandoVenta] = useState(false);
  const [deudas, setDeudas] = useState<any[]>([]); // MEMORIA DE DEUDAS

  const saldarDeuda = async (deudaId: string, nombre: string) => {
    if (!confirm(`¿Confirmas que ${nombre} ya te transfirió/pagó el paquete?`)) return;
    setIsLoading(true);
    try {
      await supabase.from("transacciones").update({ estatus_pago: "Pagado" }).eq("id", deudaId);
      setDeudas(deudas.filter(d => d.id !== deudaId));
      alert("¡Deuda saldada con éxito! El dinero ya está en la cuenta.");
    } catch (error) {
      alert("Error al actualizar el pago.");
    } finally {
      setIsLoading(false);
    }
  };

  const procesarVenta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteVenta) return;
    setIsProcesandoVenta(true);

    try {
      // 1. Guardar el recibo exacto en la bóveda (Con .select() para guardarlo en memoria)
      const { data: nuevaTx, error: errorTx } = await supabase.from("transacciones").insert([{
        cliente_nombre: clienteVenta.nombre || "Sin nombre",
        cliente_whatsapp: clienteVenta.whatsapp || "Sin número",
        paquete_comprado: paqueteSeleccionado.nombre,
        monto_mxn: paqueteSeleccionado.precio,
        metodo_pago: metodoPago,
        estatus_pago: estatusPago
      }]).select();

      if (errorTx) throw errorTx;

      // 1.5 Si vendió fiado, se agrega a la lista de deudas al instante
      if (estatusPago === "Pendiente" && nuevaTx) {
        setDeudas(prev => [...prev, nuevaTx[0]]);
      }

      // 2. Sumarle los créditos automáticamente
      const nuevosCreditos = (clienteVenta.creditos || 0) + paqueteSeleccionado.clases;
      const { error: errorCreditos } = await supabase
        .from("perfiles")
        .update({ creditos: nuevosCreditos })
        .eq("id", clienteVenta.id);

      if (errorCreditos) throw errorCreditos;

      // 3. Actualizar la pantalla sin recargar la página
      setClientes(clientes.map(c => c.id === clienteVenta.id ? { ...c, creditos: nuevosCreditos } : c));
      
      alert(`✅ ¡Venta registrada exitosamente!\nSe sumaron ${paqueteSeleccionado.clases} créditos a ${clienteVenta.nombre}.`);
      setIsVentaModalOpen(false);
    } catch (error) {
      console.error("Error en la venta:", error);
      alert("Hubo un error al procesar la venta. Revisa la conexión.");
    } finally {
      setIsProcesandoVenta(false);
    }
  };
  // --- FIN: MÓDULO FINANCIERO ---
// --- INICIO: BOTÓN CONCIERGE (AGENDAR MANUAL) ---
const [isConciergeOpen, setIsConciergeOpen] = useState(false);
const [claseConciergeId, setClaseConciergeId] = useState<string | null>(null);

// Estados para Modo Existente
const [clienteConciergeId, setClienteConciergeId] = useState("");

// Estados para Modo Invitada
const [tipoConcierge, setTipoConcierge] = useState("existente"); // "existente" | "nueva"
const [nuevoNombreConcierge, setNuevoNombreConcierge] = useState("");
const [nuevoWhatsappConcierge, setNuevoWhatsappConcierge] = useState("");

const ejecutarConcierge = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!claseConciergeId) return;
  setIsLoading(true);

  try {
    if (tipoConcierge === "existente") {
      if (!clienteConciergeId) { setIsLoading(false); return; }
      const clienta = clientes.find(c => c.id === clienteConciergeId);
      if (!clienta) { setIsLoading(false); return; }

      if ((clienta.creditos || 0) <= 0) {
        const forzar = confirm(`⚠️ ${clienta.nombre} NO tiene créditos. ¿Deseas agendarla de todos modos y que su saldo quede en números rojos?`);
        if (!forzar) { setIsLoading(false); return; }
      }

      const nuevosCreditos = (clienta.creditos || 0) - 1;
      await supabase.from("perfiles").update({ creditos: nuevosCreditos }).eq("id", clienta.id);
      
      const { data: nuevaReserva, error } = await supabase.from("reservas").insert([{
        nombre_cliente: clienta.nombre,
        whatsapp: clienta.whatsapp,
        clase_id: claseConciergeId
      }]).select();

      if (error) throw error;
      setClientes(clientes.map(c => c.id === clienta.id ? { ...c, creditos: nuevosCreditos } : c));
      if (nuevaReserva) setReservas([nuevaReserva[0], ...reservas]);
      
      alert(`🛎️ ¡Servicio VIP exitoso! ${clienta.nombre} fue agregada.`);
    } else {
      // MODO INVITADA (No tiene cuenta de créditos)
      if (!nuevoNombreConcierge || !nuevoWhatsappConcierge) {
        alert("Por favor llena el nombre y WhatsApp de la invitada.");
        setIsLoading(false); return;
      }

      const { data: nuevaReserva, error } = await supabase.from("reservas").insert([{
        nombre_cliente: nuevoNombreConcierge + " (Invitada)",
        whatsapp: nuevoWhatsappConcierge,
        clase_id: claseConciergeId
      }]).select();

      if (error) throw error;
      if (nuevaReserva) setReservas([nuevaReserva[0], ...reservas]);
      
      alert(`🛎️ ¡Invitada registrada! ${nuevoNombreConcierge} ocupará la cama. (Recuerda cobrarle en el estudio o enviarle link de pago).`);
    }

    setIsConciergeOpen(false);
    setClienteConciergeId("");
    setNuevoNombreConcierge("");
    setNuevoWhatsappConcierge("");
    setTipoConcierge("existente");
  } catch (error) {
    alert("Error al agendar manualmente.");
  } finally {
    setIsLoading(false);
  }
};
// --- FIN: BOTÓN CONCIERGE ---
// --- INICIO: GESTOR DE LISTA DE ESPERA ---
const [isListaEsperaOpen, setIsListaEsperaOpen] = useState(false);
const [personasEnEspera, setPersonasEnEspera] = useState<any[]>([]);
const [claseEsperaInfo, setClaseEsperaInfo] = useState<any>(null);

const abrirListaEspera = async (clase: any) => {
  setIsLoading(true);
  try {
    // Buscamos quién está formado para esta clase específica
    const { data, error } = await supabase.from("lista_espera").select("*").eq("clase_id", clase.id).order("created_at", { ascending: true });
    if (error) throw error;
    
    setPersonasEnEspera(data || []);
    setClaseEsperaInfo(clase);
    setIsListaEsperaOpen(true);
  } catch (error) {
    alert("Error al cargar la lista de espera.");
  } finally {
    setIsLoading(false);
  }
};

const quitarDeLista = async (id: string) => {
  try {
    await supabase.from("lista_espera").delete().eq("id", id);
    setPersonasEnEspera(personasEnEspera.filter(p => p.id !== id));
  } catch (error) {
    console.error("Error al borrar de la lista");
  }
};
// --- FIN: GESTOR DE LISTA DE ESPERA ---
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

    // BÚSQUEDA DE DEUDORAS FINANCIERAS
    const { data: dataDeudas } = await supabase.from("transacciones").select("*").eq("estatus_pago", "Pendiente");
    if (dataDeudas) setDeudas(dataDeudas);

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
// --- INICIO: SISTEMA DE REFERIDOS ---
const premiarReferido = async (whatsappReferente: string, clientaId: string, nombreClienta: string) => {
  const mensajeAntifraude = `🚨 ALTO: PREVENCIÓN DE FRAUDE 🚨\n\n¿Estás 100% segura de que ${nombreClienta} ya PAGÓ su primer paquete de clases?\n\n⚠️ REGLA: NUNCA des este premio si la persona solo vino a su clase de prueba gratis o si aún no hace la transferencia.\n\nSi ya tienes el dinero en tu cuenta, haz clic en Aceptar para darle 1 clase gratis a su amiga.`;
  
  if (!confirm(mensajeAntifraude)) return;

  setIsLoading(true);
  try {
    // 1. Buscar a la clienta que hizo la invitación
    const { data: referente } = await supabase.from("perfiles").select("*").eq("whatsapp", whatsappReferente).single();

    if (!referente) {
      alert("No se encontró a ninguna clienta con ese número de WhatsApp. Tal vez lo escribió mal.");
      setIsLoading(false);
      return;
    }

    // 2. Sumarle el crédito a la que invitó
    const nuevosCreditos = (referente.creditos || 0) + 1;
    await supabase.from("perfiles").update({ creditos: nuevosCreditos }).eq("id", referente.id);

    // 3. Marcar a la clienta nueva como "Ya premiada" para no dar el bono 2 veces
    const marcaPremiado = `¡PREMIADO! (${whatsappReferente})`;
    await supabase.from("perfiles").update({ referido_por: marcaPremiado }).eq("id", clientaId);

    // 4. Actualizar la pantalla de Liliana
    setClientes(clientes.map(c => {
      if (c.id === referente.id) return { ...c, creditos: nuevosCreditos };
      if (c.id === clientaId) return { ...c, referido_por: marcaPremiado };
      return c;
    }));

    alert(`¡Éxito! Se le regaló 1 crédito automáticamente a ${referente.nombre}.`);
  } catch (error) {
    alert("Hubo un error al procesar el premio.");
  } finally {
    setIsLoading(false);
  }
};
// --- FIN: SISTEMA DE REFERIDOS ---
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
  // --- INICIO: CONTROL DE LISTA DE ESPERA ---
  const promoverListaEspera = async (espera: any, claseId: string) => {
    if (!confirm(`¿Estás segura de agendar a ${espera.nombre_cliente} en esta clase?\n\nAl confirmar, se le restará 1 crédito y pasará a ser una reserva oficial.`)) return;

    setIsLoading(true);
    try {
      // 1. Buscar a la clienta para restarle el crédito
      const clienta = clientes.find(c => c.whatsapp === espera.whatsapp);
      
      if (clienta) {
        if (clienta.creditos <= 0) {
          const forzar = confirm(`⚠️ ${clienta.nombre} NO tiene créditos. ¿Quieres agendarla de todos modos y que su saldo quede en números rojos?`);
          if (!forzar) {
            setIsLoading(false);
            return;
          }
        }
        
        // Restar crédito
        const nuevosCreditos = (clienta.creditos || 0) - 1;
        await supabase.from("perfiles").update({ creditos: nuevosCreditos }).eq("id", clienta.id);
        setClientes(clientes.map(c => c.id === clienta.id ? { ...c, creditos: nuevosCreditos } : c));
      }

      // 2. Crear la reserva
      const { data: nuevaReserva, error: errorReserva } = await supabase.from("reservas").insert([{
        nombre_cliente: espera.nombre_cliente,
        whatsapp: espera.whatsapp,
        clase_id: claseId
      }]).select();

      if (errorReserva) throw errorReserva;
      if (nuevaReserva) setReservas([nuevaReserva[0], ...reservas]);

      // 3. Borrar de lista de espera
      await supabase.from("lista_espera").delete().eq("id", espera.id);
      setListaEspera(listaEspera.filter(e => e.id !== espera.id));

      alert(`¡Listo! ${espera.nombre_cliente} ha sido agendada con éxito.`);
    } catch (error) {
      console.error("Error al promover:", error);
      alert("Hubo un error al agendar a la clienta.");
    } finally {
      setIsLoading(false);
    }
  };

  const descartarListaEspera = async (esperaId: string, nombre: string) => {
    if (!confirm(`¿Deseas descartar a ${nombre} de la fila?\nSimplemente desaparecerá de la lista y NO se le cobrará ningún crédito.`)) return;
    
    setIsLoading(true);
    try {
      await supabase.from("lista_espera").delete().eq("id", esperaId);
      setListaEspera(listaEspera.filter(e => e.id !== esperaId));
    } catch (error) {
      alert("Error al limpiar la lista.");
    } finally {
      setIsLoading(false);
    }
  };
  // --- FIN: CONTROL DE LISTA DE ESPERA ---

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
    const partes = horario.trim().split(' ');
    if (partes.length < 2) return 0;
    
    const [horaMin, ampm] = [partes[0], partes[1]];
    const [h, m] = horaMin.split(':');
    
    let hora = parseInt(h, 10);
    let minutos = m ? parseInt(m, 10) : 0; // Evita el error "NaN" si no escriben los minutos
    
    if (isNaN(hora)) hora = 0;
    if (isNaN(minutos)) minutos = 0;
    
    if (ampm.toUpperCase() === 'PM' && hora !== 12) hora += 12;
    if (ampm.toUpperCase() === 'AM' && hora === 12) hora = 0;
    
    return hora * 60 + minutos;
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
  // 1. Filtrar Clientas por nombre, WhatsApp y Filtro de 0 Créditos
  const clientesFiltrados = clientes.filter(c => {
    const coincideBusqueda = (c.nombre || "").toLowerCase().includes(busquedaCliente.toLowerCase()) || 
                             (c.whatsapp || "").includes(busquedaCliente);
    
    // Si el filtro está activo, solo mostramos las que tienen 0 créditos
    const creditosActuales = c.creditos || 0;
    const coincideFiltro = filtroCeroCreditos ? creditosActuales <= 0 : true;
    
    return coincideBusqueda && coincideFiltro;
  });

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
            {/* BUSCADOR DE CLIENTAS Y FILTRO DE COBRANZA */}
            <div className="p-4 border-b border-border bg-secondary/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex items-center w-full">
                <span className="text-xl mr-3">🔍</span>
                <input 
                  type="text" 
                  placeholder="Buscar por nombre o número..." 
                  value={busquedaCliente}
                  onChange={(e) => setBusquedaCliente(e.target.value)}
                  className="w-full bg-transparent border-none focus:outline-none text-foreground text-sm font-medium"
                />
              </div>
              <div className="flex gap-2 w-full sm:w-auto">

                <button 
                  onClick={() => setFiltroCeroCreditos(!filtroCeroCreditos)}
                  className={`whitespace-nowrap px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-colors shadow-sm cursor-pointer border ${filtroCeroCreditos ? 'bg-red-100 text-red-700 border-red-200' : 'bg-card text-muted-foreground border-border hover:bg-secondary/50'}`}
                >
                  {filtroCeroCreditos ? "🚨 0 Créditos" : "⚠️ 0 Créditos"}
                </button>
              </div>
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
                {clientesFiltrados.map((cliente) => {
                  // --- INICIO: LÓGICA DE DETECCIÓN AISLADA ---
                  const totalReservasHistoricas = reservas.filter(r => r.whatsapp === cliente.whatsapp).length;
                  const esTotalmenteNueva = (cliente.creditos || 0) === 0 && totalReservasHistoricas === 0;
                  // --- FIN: LÓGICA ---

                  return (
                  <tr key={cliente.id} className="border-b border-border last:border-0 hover:bg-secondary/10 transition-colors">
                  <td className="p-5">
                    <p className="font-medium text-lg">{cliente.nombre || "Sin nombre"}</p>
                    <p className="text-xs text-muted-foreground mt-1 tracking-wider">{cliente.whatsapp || "Registrada por email"}</p>
                    
                    {/* ETIQUETA VISUAL DE CLASE DE PRUEBA */}
                    {esTotalmenteNueva && (
                      <span className="inline-block mt-2 bg-emerald-100 text-emerald-800 text-[10px] uppercase tracking-widest font-bold px-2.5 py-1 rounded border border-emerald-200 shadow-sm">
                        🌱 Nueva: Dar Clase de Prueba
                      </span>
                    )}

                    {/* --- INICIO: CONTROL DE DEUDORAS --- */}
                    {(() => {
                      const deuda = deudas.find(d => d.cliente_whatsapp === cliente.whatsapp);
                      if (!deuda) return null;
                      
                      const mensajeCobro = `¡Hola ${cliente.nombre}! Te escribo de Control Balance para recordarte amablemente que tienes un pago pendiente de $${deuda.monto_mxn} por tu ${deuda.paquete_comprado}. Cuando te sea posible, ¿me apoyarías con el comprobante? ¡Mil gracias!`;
                      const linkWA = `https://wa.me/${(cliente.whatsapp || "").replace(/\D/g, '')}?text=${encodeURIComponent(mensajeCobro)}`;

                      return (
                        <div className="mt-3 flex flex-col items-start gap-2 bg-red-50 p-2.5 rounded border border-red-200 shadow-sm">
                          <span className="text-[10px] uppercase tracking-widest font-bold text-red-700">
                            🚨 ADEUDO: ${deuda.monto_mxn} ({deuda.paquete_comprado})
                          </span>
                          <div className="flex gap-2">
                            <a href={linkWA} target="_blank" rel="noreferrer" className="bg-[#25D366] text-white px-2.5 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider hover:bg-[#1ebd5a] transition-colors shadow-sm cursor-pointer">
                              💬 Cobrar x WA
                            </a>
                            <button onClick={() => saldarDeuda(deuda.id, cliente.nombre)} className="bg-white text-red-600 border border-red-200 px-2.5 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider hover:bg-red-50 transition-colors shadow-sm cursor-pointer">
                              ✅ Marcar Pagado
                            </button>
                          </div>
                        </div>
                      );
                    })()}
                    {/* --- FIN: CONTROL DE DEUDORAS --- */}
                    
                    {/* --- AVISO DE REFERIDO --- */}
                    {cliente.referido_por && !cliente.referido_por.includes("PREMIADO") && (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="bg-amber-100 text-amber-800 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded border border-amber-200">
                          🎁 Invitada por: {cliente.referido_por}
                        </span>
                        <div className="flex flex-col items-center gap-1">
                          <button onClick={() => premiarReferido(cliente.referido_por, cliente.id, cliente.nombre)} className="bg-amber-500 text-white text-[10px] uppercase tracking-wider font-bold px-3 py-1.5 rounded hover:bg-amber-600 transition-colors cursor-pointer shadow-sm">
                            ✅ Aprobar Premio
                          </button>
                          <span className="text-[8px] uppercase tracking-widest text-muted-foreground text-center">
                            *Cobra antes de premiar
                          </span>
                        </div>
                      </div>
                    )}
                    {cliente.referido_por?.includes("PREMIADO") && (
                      <span className="inline-block mt-3 text-[10px] uppercase tracking-wider text-emerald-600 font-bold">
                        ✅ Bono de invitación entregado
                      </span>
                    )}
                    {/* --- FIN AVISO --- */}

                  </td>
                  <td className="p-5 text-center"><span className="text-3xl font-serif text-primary">{cliente.creditos || 0}</span></td>
                    <td className="p-5 text-right">
                      <div className="flex justify-end items-center gap-2">
                        {/* BOTÓN PRINCIPAL DE VENTAS */}
                        <button 
                          onClick={() => { setClienteVenta(cliente); setIsVentaModalOpen(true); }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded text-[10px] font-bold uppercase tracking-widest transition-colors shadow-sm cursor-pointer whitespace-nowrap"
                        >
                          💰 Vender
                        </button>
                        
                        {/* AJUSTE MANUAL SECUNDARIO */}
                        <div className="flex bg-secondary/20 rounded border border-border">
                          <button onClick={() => modificarCreditos(cliente.id, cliente.creditos || 0, -1)} className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors text-lg cursor-pointer" title="Restar crédito manual">-</button>
                          <button onClick={() => modificarCreditos(cliente.id, cliente.creditos || 0, 1)} className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors text-lg cursor-pointer" title="Sumar crédito manual">+</button>
                          </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
              
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
                      {(() => {
                        const claseAsignada = clases.find(c => String(c.id) === String(reserva.clase_id));
                        
                        // Formateador seguro de fecha (Evita saltos de zona horaria)
                        let fechaFormateada = "Día pendiente";
                        if (claseAsignada?.dia) {
                          const [year, month, day] = claseAsignada.dia.split('-');
                          const fechaObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                          fechaFormateada = fechaObj.toLocaleDateString('es-MX', { 
                            weekday: 'long', 
                            day: '2-digit', 
                            month: '2-digit', 
                            year: 'numeric' 
                          });
                        }
                        
                        return (
                          <div className="flex flex-col gap-1.5">
                            <span className="font-serif font-bold text-slate-800 text-sm md:text-base">
                              {claseAsignada?.nombre || "Clase Eliminada/No encontrada"}
                            </span>
                            
                            <div className="flex flex-wrap items-center gap-2 text-[10px] md:text-xs">
                              <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-medium border border-amber-200 shadow-sm capitalize">
                                📅 {fechaFormateada}
                              </span>
                              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded font-medium border border-primary/20 shadow-sm">
                                ⏰ {claseAsignada?.horario || "Horario pendiente"}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
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
                            <div className="flex flex-col gap-2 items-end">
                              <button 
                                onClick={() => abrirListaEspera(clase)} 
                                className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 px-3 py-2 rounded text-[10px] font-bold uppercase tracking-widest transition-colors shadow-sm cursor-pointer whitespace-nowrap"
                              >
                                📢 Ver Fila de Espera
                              </button>
                              <button 
                                onClick={() => { setClaseConciergeId(clase.id); setIsConciergeOpen(true); }} 
                                className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-2 rounded text-[10px] font-bold uppercase tracking-widest transition-colors shadow-sm cursor-pointer whitespace-nowrap"
                              >
                                🛎️ Agendar VIP
                              </button>
                              <button onClick={() => eliminarClase(clase.id)} className="text-[10px] text-red-500 hover:text-red-700 hover:underline cursor-pointer px-2 py-1 border border-red-200/50 rounded transition-colors">
                                Eliminar Clase
                              </button>
                            </div>
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
                                    <li key={espera.id} className="text-sm flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 text-foreground bg-amber-500/10 px-3 py-3 rounded border border-amber-500/20">
                                    <div>
                                      <span className="font-medium block">{espera.nombre_cliente}</span>
                                      <span className="text-xs text-muted-foreground font-mono">{espera.whatsapp}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      <button 
                                        type="button"
                                        onClick={() => abrirWhatsApp(espera.nombre_cliente, espera.whatsapp, clase.nombre, clase.horario)}
                                        className="bg-[#25D366] hover:bg-[#1ebd5a] text-white px-2.5 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
                                        title="Preguntar por WhatsApp"
                                      >
                                        💬 WA
                                      </button>
                                      <button 
                                        type="button"
                                        onClick={() => promoverListaEspera(espera, clase.id)}
                                        className="bg-primary hover:opacity-90 text-primary-foreground px-2.5 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
                                        title="Agendar en la clase y cobrar crédito"
                                      >
                                        ✅ Agendar
                                      </button>
                                      <button 
                                        type="button"
                                        onClick={() => descartarListaEspera(espera.id, espera.nombre_cliente)}
                                        className="bg-card hover:bg-red-50 border border-red-200 text-red-600 px-2.5 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                                        title="Sacar de la lista sin cobrar"
                                      >
                                        ❌
                                      </button>
                                    </div>
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

      {/* --- INICIO: MODAL DE VENTAS --- */}
      {isVentaModalOpen && clienteVenta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in p-4">
          <div className="bg-card w-full max-w-md rounded-xl shadow-2xl border border-border overflow-hidden">
            
            <div className="bg-secondary/30 p-5 border-b border-border flex justify-between items-center">
              <h3 className="font-serif text-xl">Vender a <span className="text-primary italic">{clienteVenta.nombre}</span></h3>
              <button onClick={() => setIsVentaModalOpen(false)} className="text-muted-foreground hover:text-foreground text-xl cursor-pointer">✕</button>
            </div>
            
            <form onSubmit={procesarVenta} className="p-6 space-y-5">
              <div>
                <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">Paquete a vender</label>
                <select 
                  className="w-full border border-border rounded-lg bg-background p-3 text-sm focus:outline-none focus:border-primary"
                  onChange={(e) => setPaqueteSeleccionado(PAQUETES.find(p => p.id === parseInt(e.target.value)) || PAQUETES[1])}
                >
                  {PAQUETES.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre} - ${p.precio.toLocaleString('es-MX')}</option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">Método de pago</label>
                  <select 
                    value={metodoPago}
                    onChange={(e) => setMetodoPago(e.target.value)}
                    className="w-full border border-border rounded-lg bg-background p-3 text-sm focus:outline-none focus:border-primary"
                  >
                    <option value="Transferencia">Transferencia</option>
                    <option value="Efectivo">Efectivo</option>
                    <option value="TotalPass">TotalPass</option>
                    <option value="Cortesía">Cortesía</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">Estatus</label>
                  <select 
                    value={estatusPago}
                    onChange={(e) => setEstatusPago(e.target.value)}
                    className={`w-full border rounded-lg bg-background p-3 text-sm focus:outline-none focus:border-primary font-bold ${estatusPago === "Pagado" ? "text-emerald-600 border-emerald-200" : "text-amber-600 border-amber-200"}`}
                  >
                    <option value="Pagado">✅ Pagado</option>
                    <option value="Pendiente">⏳ Pendiente</option>
                  </select>
                </div>
              </div>
              
              <div className="pt-4 mt-6 border-t border-border flex justify-end gap-3">
                <button type="button" onClick={() => setIsVentaModalOpen(false)} className="px-5 py-2.5 rounded text-xs uppercase tracking-widest font-medium text-muted-foreground hover:bg-secondary transition-colors cursor-pointer">Cancelar</button>
                <button type="submit" disabled={isProcesandoVenta} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded text-xs uppercase tracking-widest font-bold shadow-md transition-colors disabled:opacity-50 cursor-pointer">
                  {isProcesandoVenta ? "Guardando..." : "💰 Confirmar Venta"}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
      {/* --- FIN: MODAL DE VENTAS --- */}
{/* --- INICIO: MODAL CONCIERGE --- */}
{isConciergeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in p-4">
          <div className="bg-card w-full max-w-md rounded-xl shadow-2xl border border-border overflow-hidden">
            <div className="bg-amber-500/10 p-5 border-b border-amber-500/20 flex justify-between items-center">
              <h3 className="font-serif text-xl text-amber-700">🛎️ Servicio Concierge VIP</h3>
              <button onClick={() => setIsConciergeOpen(false)} className="text-muted-foreground hover:text-foreground text-xl cursor-pointer">✕</button>
            </div>
            <form onSubmit={ejecutarConcierge} className="p-6 space-y-5">
              {/* TABS DE SELECCIÓN */}
              <div className="flex bg-secondary/30 rounded-lg p-1 border border-border">
                <button type="button" onClick={() => setTipoConcierge("existente")} className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer ${tipoConcierge === "existente" ? "bg-card shadow text-amber-700" : "text-muted-foreground hover:text-foreground"}`}>Ya es Clienta</button>
                <button type="button" onClick={() => setTipoConcierge("nueva")} className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-md transition-colors cursor-pointer ${tipoConcierge === "nueva" ? "bg-card shadow text-amber-700" : "text-muted-foreground hover:text-foreground"}`}>Nueva (Invitada)</button>
              </div>

              {tipoConcierge === "existente" ? (
                <div>
                  <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-2">Selecciona a la Alumna</label>
                  <select 
                    value={clienteConciergeId}
                    onChange={(e) => setClienteConciergeId(e.target.value)}
                    className="w-full border border-border rounded-lg bg-background p-3 text-sm focus:outline-none focus:border-amber-500"
                    required={tipoConcierge === "existente"}
                  >
                    <option value="">-- Buscar clienta en el sistema --</option>
                    {clientes.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre} ({c.creditos || 0} créditos)</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-4 animate-in fade-in zoom-in duration-200">
                  <div className="bg-amber-500/10 p-3 rounded border border-amber-500/20 text-xs text-amber-700 mb-2 leading-relaxed">
                    Agendarás a alguien que no usa la plataforma. Se apartará su cama, pero <b>no tendrá cuenta de créditos</b>. Deberás cobrarle manualmente.
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1">Nombre de la Invitada</label>
                    <input type="text" value={nuevoNombreConcierge} onChange={e => setNuevoNombreConcierge(e.target.value)} className="w-full border-b border-border bg-transparent py-2 text-foreground focus:outline-none focus:border-amber-500 text-sm" placeholder="Ej. Doña Carmen" required={tipoConcierge === "nueva"} />
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-widest text-muted-foreground mb-1">WhatsApp</label>
                    <input type="text" value={nuevoWhatsappConcierge} onChange={e => setNuevoWhatsappConcierge(e.target.value)} className="w-full border-b border-border bg-transparent py-2 text-foreground focus:outline-none focus:border-amber-500 text-sm" placeholder="10 dígitos (Ej. 8100000000)" required={tipoConcierge === "nueva"} />
                  </div>
                </div>
              )}
              
              <div className="pt-4 mt-6 border-t border-border flex justify-end gap-3">
                <button type="button" onClick={() => setIsConciergeOpen(false)} className="px-5 py-2.5 rounded text-xs uppercase tracking-widest font-medium text-muted-foreground hover:bg-secondary transition-colors cursor-pointer">Cancelar</button>
                <button type="submit" className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2.5 rounded text-xs uppercase tracking-widest font-bold shadow-md transition-colors disabled:opacity-50 cursor-pointer">
                  ✅ Apartar Cama
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* --- FIN: MODAL CONCIERGE --- */}
      {/* --- INICIO: MODAL LISTA DE ESPERA --- */}
      {isListaEsperaOpen && claseEsperaInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in p-4">
          <div className="bg-card w-full max-w-lg rounded-xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[85vh]">
          <div className="bg-emerald-600/10 p-5 border-b border-emerald-600/20 flex justify-between items-center">
              <div>
                <h3 className="font-serif text-xl text-emerald-800">Fila de Espera</h3>
                <p className="text-xs text-emerald-700/80 mt-1 font-bold uppercase tracking-widest">
                  📅 {claseEsperaInfo.dia} • {claseEsperaInfo.horario}
                </p>
              </div>
              <button onClick={() => setIsListaEsperaOpen(false)} className="text-muted-foreground hover:text-foreground text-xl cursor-pointer">✕</button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              {personasEnEspera.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
                  <p className="text-2xl mb-2">🍃</p>
                  <p className="text-sm">Nadie está en espera para esta clase.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                    Estas personas se formaron al ver la clase llena. El orden de arriba hacia abajo es como fueron llegando.
                  </p>
                  {personasEnEspera.map((persona, index) => {
                    // AQUÍ AGREGAMOS EL DÍA EXACTO AL MENSAJE DE WHATSAPP
                    const mensajeWA = `¡Hola ${persona.nombre.split(' ')[0]}! Te escribo de Control Balance. Se acaba de liberar un lugar para la clase del *${claseEsperaInfo.dia}* a las *${claseEsperaInfo.horario}*. ¿Te anoto para apartarlo?`;
                    const linkWA = `https://wa.me/${(persona.whatsapp || "").replace(/\D/g, '')}?text=${encodeURIComponent(mensajeWA)}`;

                    return (
                      <div key={persona.id} className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 p-4 bg-secondary/20 border border-border rounded-lg">
                        <div>
                          <span className="inline-block bg-primary text-primary-foreground w-5 h-5 rounded-full text-[10px] text-center leading-5 font-bold mr-2 shadow-sm">
                            {index + 1}
                          </span>
                          <span className="font-medium text-sm">{persona.nombre}</span>
                          <span className="block ml-7 text-xs text-muted-foreground">{persona.whatsapp}</span>
                        </div>
                        <div className="flex gap-2 ml-7 sm:ml-0">
                          <a href={linkWA} target="_blank" rel="noreferrer" className="flex-1 sm:flex-none text-center bg-[#25D366] text-white px-3 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider hover:bg-[#1ebd5a] transition-colors shadow-sm cursor-pointer">
                            💬 Avisar
                          </a>
                          <button onClick={() => quitarDeLista(persona.id)} className="px-3 py-1.5 border border-border text-muted-foreground hover:bg-red-50 hover:text-red-500 hover:border-red-200 rounded text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer title='Quitar de la lista'">
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* --- FIN: MODAL LISTA DE ESPERA --- */}
    </main>
  );
}