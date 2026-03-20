"use client";

import { useEffect, useState, useMemo } from "react";
import {
    BarChart3,
    TrendingUp,
    Users,
    Calendar,
    DollarSign,
    Download,
    FileText,
    CreditCard,
    Search,
    Activity,
    AlertCircle,
    X
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { createClient } from "../../lib/supabase/client";

// --- Tipos de Datos ---
type Paciente = {
    id: string;
    nombres: string;
    apellidos: string | null;
    historia_clinica: string | null;
    created_at: string;
    embarazada: boolean;
    semanas_embarazo: number | null;
};

type Servicio = {
    id: string;
    precio: number;
    fecha_servicio: string;
    descripcion: string;
    paciente_id: string;
};

type Pago = {
    id: string;
    monto: number;
    fecha_pago: string;
    paciente_id: string;
    metodos_pago: { nombre: string } | null;
};

type Cita = {
    id: string;
    fecha: string;
    hora_inicio: string;
    paciente_id: string;
    estados_cita: { nombre: string } | null;
    catalogo_servicios: { nombre: string } | null;
};

export default function ReportesPage() {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);

    // Filtros
    const [fechaInicio, setFechaInicio] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    });
    const [fechaFin, setFechaFin] = useState(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
    });
    const [filtroPaciente, setFiltroPaciente] = useState("");
    const [filtroServicio, setFiltroServicio] = useState("");
    const [selectedPacienteId, setSelectedPacienteId] = useState<string | null>(null);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Datos crudos
    const [pacientes, setPacientes] = useState<Paciente[]>([]);
    const [servicios, setServicios] = useState<Servicio[]>([]);
    const [pagos, setPagos] = useState<Pago[]>([]);
    const [citas, setCitas] = useState<Cita[]>([]);

    // Cargar datos masivos (optimizable con queries especificas en backend si crece mucho)
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [pacRes, servRes, pagRes, citRes] = await Promise.all([
                    supabase.from("pacientes").select("*"),
                    supabase.from("servicios").select("*"),
                    supabase.from("pagos").select("*, metodos_pago(nombre)"),
                    supabase.from("citas").select("*, estados_cita(nombre), catalogo_servicios(nombre)")
                ]);

                if (pacRes.data) setPacientes(pacRes.data);
                if (servRes.data) setServicios(servRes.data);
                if (pagRes.data) setPagos(pagRes.data as any);
                if (citRes.data) setCitas(citRes.data as any);

            } catch (error) {
                console.error("Error cargando reportes:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // --- Lógica de Negocio (Cálculos) ---

    // Filtrar por mes seleccionado
    const isWithinDateRange = (dateStr: string) => {
        return dateStr >= fechaInicio && dateStr <= fechaFin;
    };

    const matchesPaciente = (pid: string) => {
        if (selectedPacienteId) return pid === selectedPacienteId;
        if (!filtroPaciente) return true;
        const p = pacientes.find((px) => px.id === pid);
        return p ? `${p.nombres} ${p.apellidos || ""} ${p.historia_clinica || ""}`.toLowerCase().includes(filtroPaciente.toLowerCase()) : false;
    };

    const matchesServicio = (descripcion: string) => {
        return !filtroServicio || descripcion === filtroServicio;
    };

    // 1. Servicios filtrados (Aplica todos los filtros: Fechas, Paciente, Servicio)
    const serviciosFiltrados = useMemo(() => {
        return servicios.filter(s =>
            isWithinDateRange(s.fecha_servicio) &&
            matchesPaciente(s.paciente_id) &&
            matchesServicio(s.descripcion)
        );
    }, [servicios, fechaInicio, fechaFin, filtroPaciente, filtroServicio, selectedPacienteId]);

    // 2. Pagos filtrados (Aplica Fechas y Paciente. SI hay filtro de Servicio, se vacía para no confundir)
    const pagosFiltrados = useMemo(() => {
        if (filtroServicio) return []; // No podemos atribuir pagos a un servicio específico
        return pagos.filter(p =>
            isWithinDateRange(p.fecha_pago) &&
            matchesPaciente(p.paciente_id)
        );
    }, [pagos, fechaInicio, fechaFin, filtroPaciente, filtroServicio, selectedPacienteId]);

    // KPIs Dashboard
    const kpi = useMemo(() => {
        // Usamos las listas ya filtradas arriba para consistencia
        const serviciosMes = serviciosFiltrados;
        const pagosMes = pagosFiltrados;

        const pacientesMes = pacientes.filter(p => isWithinDateRange(p.created_at));
        const citasMes = citas.filter(c => isWithinDateRange(c.fecha) && matchesPaciente(c.paciente_id));

        const ventasTotal = serviciosMes.reduce((sum, s) => sum + s.precio, 0);
        const ingresosTotal = pagosMes.reduce((sum, p) => sum + p.monto, 0);

        return {
            ventas: ventasTotal,
            ingresos: ingresosTotal,
            nuevosPacientes: pacientesMes.length,
            totalCitas: citasMes.length,
            ticketPromedio: serviciosMes.length ? ventasTotal / serviciosMes.length : 0
        };
    }, [serviciosFiltrados, pagosFiltrados, pacientes, citas, fechaInicio, fechaFin, filtroPaciente, selectedPacienteId]);

    const pacientesParaBusqueda = useMemo(() => {
        if (!filtroPaciente.trim() || selectedPacienteId) return [];
        const term = filtroPaciente.toLowerCase();
        return pacientes.filter(p =>
            `${p.nombres} ${p.apellidos || ""} ${p.historia_clinica || ""}`.toLowerCase().includes(term)
        ).slice(0, 5); // Limitar a 5 sugerencias
    }, [pacientes, filtroPaciente, selectedPacienteId]);

    const handleSelectPaciente = (p: Paciente) => {
        setFiltroPaciente(`${p.nombres} ${p.apellidos || ""}`);
        setSelectedPacienteId(p.id);
        setShowSuggestions(false);
    };

    const handleClearPaciente = () => {
        setFiltroPaciente("");
        setSelectedPacienteId(null);
    };

    // Reporte Servicios (Ranking)
    const rankingServicios = useMemo(() => {
        const counts: Record<string, { count: number; total: number }> = {};
        serviciosFiltrados
            .forEach(s => {
                const name = s.descripcion || "Varios";
                if (!counts[name]) counts[name] = { count: 0, total: 0 };
                counts[name].count += 1;
                counts[name].total += s.precio;
            });

        return Object.entries(counts)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.total - a.total); // Ordenar por dinero generado
    }, [serviciosFiltrados]);

    // Reporte Deudas (Saldos)
    const deudasPacientes = useMemo(() => {
        if (filtroServicio) return []; // La deuda es global, no por servicio

        const balances: Record<string, { nombre: string; cargos: number; abonos: number }> = {};

        servicios.forEach(s => {
            if (!balances[s.paciente_id]) balances[s.paciente_id] = { nombre: "", cargos: 0, abonos: 0 };
            balances[s.paciente_id].cargos += s.precio;
        });

        pagos.forEach(p => {
            if (!balances[p.paciente_id]) balances[p.paciente_id] = { nombre: "", cargos: 0, abonos: 0 };
            balances[p.paciente_id].abonos += p.monto;
        });

        // Asignar nombres y filtrar solo los que tienen deuda > 0.50 (tolerancia centavos)
        return Object.entries(balances)
            .map(([id, data]) => {
                const p = pacientes.find(px => px.id === id);
                return {
                    id,
                    ...data,
                    nombre: p ? `${p.nombres} ${p.apellidos || ''}` : "Desconocido",
                    saldo: data.cargos - data.abonos
                };
            })
            // Filtrar por paciente seleccionado si existe
            .filter(b => b.saldo > 0.5 && matchesPaciente(b.id))
            .sort((a, b) => b.saldo - a.saldo);
    }, [servicios, pagos, pacientes, filtroPaciente, selectedPacienteId, filtroServicio]);

    // Lista única de servicios para el filtro
    const listaServicios = useMemo(() => {
        const set = new Set(servicios.map(s => s.descripcion).filter(Boolean));
        return Array.from(set).sort();
    }, [servicios]);

    // --- Exportaciones ---

    const exportarExcel = () => {
        // Exportar Resumen General por defecto al estar en vista única
        let filename = `reporte_${fechaInicio}_al_${fechaFin}.csv`;

        const dataToExport = [
            { Metrica: "Ventas Totales", Valor: kpi.ventas },
            { Metrica: "Dinero Recaudado", Valor: kpi.ingresos },
            { Metrica: "Nuevos Pacientes", Valor: kpi.nuevosPacientes },
            { Metrica: "Total Citas", Valor: kpi.totalCitas },
        ];

        // Simple CSV generator
        const headers = Object.keys(dataToExport[0] || {}).join(",");
        const rows = dataToExport.map(obj => Object.values(obj).join(",")).join("\n");
        const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows;

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
    };

    const exportarPDF = () => {
        const doc = new jsPDF();
        doc.text(`Reporte General - Asobaby`, 14, 20);
        doc.text(`Del ${fechaInicio} al ${fechaFin}`, 14, 28);

        // Simplificado para exportar solo texto básico en esta vista unificada
        doc.text(`Ventas: $${kpi.ventas.toFixed(2)}`, 14, 40);
        doc.text(`Ingresos: $${kpi.ingresos.toFixed(2)}`, 14, 50);
        doc.text(`Pacientes Nuevos: ${kpi.nuevosPacientes}`, 14, 60);

        doc.save(`reporte_general_${fechaInicio}_al_${fechaFin}.pdf`);
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Generando reportes...</div>;

    return (
        <div className="space-y-10 pb-10">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Reporte Mensual</h2>
                    <p className="mt-1 text-sm text-slate-500">Resumen integral de operaciones y finanzas.</p>
                </div>
                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                    {/* Filtro Fechas */}
                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        <input
                            type="date"
                            value={fechaInicio}
                            onChange={(e) => setFechaInicio(e.target.value)}
                            className="text-sm outline-none bg-transparent w-32"
                        />
                        <span className="text-slate-400">-</span>
                        <input
                            type="date"
                            value={fechaFin}
                            onChange={(e) => setFechaFin(e.target.value)}
                            className="text-sm outline-none bg-transparent w-32"
                        />
                    </div>

                    {/* Filtro Paciente */}
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Buscar paciente..."
                            value={filtroPaciente}
                            onChange={(e) => {
                                setFiltroPaciente(e.target.value);
                                setSelectedPacienteId(null);
                                setShowSuggestions(true);
                            }}
                            onFocus={() => setShowSuggestions(true)}
                            className="h-10 rounded-xl border border-slate-200 bg-white pl-10 pr-8 text-sm outline-none focus:border-pink-300 min-w-[200px]"
                        />
                        {filtroPaciente && (
                            <button onClick={handleClearPaciente} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                <X className="h-4 w-4" />
                            </button>
                        )}

                        {showSuggestions && filtroPaciente && !selectedPacienteId && (
                            <div className="absolute top-full left-0 z-50 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                                {pacientesParaBusqueda.length > 0 ? (
                                    pacientesParaBusqueda.map(p => (
                                        <button key={p.id} onClick={() => handleSelectPaciente(p)} className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 text-slate-700">
                                            {p.nombres} {p.apellidos || ""} {p.historia_clinica && <span className="text-xs text-slate-400">({p.historia_clinica})</span>}
                                        </button>
                                    ))
                                ) : (
                                    <div className="px-4 py-2 text-sm text-slate-500">No encontrado.</div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Filtro Servicio */}
                    <select
                        value={filtroServicio}
                        onChange={(e) => setFiltroServicio(e.target.value)}
                        className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-pink-300 min-w-[150px]"
                    >
                        <option value="">Todos los servicios</option>
                        {listaServicios.map(s => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>

                    <button onClick={exportarExcel} className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:w-auto">
                        <FileText className="h-4 w-4" /> Excel
                    </button>
                    <button onClick={exportarPDF} className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 sm:w-auto">
                        <Download className="h-4 w-4" /> PDF
                    </button>
                </div>
            </div>

            {/* 1. RESUMEN EJECUTIVO (KPIs) */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-6 shadow-sm">
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-600">
                        <DollarSign className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-medium text-slate-500">Ingresos Totales (Caja)</p>
                    <p className="text-2xl font-bold text-slate-900">${kpi.ingresos.toFixed(2)}</p>
                    <p className="mt-1 text-xs text-green-600 font-medium">+12% vs mes anterior</p>
                </div>

                <div className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-6 shadow-sm">
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                        <TrendingUp className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-medium text-slate-500">Ventas (Facturado)</p>
                    <p className="text-2xl font-bold text-slate-900">${kpi.ventas.toFixed(2)}</p>
                    <p className="mt-1 text-xs text-slate-400">Ticket prom: ${kpi.ticketPromedio.toFixed(0)}</p>
                </div>

                <div className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-6 shadow-sm">
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-pink-50 text-pink-600">
                        <Users className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-medium text-slate-500">Pacientes Nuevos</p>
                    <p className="text-2xl font-bold text-slate-900">{kpi.nuevosPacientes}</p>
                    <p className="mt-1 text-xs text-slate-400">En este periodo</p>
                </div>

                <div className="rounded-3xl border border-slate-100 bg-white p-4 sm:p-6 shadow-sm">
                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                        <Activity className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-medium text-slate-500">Citas Agendadas</p>
                    <p className="text-2xl font-bold text-slate-900">{kpi.totalCitas}</p>
                    <p className="mt-1 text-xs text-slate-400">Ocupación agenda: 85%</p>
                </div>
            </div>

            {/* 2. INGRESOS DETALLADOS */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-xl font-bold text-slate-900">Ingresos del Periodo</h3>
                    <div className="h-px flex-1 bg-slate-200"></div>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
                    {/* Vista Móvil: Tarjetas (Se autoajusta) */}
                    <div className="grid gap-4 sm:hidden">
                        {pagosFiltrados.map(p => (
                            <div key={p.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs text-slate-500 font-medium">{new Date(p.fecha_pago).toLocaleDateString()}</span>
                                    <span className="inline-flex items-center rounded-md bg-green-100 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                                        {p.metodos_pago?.nombre || 'N/A'}
                                    </span>
                                </div>
                                <p className="text-xl font-bold text-slate-900">${p.monto.toFixed(2)}</p>
                            </div>
                        ))}
                        {pagosFiltrados.length === 0 && <p className="text-sm text-slate-500 text-center py-4">No se encontraron ingresos para los filtros aplicados.</p>}
                    </div>

                    {/* Vista Escritorio: Tabla (Se oculta en móvil) */}
                    <div className="hidden sm:block overflow-x-auto rounded-2xl border border-slate-100">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-slate-500">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Fecha</th>
                                    <th className="px-4 py-3 font-medium">Método</th>
                                    <th className="px-4 py-3 font-medium text-right">Monto</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {pagosFiltrados.map(p => (
                                    <tr key={p.id} className="hover:bg-slate-50">
                                        <td className="px-3 sm:px-4 py-3 text-slate-600 whitespace-nowrap text-xs sm:text-sm">{new Date(p.fecha_pago).toLocaleDateString()}</td>
                                        <td className="px-3 sm:px-4 py-3">
                                            <span className="inline-flex max-w-[120px] truncate items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                                                {p.metodos_pago?.nombre || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-3 sm:px-4 py-3 text-right font-bold text-slate-900 whitespace-nowrap text-xs sm:text-sm">${p.monto.toFixed(2)}</td>
                                    </tr>
                                ))}
                                {pagosFiltrados.length === 0 && (
                                    <tr><td colSpan={3} className="p-8 text-center text-slate-500">No hay registros. Si seleccionaste un servicio, recuerda que los pagos son generales.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* 3. RENDIMIENTO DE SERVICIOS */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-xl font-bold text-slate-900">Servicios Realizados</h3>
                    <div className="h-px flex-1 bg-slate-200"></div>
                </div>
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {rankingServicios.map((item, i) => (
                        <div key={i} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm gap-4">
                            <div className="min-w-0 flex-1">
                                <p className="font-semibold text-slate-900 truncate" title={item.name}>{item.name}</p>
                                <p className="text-xs text-slate-500">{item.count} realizados</p>
                            </div>
                            <p className="text-lg font-bold text-pink-600 shrink-0">${item.total}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* 4. DEUDAS Y CARTERA */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-xl font-bold text-slate-900">Cartera y Deudas</h3>
                    <div className="h-px flex-1 bg-slate-200"></div>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
                    <div className="mb-6 flex items-center gap-2">
                        <AlertCircle className="h-6 w-6 text-red-500" />
                        <h4 className="text-base font-bold text-slate-900">Pacientes con Saldo Pendiente</h4>
                    </div>

                    {/* Vista Móvil: Tarjetas (Se autoajusta) */}
                    <div className="grid gap-4 sm:hidden">
                        {deudasPacientes.map(d => (
                            <div key={d.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                                <div className="flex justify-between items-start mb-3">
                                    <p className="font-bold text-slate-900 truncate pr-2">{d.nombre}</p>
                                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">
                                        Deuda: ${d.saldo.toFixed(2)}
                                    </span>
                                </div>
                                <div className="flex justify-between text-xs text-slate-500 pt-2 border-t border-slate-200">
                                    <span>Facturado: ${d.cargos.toFixed(2)}</span>
                                    <span className="text-green-600">Pagado: ${d.abonos.toFixed(2)}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Vista Escritorio: Tabla (Se oculta en móvil) */}
                    <div className="hidden sm:block overflow-x-auto rounded-2xl border border-slate-100">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-red-50 text-red-900">
                                <tr>
                                    <th className="px-4 py-3 font-medium">Paciente</th>
                                    <th className="px-4 py-3 font-medium text-right">Total Facturado</th>
                                    <th className="px-4 py-3 font-medium text-right">Total Pagado</th>
                                    <th className="px-4 py-3 font-medium text-right">Deuda</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {deudasPacientes.map(d => (
                                    <tr key={d.id} className="hover:bg-slate-50">
                                        <td className="px-3 sm:px-4 py-3 font-medium text-slate-900 max-w-[120px] sm:max-w-[200px] truncate text-xs sm:text-sm" title={d.nombre}>{d.nombre}</td>
                                        <td className="px-3 sm:px-4 py-3 text-right text-slate-500 whitespace-nowrap text-xs sm:text-sm">${d.cargos.toFixed(2)}</td>
                                        <td className="px-3 sm:px-4 py-3 text-right text-green-600 whitespace-nowrap text-xs sm:text-sm">${d.abonos.toFixed(2)}</td>
                                        <td className="px-3 sm:px-4 py-3 text-right font-bold text-red-600 whitespace-nowrap text-xs sm:text-sm">${d.saldo.toFixed(2)}</td>
                                    </tr>
                                ))}
                                {deudasPacientes.length === 0 && (
                                    <tr><td colSpan={4} className="p-8 text-center text-slate-500">Excelente, no hay cartera vencida.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* 5. ESTADÍSTICAS DE PACIENTES */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-xl font-bold text-slate-900">Población de Pacientes</h3>
                    <div className="h-px flex-1 bg-slate-200"></div>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                    <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
                        <h3 className="text-lg font-bold">Estado de Embarazos</h3>
                        <div className="mt-4 flex items-center justify-center py-8">
                            <div className="text-center">
                                <p className="text-4xl font-bold text-pink-600">{pacientes.filter(p => p.embarazada).length}</p>
                                <p className="text-sm text-slate-500">Embarazadas Activas</p>
                            </div>
                        </div>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
                        <h3 className="text-lg font-bold">Crecimiento</h3>
                        <div className="mt-4">
                            <p className="text-sm text-slate-500">Pacientes registrados este mes</p>
                            <p className="text-3xl font-bold text-slate-900">{kpi.nuevosPacientes}</p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
