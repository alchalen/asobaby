"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Phone,
  CalendarDays,
  FileText,
  CreditCard,
  Download,
  ChevronDown,
  ChevronUp,
  Hash,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { createClient } from "../../lib/supabase/client";
import NuevoPacienteModal from "../../components/nuevo-paciente-modal";
import NuevaCitaModal from "../../components/nueva-cita-modal";
import RegistrarServicioModal from "../../components/registrar-servicio-modal";
import NuevoDetalleModal from "../../components/nuevo-detalle-modal";
import NuevoPagoModal from "../../components/nuevo-pago-modal";

type Paciente = {
  id: string;
  nombres: string;
  apellidos: string | null;
  cedula: string | null;
  historia_clinica: string | null;
  celular: string | null;
  fecha_nacimiento: string | null;
  direccion: string | null;
  email: string | null;
  embarazada: boolean;
  semanas_embarazo: number | null;
  observaciones: string | null;
  created_at: string;
};

type Servicio = {
  id: string;
  fecha_servicio: string;
  descripcion: string | null;
  precio: number;
  observacion: string | null;
};

type Detalle = {
  id: string;
  titulo: string;
  descripcion: string | null;
  fecha_detalle: string;
};

type Cita = {
  id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string | null;
  observaciones: string | null;
  catalogo_servicios: {
    nombre: string;
  } | null;
};

type Pago = {
  id: string;
  monto: number;
  fecha_pago: string;
  observacion: string | null;
  metodos_pago: {
    nombre: string;
  } | null;
};

const tabs = ["General", "Servicios", "Detalles", "Citas"];

