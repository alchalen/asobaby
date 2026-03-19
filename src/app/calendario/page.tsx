"use client";

import { useEffect, useMemo, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { DateClickArg } from "@fullcalendar/interaction";
import type { EventClickArg, DateSelectArg } from "@fullcalendar/core";
import esLocale from "@fullcalendar/core/locales/es";
import { Plus } from "lucide-react";

import { createClient } from "../../lib/supabase/client";
import NuevaCitaModal, { PacienteOption } from "../../components/nueva-cita-modal";

type CitaRow = {
  id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string | null;
  observaciones: string | null;
  pacientes: {
    nombres: string;
    apellidos: string | null;
  } | null;
  catalogo_servicios: {
    nombre: string;
  } | null;
  estados_cita: {
    nombre: string;
    color: string | null;
  } | null;
};

type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end?: string;
  backgroundColor?: string;
  borderColor?: string;
  extendedProps: {
    paciente: string;
    servicio: string;
    estado: string;
    observaciones: string | null;
  };
};

export default function CalendarioPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [warningMsg, setWarningMsg] = useState("");

  const [citas, setCitas] = useState<CitaRow[]>([]);
  const [pacientes, setPacientes] = useState<PacienteOption[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [fechaSeleccionada, setFechaSeleccionada] = useState("");
  const [horaInicioSeleccionada, setHoraInicioSeleccionada] = useState("");
  const [horaFinSeleccionada, setHoraFinSeleccionada] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [citaIdToEdit, setCitaIdToEdit] = useState<string | null>(null);

  const cargarCitas = async () => {
    try {
      setLoading(true);
      setErrorMsg("");

      const { data, error } = await supabase
        .from("citas")
        .select(`
          id,
          fecha,
          hora_inicio,
          hora_fin,
          observaciones,
          pacientes (
            nombres,
            apellidos
          ),
          catalogo_servicios (
            nombre
          ),
          estados_cita (
            nombre,
            color
          )
        `)
        .order("fecha", { ascending: true })
        .order("hora_inicio", { ascending: true });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      setCitas((data || []) as unknown as CitaRow[]);
    } catch (err: any) {
      setErrorMsg(err?.message || "No se pudieron cargar las citas.");
    } finally {
      setLoading(false);
    }
  };

  const cargarPacientes = async () => {
    const { data, error } = await supabase
      .from("pacientes")
      .select("id, nombres, apellidos")
      .order("nombres", { ascending: true });

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    setPacientes((data || []) as PacienteOption[]);
  };

  useEffect(() => {
    cargarCitas();
    cargarPacientes();
  }, []);

  const events = useMemo<CalendarEvent[]>(() => {
    return citas.map((cita) => {
      const paciente = `${cita.pacientes?.nombres ?? "Paciente"} ${cita.pacientes?.apellidos ?? ""}`.trim();
      const servicio = cita.catalogo_servicios?.nombre || "Sin servicio";
      const estado = cita.estados_cita?.nombre || "Sin estado";
      const color = cita.estados_cita?.color || "#ec4899";

      const start = `${cita.fecha}T${cita.hora_inicio}`;
      const end = cita.hora_fin ? `${cita.fecha}T${cita.hora_fin}` : undefined;

      return {
        id: cita.id,
        title: `${paciente} • ${servicio}`,
        start,
        end,
        backgroundColor: color,
        borderColor: color,
        extendedProps: {
          paciente,
          servicio,
          estado,
          observaciones: cita.observaciones,
        },
      };
    });
  }, [citas]);

  const abrirModalNuevaCita = () => {
    setWarningMsg("");
    setSelectedEvent(null);
    setCitaIdToEdit(null);
    setModalOpen(true);
  };

  const handleDateClick = (info: DateClickArg) => {
    const date = info.date;
    const fecha = date.toISOString().split("T")[0]; // YYYY-MM-DD
    let hInicio = "";
    let hFin = "";

    // Si no es "todo el día", significa que se hizo clic en una hora específica (vista semana/día)
    if (!info.allDay) {
      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");
      hInicio = `${hours}:${minutes}`;

      // Por defecto sugerimos 1 hora de duración
      const endDate = new Date(date.getTime() + 60 * 60 * 1000);
      const endHours = endDate.getHours().toString().padStart(2, "0");
      const endMinutes = endDate.getMinutes().toString().padStart(2, "0");
      hFin = `${endHours}:${endMinutes}`;
    }

    setFechaSeleccionada(fecha);
    setHoraInicioSeleccionada(hInicio);
    setHoraFinSeleccionada(hFin);
    abrirModalNuevaCita();
  };

  const handleSelect = (info: DateSelectArg) => {
    const date = info.start;
    const fecha = date.toISOString().split("T")[0];
    let hInicio = "";
    let hFin = "";

    if (!info.allDay) {
      const startHours = info.start.getHours().toString().padStart(2, "0");
      const startMinutes = info.start.getMinutes().toString().padStart(2, "0");
      hInicio = `${startHours}:${startMinutes}`;

      const endHours = info.end.getHours().toString().padStart(2, "0");
      const endMinutes = info.end.getMinutes().toString().padStart(2, "0");
      hFin = `${endHours}:${endMinutes}`;
    }

    setFechaSeleccionada(fecha);
    setHoraInicioSeleccionada(hInicio);
    setHoraFinSeleccionada(hFin);
    abrirModalNuevaCita();
  };

  const abrirModalEdicion = (citaId: string) => {
    setFechaSeleccionada("");
    setHoraInicioSeleccionada("");
    setHoraFinSeleccionada("");
    setCitaIdToEdit(citaId);
    setModalOpen(true);
  };

  const handleEventClick = (info: EventClickArg) => {
    const ev = info.event;

    setSelectedEvent({
      id: ev.id,
      title: ev.title,
      start: ev.startStr,
      end: ev.endStr || undefined,
      backgroundColor: ev.backgroundColor,
      borderColor: ev.borderColor,
      extendedProps: {
        paciente: ev.extendedProps.paciente || "",
        servicio: ev.extendedProps.servicio || "",
        estado: ev.extendedProps.estado || "",
        observaciones: ev.extendedProps.observaciones || null,
      },
    });

    setWarningMsg("");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Calendario</h2>
          <p className="mt-1 text-sm text-slate-500">
            Agenda visual de citas estilo Google Calendar.
          </p>
        </div>

        <button
          onClick={abrirModalNuevaCita}
          className="inline-flex items-center gap-2 rounded-2xl bg-pink-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-pink-700"
        >
          <Plus className="h-4 w-4" />
          Nueva cita
        </button>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
          Haz clic en un día del calendario o usa el botón “Nueva cita”.
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {errorMsg}
        </div>
      )}

      {warningMsg && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {warningMsg}
        </div>
      )}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          {loading ? (
            <div className="p-6 text-sm text-slate-500">Cargando calendario...</div>
          ) : (
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              locale={esLocale}
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "dayGridMonth,timeGridWeek,timeGridDay",
              }}
              buttonText={{
                today: "Hoy",
                month: "Mes",
                week: "Semana",
                day: "Día",
              }}
              height="auto"
              events={events}
              selectable={true}
              select={handleSelect}
              dateClick={handleDateClick}
              eventClick={handleEventClick}
              allDaySlot={false}
              slotMinTime="08:00:00"
              slotMaxTime="20:00:00"
              nowIndicator
              dayMaxEvents
            />
          )}
        </div>

        <aside className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold">Resumen</h3>

            <div className="mt-5 grid gap-4">
              <div className="rounded-2xl bg-pink-50 p-4">
                <p className="text-xs uppercase tracking-wide text-pink-400">
                  Total citas
                </p>
                <p className="mt-2 text-3xl font-semibold text-pink-700">
                  {events.length}
                </p>
              </div>
            </div>
          </div>

          {selectedEvent && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Detalle de cita</h3>
                <button
                  onClick={() => abrirModalEdicion(selectedEvent.id)}
                  className="rounded-xl bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-200"
                >
                  Editar
                </button>
              </div>

              <div className="mt-4 space-y-3 text-sm">
                <div>
                  <p className="text-slate-400">Paciente</p>
                  <p className="font-medium text-slate-800">
                    {selectedEvent.extendedProps.paciente}
                  </p>
                </div>

                <div>
                  <p className="text-slate-400">Servicio</p>
                  <p className="font-medium text-slate-800">
                    {selectedEvent.extendedProps.servicio}
                  </p>
                </div>

                <div>
                  <p className="text-slate-400">Estado</p>
                  <p className="font-medium text-slate-800">
                    {selectedEvent.extendedProps.estado}
                  </p>
                </div>

                <div>
                  <p className="text-slate-400">Inicio</p>
                  <p className="font-medium text-slate-800">{selectedEvent.start}</p>
                </div>

                {selectedEvent.end && (
                  <div>
                    <p className="text-slate-400">Fin</p>
                    <p className="font-medium text-slate-800">{selectedEvent.end}</p>
                  </div>
                )}

                <div>
                  <p className="text-slate-400">Observaciones</p>
                  <p className="font-medium text-slate-800">
                    {selectedEvent.extendedProps.observaciones || "Sin observaciones"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </aside>
      </section>

      <NuevaCitaModal
        open={modalOpen}
        citaId={citaIdToEdit}
        pacientes={pacientes}
        fecha={fechaSeleccionada}
        horaInicio={horaInicioSeleccionada}
        horaFin={horaFinSeleccionada}
        onClose={() => {
          setModalOpen(false);
          setCitaIdToEdit(null);
        }}
        onSaved={() => {
          setModalOpen(false);
          setCitaIdToEdit(null);
          cargarCitas();
        }}
      />
    </div>
  );
}
