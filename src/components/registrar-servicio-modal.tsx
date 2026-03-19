"use client";

import { useEffect, useState } from "react";
import { X, DollarSign, Minus, Plus, Trash2 } from "lucide-react";
import { createClient } from "../lib/supabase/client";

type Props = {
    open: boolean;
    pacienteId: string;
    onClose: () => void;
    onCreated: () => void;
};

type CatalogoItem = {
    id: string;
    nombre: string;
    categoria: string;
    precio_base: number;
};

type Item = {
    key: number; // Client-side key
    descripcion: string;
    precio: number;
    observacion: string;
    tipo_servicio_id: string | null;
    isEditable?: boolean;
};

export default function RegistrarServicioModal({ open, pacienteId, onClose, onCreated }: Props) {
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [catalogo, setCatalogo] = useState<Record<string, CatalogoItem[]>>({});
    const [error, setError] = useState("");

    const [items, setItems] = useState<Item[]>([]);
    const [nextKey, setNextKey] = useState(0);

    // Cargar catálogo desde Supabase al abrir
    useEffect(() => {
        if (open) {
            setItems([]);
            setError("");
            fetchCatalogo();
        }
    }, [open]);

    const fetchCatalogo = async () => {
        const { data } = await supabase
            .from("catalogo_servicios")
            .select("id, nombre, categoria, precio_base")
            .eq("estado", true)
            .order("nombre");

        if (data) {
            const agrupado = (data as CatalogoItem[]).reduce((acc, item) => {
                const cat = item.categoria || "Otros";
                if (!acc[cat]) acc[cat] = [];
                acc[cat].push(item);
                return acc;
            }, {} as Record<string, CatalogoItem[]>);
            setCatalogo(agrupado);
        }
    };

    if (!open) return null;

    const seleccionarItem = (item: CatalogoItem) => {
        setItems((prev) => [
            ...prev,
            {
                key: nextKey,
                descripcion: item.nombre,
                precio: item.precio_base,
                observacion: "",
                tipo_servicio_id: item.id,
            },
        ]);
        setNextKey((k) => k + 1);
    };

    const setTipoEspecial = (tipo: 'Descuento' | 'Adicional') => {
        setItems((prev) => [
            ...prev,
            {
                key: nextKey,
                descripcion: tipo,
                precio: tipo === "Descuento" ? -0 : 0,
                observacion: "",
                tipo_servicio_id: null,
                isEditable: true,
            },
        ]);
        setNextKey((k) => k + 1);
    };

    const handleItemChange = (key: number, field: keyof Item, value: string | number) => {
        setItems((prev) =>
            prev.map((item) => (item.key === key ? { ...item, [field]: value } : item))
        );
    };

    const handleRemoveItem = (key: number) => {
        setItems((prev) => prev.filter((item) => item.key !== key));
    };

    const guardar = async () => {
        if (items.length === 0) {
            setError("Agrega al menos un servicio a la lista.");
            return;
        }

        setLoading(true);
        setError("");

        const fechaServicio = new Date().toISOString();
        const itemsToSave = items.map((item) => ({
            paciente_id: pacienteId,
            tipo_servicio_id: item.tipo_servicio_id,
            descripcion: item.descripcion,
            precio: Number(item.precio) || 0,
            observacion: item.observacion,
            fecha_servicio: fechaServicio,
        }));

        const { error: err } = await supabase.from("servicios").insert(itemsToSave);
        setLoading(false);

        if (err) {
            setError(err.message);
        } else {
            onCreated();
            onClose();
        }
    };

    // Orden de categorías deseado
    const ordenCategorias = ["Ecografías", "Revelaciones", "Paquetes", "Adicionales", "Otros"];

    const total = items.reduce((sum, item) => sum + (Number(item.precio) || 0), 0);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
            <div className="flex h-full max-h-[90vh] w-full max-w-4xl flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl">

                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                    <div>
                        <h2 className="text-xl font-semibold text-slate-900">Registrar Servicio</h2>
                        <p className="text-sm text-slate-500">Selecciona del catálogo o crea uno personalizado.</p>
                    </div>
                    <button onClick={onClose} className="rounded-2xl p-2 hover:bg-slate-100">
                        <X className="h-5 w-5 text-slate-500" />
                    </button>
                </div>

                <div className="flex min-h-0 flex-1 flex-col lg:flex-row">

                    {/* Columna Izquierda: Catálogo Dinámico */}
                    <div className="flex-1 overflow-y-auto border-b border-slate-100 p-6 lg:border-b-0 lg:border-r">
                        <div className="space-y-6">

                            {ordenCategorias.map((cat) => {
                                const catItems = catalogo[cat];
                                if (!catItems || catItems.length === 0) return null;
                                return (
                                    <div key={cat}>
                                        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">{cat}</h3>
                                        <div className="flex flex-wrap gap-2">
                                            {catItems.map((item) => (
                                                <button
                                                    key={item.id}
                                                    onClick={() => seleccionarItem(item)}
                                                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition active:scale-95 ${items.some((i) => i.tipo_servicio_id === item.id)
                                                        ? "border-pink-500 bg-pink-50 text-pink-700"
                                                        : "border-slate-200 bg-white text-slate-700 hover:border-pink-300 hover:bg-pink-50"
                                                        }`}
                                                >
                                                    <span>{item.nombre}</span>
                                                    <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">${item.precio_base}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Botones Especiales (Siempre presentes) */}
                            <div>
                                <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Especiales</h3>
                                <div className="flex gap-3">
                                    <button onClick={() => setTipoEspecial('Descuento')} className="flex items-center gap-2 rounded-xl border border-dashed border-red-300 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100">
                                        <Minus className="h-4 w-4" /> Descuento
                                    </button>
                                    <button onClick={() => setTipoEspecial('Adicional')} className="flex items-center gap-2 rounded-xl border border-dashed border-blue-300 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100">
                                        <Plus className="h-4 w-4" /> Otro Adicional
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Columna Derecha: Formulario */}
                    <div className="flex w-full flex-col bg-slate-50 lg:w-96">
                        <div className="flex-1 space-y-3 overflow-y-auto p-6">
                            <h3 className="font-semibold text-slate-900">Servicios a registrar</h3>
                            {items.length === 0 ? (
                                <div className="py-10 text-center text-sm text-slate-400">
                                    Selecciona servicios del catálogo.
                                </div>
                            ) : (
                                items.map((item) => (
                                    <div key={item.key} className="rounded-2xl border border-slate-200 bg-white p-3">
                                        <div className="flex items-start justify-between gap-2">
                                            {item.isEditable ? (
                                                <input
                                                    type="text"
                                                    value={item.descripcion}
                                                    onChange={(e) => handleItemChange(item.key, "descripcion", e.target.value)}
                                                    className="w-full bg-slate-50 rounded-md px-2 py-1 text-sm font-medium outline-none focus:ring-2 focus:ring-pink-200"
                                                    placeholder="Descripción..."
                                                />
                                            ) : (
                                                <p className="flex-1 font-medium text-slate-800 text-sm">{item.descripcion}</p>
                                            )}
                                            <div className="relative w-24">
                                                <DollarSign className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
                                                <input
                                                    type="number"
                                                    value={item.precio}
                                                    onChange={(e) => handleItemChange(item.key, "precio", e.target.value)}
                                                    className="h-8 w-full rounded-md border border-slate-200 bg-slate-50 pl-6 pr-1 text-right text-sm font-semibold outline-none focus:border-pink-300"
                                                />
                                            </div>
                                            <button onClick={() => handleRemoveItem(item.key)} className="p-1 text-slate-400 hover:text-red-500">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="border-t border-slate-200 p-6">
                            <div className="flex justify-between items-center text-lg font-bold">
                                <span>Total</span>
                                <span>${total.toFixed(2)}</span>
                            </div>

                            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

                            <button onClick={guardar} disabled={loading || items.length === 0} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-pink-600 py-4 text-sm font-bold text-white shadow-lg shadow-pink-200 transition hover:bg-pink-700 hover:shadow-xl disabled:opacity-50">
                                {loading ? "Guardando..." : `Guardar ${items.length} servicio(s)`}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
