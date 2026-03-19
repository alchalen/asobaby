"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { createClient } from "../lib/supabase/client";

export type PacienteOption = {
  id: string;
  nombres: string;
  apellidos: string | null;
};

type ServicioOption = {
  id: string;
  nombre: string;
};

type EstadoOption = {
  id: string;
  nombre: string;
};

type Props = {
  open: boolean;
  pacientes: PacienteOption[];
  pacienteId?: string | null; // For pre-selection on create
  citaId?: string | null; // For editing
  fecha?: string;
  horaInicio?: string;
  horaFin?: string;
  onClose: () => void;
  onSaved: () => void;
};

type FormState = {
  paciente_id: string;
  servicio_id: string;
  estado_id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  observaciones: string;
};

const initialForm: FormState = {
  paciente_id: "",
  servicio_id: "",
  estado_id: "",
  fecha: "",
  hora_inicio: "",
  hora_fin: "",
  observaciones: "",
};

export default function NuevaCitaModal({
  open,
  pacientes,
  pacienteId, // From Pacientes page
  citaId, // From Calendario page
  fecha = "",
  horaInicio = "",
  horaFin = "",
  onClose,
  onSaved,
}: Props) {
  const supabase = createClient();

  const [form, setForm] = useState<FormState>(initialForm);
  const [servicios, setServicios] = useState<ServicioOption[]>([]);
  const [estados, setEstados] = useState<EstadoOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCatalogos, setLoadingCatalogos] = useState(false);
  const [error, setError] = useState("");

  // Estado para la búsqueda de pacientes
  const [busquedaPaciente, setBusquedaPaciente] = useState("");
  const [mostrarResultados, setMostrarResultados] = useState(false);

  useEffect(() => {
    if (!open) {
      setForm(initialForm);
      setBusquedaPaciente("");
      setError("");
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setLoadingCatalogos(true);
        const [serviciosRes, estadosRes] = await Promise.all([
          supabase
            .from("catalogo_servicios")
            .select("id, nombre")
            .eq("estado", true)
            .order("nombre", { ascending: true }),
          supabase
            .from("estados_cita")
            .select("id, nombre")
            .order("nombre", { ascending: true }),
        ]);

        if (serviciosRes.error) {
          setError(serviciosRes.error.message);
          return;
        }

        if (estadosRes.error) {
          setError(estadosRes.error.message);
          return;
        }

        const serviciosData = (serviciosRes.data || []) as ServicioOption[];
        const estadosData = (estadosRes.data || []) as EstadoOption[];

        setServicios(serviciosData);
        setEstados(estadosData);

        if (citaId) {
          // EDIT MODE
          const { data: citaData, error: citaError } = await supabase
            .from("citas")
            .select("*")
            .eq("id", citaId)
            .single();

          if (citaError) throw citaError;

          if (citaData) {
            setForm({
              paciente_id: citaData.paciente_id,
              servicio_id: citaData.servicio_id || "",
              estado_id: citaData.estado_id || "",
              fecha: citaData.fecha || "",
              hora_inicio: citaData.hora_inicio || "",
              hora_fin: citaData.hora_fin || "",
              observaciones: citaData.observaciones || "",
            });

            const paciente = pacientes.find((p) => p.id === citaData.paciente_id);
            if (paciente) {
              setBusquedaPaciente(`${paciente.nombres} ${paciente.apellidos || ""}`);
            }
          }
        } else {
          // CREATE MODE
          const estadoPendiente =
            estadosData.find((e) => e.nombre.toLowerCase() === "pendiente")?.id || "";

          let pId = "";
          if (pacienteId) {
            const found = pacientes.find((p) => p.id === pacienteId);
            if (found) {
              pId = found.id;
              setBusquedaPaciente(`${found.nombres} ${found.apellidos || ""}`);
            }
          }

          setForm((prev) => ({
            ...initialForm,
            estado_id: estadoPendiente,
            paciente_id: pId,
            fecha: fecha || prev.fecha,
            hora_inicio: horaInicio || prev.hora_inicio,
            hora_fin: horaFin || prev.hora_fin,
          }));
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoadingCatalogos(false);
      }
    };

    loadData();
  }, [open, supabase, fecha, horaInicio, horaFin, pacienteId, citaId, pacientes]);

  if (!open) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validar = () => {
    if (!form.paciente_id) return "Debes seleccionar un paciente de la lista.";
    if (!form.fecha) return "La fecha es obligatoria.";
    if (!form.hora_inicio) return "La hora de inicio es obligatoria.";
    if (!form.estado_id) return "Debes seleccionar un estado.";

    if (form.hora_fin && form.hora_inicio && form.hora_fin <= form.hora_inicio) {
      return "La hora de fin debe ser posterior a la hora de inicio.";
    }
    return "";
  };

  const guardar = async () => {
    setError("");

    const validacion = validar();
    if (validacion) {
      setError(validacion);
      return;
    }

    try {
      setLoading(true);

      const dataToSave = {
        paciente_id: form.paciente_id,
        servicio_id: form.servicio_id || null,
        estado_id: form.estado_id,
        fecha: form.fecha,
        hora_inicio: form.hora_inicio,
        hora_fin: form.hora_fin || null,
        observaciones: form.observaciones.trim() || null,
      };

      const { error: opError } = citaId
        ? await supabase.from("citas").update(dataToSave).eq("id", citaId)
        : await supabase.from("citas").insert(dataToSave);

      setLoading(false);

      if (opError) {
        setError(opError.message);
        return;
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || "No se pudo guardar la cita.");
    }
  };

  // Filtrar pacientes según la búsqueda
  const pacientesFiltrados = pacientes.filter((p) => {
    const nombreCompleto = `${p.nombres} ${p.apellidos || ""}`.toLowerCase();
    return nombreCompleto.includes(busquedaPaciente.toLowerCase());
  });

  const seleccionarPaciente = (paciente: PacienteOption) => {
    setForm((prev) => ({ ...prev, paciente_id: paciente.id }));
    setBusquedaPaciente(`${paciente.nombres} ${paciente.apellidos || ""}`);
    setMostrarResultados(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              {citaId ? "Editar cita" : "Nueva cita"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {citaId ? "Modifica los detalles de la cita." : "Busca un paciente y agenda su cita."}
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-2xl p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-4 px-6 py-6 md:grid-cols-2">
          <div className="relative md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Buscar Paciente
            </label>
            <input
              type="text"
              placeholder="Escribe el nombre del paciente..."
              value={busquedaPaciente}
              onChange={(e) => {
                setBusquedaPaciente(e.target.value);
                setMostrarResultados(true);
                if (form.paciente_id) setForm((prev) => ({ ...prev, paciente_id: "" }));
              }}
              onFocus={() => setMostrarResultados(true)}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-pink-300 focus:bg-white"
            />

            {mostrarResultados && busquedaPaciente && (
              <div className="absolute top-full z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-lg">
                {pacientesFiltrados.length > 0 ? (
                  pacientesFiltrados.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => seleccionarPaciente(p)}
                      className="cursor-pointer px-4 py-3 text-sm hover:bg-slate-50"
                    >
                      {p.nombres} {p.apellidos || ""}
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-3 text-sm text-slate-500">No se encontraron pacientes.</div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-slate-700">Servicio</label>
            <select
              name="servicio_id"
              value={form.servicio_id}
              onChange={handleChange}
              disabled={loadingCatalogos}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-pink-300 focus:bg-white"
            >
              <option value="">Selecciona un servicio</option>
              {servicios.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Fecha</label>
            <input
              type="date"
              name="fecha"
              value={form.fecha}
              onChange={handleChange}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-pink-300 focus:bg-white"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Estado</label>
            <select
              name="estado_id"
              value={form.estado_id}
              onChange={handleChange}
              disabled={loadingCatalogos}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-pink-300 focus:bg-white"
            >
              <option value="">Selecciona un estado</option>
              {estados.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Hora inicio
            </label>
            <input
              type="time"
              name="hora_inicio"
              value={form.hora_inicio}
              onChange={handleChange}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-pink-300 focus:bg-white"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Hora fin</label>
            <input
              type="time"
              name="hora_fin"
              value={form.hora_fin}
              onChange={handleChange}
              className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none transition focus:border-pink-300 focus:bg-white"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-slate-700">
              Observaciones
            </label>
            <textarea
              name="observaciones"
              value={form.observaciones}
              onChange={handleChange}
              rows={4}
              placeholder="Notas de la cita"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-pink-300 focus:bg-white"
            />
          </div>

          {error && (
            <div className="md:col-span-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-5">
          <button
            onClick={onClose}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Cancelar
          </button>

          <button
            onClick={guardar}
            disabled={loading}
            className="rounded-2xl bg-pink-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Guardando..." : (citaId ? "Guardar cambios" : "Guardar cita")}
          </button>
        </div>
      </div>
    </div>
  );
}