export default function PacientesPage() {
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("General");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [citaModalOpen, setCitaModalOpen] = useState(false);
  const [servicioModalOpen, setServicioModalOpen] = useState(false);
  const [detalleModalOpen, setDetalleModalOpen] = useState(false);
  const [pagoModalOpen, setPagoModalOpen] = useState(false);
  const [montoPagar, setMontoPagar] = useState<number | undefined>(undefined);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [detalles, setDetalles] = useState<Detalle[]>([]);
  const [citas, setCitas] = useState<Cita[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);

  const supabase = createClient();

  const cargarPacientes = async () => {
    try {
      setLoading(true);
      setErrorMsg("");

      const { data, error } = await supabase
        .from("pacientes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      const rows = (data || []) as Paciente[];
      setPacientes(rows);

      if (rows.length > 0) {
        setSelectedId((prev) => prev ?? rows[0].id);
      } else {
        setSelectedId(null);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "Error inesperado al cargar pacientes.");
    } finally {
      setLoading(false);
    }
  };

  const cargarRelacionados = async (pacienteId: string) => {
    const [serviciosRes, detallesRes, citasRes, pagosRes] = await Promise.all([
      supabase
        .from("servicios")
        .select("id, fecha_servicio, precio, descripcion, observacion")
        .eq("paciente_id", pacienteId)
        .order("fecha_servicio", { ascending: false }),

      supabase
        .from("detalles_paciente")
        .select("id, titulo, descripcion, fecha_detalle")
        .eq("paciente_id", pacienteId)
        .order("fecha_detalle", { ascending: false }),

      supabase
        .from("citas")
        .select("id, fecha, hora_inicio, hora_fin, observaciones, catalogo_servicios(nombre)")
        .eq("paciente_id", pacienteId)
        .order("fecha", { ascending: false }),

      supabase
        .from("pagos")
        .select("id, monto, fecha_pago, observacion, metodos_pago(nombre)")
        .eq("paciente_id", pacienteId)
        .order("fecha_pago", { ascending: false }),
    ]);

    setServicios((serviciosRes.data || []) as Servicio[]);
    setDetalles((detallesRes.data || []) as Detalle[]);
    setCitas((citasRes.data || []) as unknown as Cita[]);
    setPagos((pagosRes.data || []) as unknown as Pago[]);
  };

  useEffect(() => {
    cargarPacientes();
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setServicios([]);
      setDetalles([]);
      setCitas([]);
      setPagos([]);
      return;
    }

    cargarRelacionados(selectedId);
  }, [selectedId]);

  const pacientesFiltrados = useMemo(() => {
    const value = search.toLowerCase().trim();
    if (!value) return pacientes;

    return pacientes.filter((p) =>
      `${p.nombres ?? ""} ${p.apellidos ?? ""} ${p.celular ?? ""} ${p.cedula ?? ""} ${p.historia_clinica ?? ""}`
        .toLowerCase()
        .includes(value)
    );
  }, [pacientes, search]);

  const pacienteSeleccionado =
    pacientesFiltrados.find((p) => p.id === selectedId) ||
    pacientesFiltrados[0] ||
    null;

  useEffect(() => {
    if (!pacienteSeleccionado && pacientesFiltrados.length > 0) {
      setSelectedId(pacientesFiltrados[0].id);
    }
  }, [pacientesFiltrados, pacienteSeleccionado]);

  const serviciosPorFecha = useMemo(() => {
    if (!servicios || servicios.length === 0) return {};

    return servicios.reduce((acc, servicio) => {
      const fechaKey = servicio.fecha_servicio;
      if (!acc[fechaKey]) {
        acc[fechaKey] = [];
      }
      acc[fechaKey].push(servicio);
      return acc;
    }, {} as Record<string, Servicio[]>);
  }, [servicios]);

  const fechasOrdenadas = useMemo(() => {
    return Object.keys(serviciosPorFecha).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  }, [serviciosPorFecha]);

  const totalServicios = servicios.reduce(
    (acc, item) => acc + Number(item.precio || 0),
    0
  );

  const totalPagado = pagos.reduce(
    (acc, item) => acc + Number(item.monto || 0),
    0
  );

  const saldoPendiente = totalServicios - totalPagado;

  const generarEstadoCuentaPDF = () => {
    if (!pacienteSeleccionado) return;

    const doc = new jsPDF();

    doc.setFontSize(20);
    doc.text("Estado de Cuenta", 14, 22);

    doc.setFontSize(12);
    doc.text(`Paciente: ${pacienteSeleccionado.nombres} ${pacienteSeleccionado.apellidos || ''}`, 14, 32);
    doc.text(`Cédula: ${pacienteSeleccionado.cedula || 'N/A'}`, 14, 38);
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-EC')}`, 140, 32);

    // Preparar datos para la tabla
    const tablaData: string[][] = [];

    // Agregar servicios (cargos)
    servicios.forEach(s => {
      tablaData.push([
        new Date(s.fecha_servicio).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' }),
        s.descripcion || 'Servicio',
        `$${Number(s.precio).toFixed(2)}`,
        ''
      ]);
    });

    // Agregar pagos (abonos)
    pagos.forEach(p => {
      tablaData.push([
        new Date(p.fecha_pago).toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' }),
        `Abono (${p.metodos_pago?.nombre || 'N/A'})`,
        '',
        `$${Number(p.monto).toFixed(2)}`
      ]);
    });

    // Ordenar por fecha (más reciente primero)
    // @ts-ignore
    tablaData.sort((a, b) => new Date(b[0]) - new Date(a[0]));

    autoTable(doc, {
      startY: 45,
      head: [['Fecha', 'Descripción', 'Cargo', 'Abono']],
      body: tablaData,
      foot: [['', 'TOTALES', `$${totalServicios.toFixed(2)}`, `$${totalPagado.toFixed(2)}`], ['', 'SALDO PENDIENTE', { content: `$${saldoPendiente.toFixed(2)}`, colSpan: 2, styles: { halign: 'right', fontStyle: 'bold' } }]],
      headStyles: { fillColor: [236, 72, 153] }, // Pink color
      footStyles: { fontStyle: 'bold' }
    });

    doc.save(`estado_cuenta_${pacienteSeleccionado.nombres.replace(' ', '_')}.pdf`);
  };

  const generarReciboPDF = (grupo: Servicio[], fecha: string) => {
    if (!pacienteSeleccionado || grupo.length === 0) return;

    const doc = new jsPDF();

    const totalGrupo = grupo.reduce((sum, item) => sum + Number(item.precio), 0);

    doc.setFontSize(20);
    doc.text("Recibo de Servicio", 14, 22);

    doc.setFontSize(12);
    doc.text(`Paciente: ${pacienteSeleccionado.nombres} ${pacienteSeleccionado.apellidos || ''}`, 14, 32);
    doc.text(`Fecha: ${new Date(fecha).toLocaleString("es-EC", { dateStyle: "long", timeStyle: "short" })}`, 14, 38);

    autoTable(doc, {
      startY: 45,
      head: [['Servicio', 'Observación', 'Precio']],
      body: grupo.map(item => [
        item.descripcion || 'Servicio',
        item.observacion || '-',
        `$${Number(item.precio).toFixed(2)}`
      ]),
      foot: [['', 'TOTAL', `$${totalGrupo.toFixed(2)}`]],
      theme: 'grid',
      headStyles: { fillColor: [236, 72, 153] }, // Pink color
      footStyles: { fontStyle: 'bold', halign: 'right' },
    });

    doc.save(`recibo_${pacienteSeleccionado.nombres.replace(/\s/g, '_')}_${new Date(fecha).toISOString().split('T')[0]}.pdf`);
  };




  return (
    <>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Pacientes</h2>
            <p className="mt-1 text-sm text-slate-500">
              Gestiona la información general, servicios, citas y pagos.
            </p>
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-pink-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-pink-700"
          >
            <Plus className="h-4 w-4" />
            Nuevo paciente
          </button>
        </div>

        {errorMsg && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {errorMsg}
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, cédula o HC..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none focus:border-pink-300 focus:bg-white"
                />
              </div>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-3">
              {loading ? (
                <p className="p-3 text-sm text-slate-500">Cargando pacientes...</p>
              ) : pacientesFiltrados.length === 0 ? (
                <p className="p-3 text-sm text-slate-500">No hay pacientes.</p>
              ) : (
                <div className="space-y-2">
                  {pacientesFiltrados.map((p) => {
                    const active = pacienteSeleccionado?.id === p.id;

                    return (
                      <button
                        key={p.id}
                        onClick={() => setSelectedId(p.id)}
                        className={`w-full rounded-2xl border px-4 py-4 text-left transition ${active
                          ? "border-pink-200 bg-pink-50"
                          : "border-transparent bg-white hover:border-slate-200 hover:bg-slate-50"
                          }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {p.nombres} {p.apellidos ?? ""}
                              {p.historia_clinica && (
                                <span className="ml-2 inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                                  {p.historia_clinica}
                                </span>
                              )}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              {p.celular || "Sin celular"}
                            </p>
                          </div>

                          {p.embarazada && (
                            <span className="rounded-full bg-pink-100 px-2.5 py-1 text-xs font-medium text-pink-600">
                              Embarazada
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <section className="space-y-6">
            {!pacienteSeleccionado ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
                Selecciona un paciente para ver el detalle.
              </div>
            ) : (
              <>
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <h3 className="text-2xl font-bold">
                        {pacienteSeleccionado.nombres}{" "}
                        {pacienteSeleccionado.apellidos ?? ""}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        Cédula: {pacienteSeleccionado.cedula || "No registrada"}
                        {pacienteSeleccionado.historia_clinica && (
                          <span className="ml-2 font-medium text-slate-700">| HC: {pacienteSeleccionado.historia_clinica}</span>
                        )}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {tabs.map((item) => (
                        <button
                          key={item}
                          onClick={() => setTab(item)}
                          className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${tab === item
                            ? "bg-pink-600 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            }`}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {tab === "General" && (
                  <div className="grid gap-6 lg:grid-cols-2">
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                      <h4 className="text-lg font-semibold">Información general</h4>

                      <div className="mt-5 space-y-4 text-sm">
                        <div className="flex items-center gap-3">
                          <Hash className="h-4 w-4 text-pink-500" />
                          <span>Historia Clínica: {pacienteSeleccionado.historia_clinica || "No registrada"}</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <Phone className="h-4 w-4 text-pink-500" />
                          <span>{pacienteSeleccionado.celular || "Sin celular"}</span>
                        </div>

                        <div className="flex items-center gap-3">
                          <CalendarDays className="h-4 w-4 text-pink-500" />
                          <span>
                            Fecha de nacimiento:{" "}
                            {pacienteSeleccionado.fecha_nacimiento ||
                              "No registrada"}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-pink-500" />
                          <span>
                            Dirección:{" "}
                            {pacienteSeleccionado.direccion || "No registrada"}
                          </span>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-4">
                          <p className="text-xs uppercase tracking-wide text-slate-400">
                            Estado de embarazo
                          </p>
                          <p className="mt-2 font-medium">
                            {pacienteSeleccionado.embarazada ? "Sí" : "No"}
                          </p>
                          <p className="mt-1 text-slate-500">
                            Semanas: {pacienteSeleccionado.semanas_embarazo ?? 0}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                      <h4 className="text-lg font-semibold">Resumen</h4>

                      <div className="mt-6 grid grid-cols-2 gap-4">
                        <div className="rounded-2xl bg-pink-50 p-4">
                          <p className="text-xs uppercase tracking-wide text-pink-400">
                            Servicios
                          </p>
                          <p className="mt-2 text-2xl font-semibold text-pink-700">
                            {servicios.length}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-slate-50 p-4">
                          <p className="text-xs uppercase tracking-wide text-slate-400">
                            Pagado
                          </p>
                          <p className="mt-2 text-2xl font-semibold text-slate-700">
                            ${totalPagado.toFixed(2)}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-green-50 p-4 col-span-2">
                          <p className="text-xs uppercase tracking-wide text-green-500">
                            Saldo Pendiente
                          </p>
                          <p className="mt-2 text-3xl font-bold text-green-700">
                            ${saldoPendiente.toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                        {pacienteSeleccionado.observaciones ||
                          "Sin observaciones registradas."}
                      </div>
                    </div>
                  </div>
                )}

                {tab === "Servicios" && (
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                      <h4 className="text-lg font-semibold">Servicios</h4>
                      <button
                        onClick={() => setServicioModalOpen(true)}
                        className="inline-flex items-center gap-2 rounded-2xl bg-pink-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-pink-700"
                      >
                        <Plus className="h-4 w-4" />
                        Registrar servicio
                      </button>
                    </div>

                    <div className="mt-4 space-y-3">
                      {fechasOrdenadas.length === 0 ? (
                        <p className="text-sm text-slate-500">
                          No hay servicios registrados.
                        </p>
                      ) : (
                        fechasOrdenadas.map((fecha) => {
                          const grupo = serviciosPorFecha[fecha];
                          const totalGrupo = grupo.reduce(
                            (sum, item) => sum + Number(item.precio),
                            0
                          );

                          const descripcionResumen = grupo
                            .map((item) => item.descripcion || "Servicio")
                            .join(", ");

                          const isExpanded = expandedGroup === fecha;

                          return (
                            <div key={fecha} className="rounded-2xl border border-slate-200 bg-white overflow-hidden transition-all">
                              <div
                                className="flex items-start justify-between gap-4 p-4 cursor-pointer hover:bg-slate-50"
                                onClick={() => setExpandedGroup(isExpanded ? null : fecha)}
                              >
                                <div className="flex-1">
                                  <p className="font-medium text-slate-900 text-base">{descripcionResumen}</p>
                                  <p className="mt-1 text-sm text-slate-500">
                                    {new Date(fecha).toLocaleString("es-EC", { dateStyle: "long", timeStyle: "short" })}
                                  </p>
                                </div>
                                <div className="flex items-center gap-4">
                                  <p className="text-lg font-bold text-pink-600 whitespace-nowrap">
                                    ${totalGrupo.toFixed(2)}
                                  </p>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      generarReciboPDF(grupo, fecha);
                                    }}
                                    className="p-2 text-slate-500 rounded-xl hover:bg-slate-100"
                                    title="Descargar Recibo"
                                  >
                                    <Download className="h-4 w-4" />
                                  </button>
                                  {isExpanded ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                                </div>
                              </div>
                              {isExpanded && (
                                <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
                                  <table className="w-full text-sm">
                                    <thead>
                                      <tr className="text-left text-slate-400 text-xs">
                                        <th className="pb-2 font-medium">Servicio</th>
                                        <th className="pb-2 font-medium">Observación</th>
                                        <th className="pb-2 font-medium text-right">Precio</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {grupo.map((item) => (
                                        <tr key={item.id} className="border-t border-slate-200">
                                          <td className="py-2 text-slate-700">{item.descripcion}</td>
                                          <td className="py-2 text-slate-500 italic">{item.observacion || "-"}</td>
                                          <td className="py-2 text-right font-medium text-slate-700">${Number(item.precio).toFixed(2)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {tab === "Detalles" && (
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                      <h4 className="text-lg font-semibold">Detalles</h4>
                      <button
                        onClick={() => setDetalleModalOpen(true)}
                        className="inline-flex items-center gap-2 rounded-2xl bg-pink-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-pink-700"
                      >
                        <Plus className="h-4 w-4" />
                        Nuevo detalle
                      </button>
                    </div>

                    <div className="mt-4 space-y-3">
                      {detalles.length === 0 ? (
                        <p className="text-sm text-slate-500">
                          No hay detalles registrados.
                        </p>
                      ) : (
                        detalles.map((item) => (
                          <div key={item.id} className="rounded-2xl bg-slate-50 p-4">
                            <p className="font-medium">{item.titulo}</p>
                            <p className="text-sm text-slate-500">
                              {item.descripcion || "Sin descripción"}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">
                              {new Date(item.fecha_detalle).toLocaleString()}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {tab === "Citas" && (
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                      <h4 className="text-lg font-semibold">Citas</h4>

                      <button
                        onClick={() => setCitaModalOpen(true)}
                        className="inline-flex items-center gap-2 rounded-2xl bg-pink-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-pink-700"
                      >
                        <Plus className="h-4 w-4" />
                        Nueva cita
                      </button>
                    </div>

                    <div className="mt-4 space-y-3">
                      {citas.length === 0 ? (
                        <p className="text-sm text-slate-500">
                          No hay citas registradas.
                        </p>
                      ) : (
                        citas.map((item) => (
                          <div key={item.id} className="rounded-2xl bg-slate-50 p-4">
                            <p className="font-medium">
                              {item.fecha} • {item.hora_inicio} • {item.catalogo_servicios?.nombre || "Cita"}
                              {item.hora_fin ? ` - ${item.hora_fin}` : ""}
                            </p>
                            <p className="text-sm text-slate-500">
                              {item.observaciones || "Sin observaciones"}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>

      <NuevoPacienteModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={async () => {
          await cargarPacientes();
        }}
      />

      <NuevaCitaModal
        open={citaModalOpen}
        pacientes={pacientes}
        pacienteId={pacienteSeleccionado?.id || null}
        onClose={() => { setCitaModalOpen(false); }}
        onSaved={async () => {
          if (!selectedId) return;
          await cargarRelacionados(selectedId);
        }}
      />

      <RegistrarServicioModal
        open={servicioModalOpen}
        pacienteId={selectedId || ""}
        onClose={() => setServicioModalOpen(false)}
        onCreated={async () => {
          if (selectedId) await cargarRelacionados(selectedId);
        }}
      />

      <NuevoDetalleModal
        open={detalleModalOpen}
        pacienteId={selectedId || ""}
        onClose={() => setDetalleModalOpen(false)}
        onCreated={async () => {
          if (selectedId) await cargarRelacionados(selectedId);
        }}
      />

      <NuevoPagoModal
        open={pagoModalOpen}
        pacienteId={selectedId || ""}
        montoInicial={montoPagar}
        onClose={() => setPagoModalOpen(false)}
        onCreated={async () => {
          if (selectedId) await cargarRelacionados(selectedId);
        }}
      />
    </>
  );
}