"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { createClient } from "../lib/supabase/client";

type MetodoPago = {
    id: string;
    nombre: string;
};

type Props = {
    open: boolean;
    pacienteId: string;
    montoInicial?: number;
    onClose: () => void;
    onCreated: () => void;
};

export default function NuevoPagoModal({ open, pacienteId, montoInicial, onClose, onCreated }: Props) {
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [metodos, setMetodos] = useState<MetodoPago[]>([]);
    const [form, setForm] = useState({
        monto: "",
        metodo_pago_id: "",
        observacion: "",
    });

    useEffect(() => {
        if (open) {
            setForm({ monto: montoInicial ? String(montoInicial) : "", metodo_pago_id: "", observacion: "" });
            setError("");

            const fetchMetodos = async () => {
                const { data, error } = await supabase.from("metodos_pago").select("id, nombre").order("nombre");
                if (data) setMetodos(data);
                if (error) console.error("Error cargando métodos:", error.message);
            };
            fetchMetodos();
        }
    }, [open, supabase, montoInicial]);

    if (!open) return null;

    const guardar = async () => {
        if (!form.monto || Number(form.monto) <= 0) {
            setError("El monto debe ser un número mayor a cero.");
            return;
        }
        if (!form.metodo_pago_id) {
            setError("Debe seleccionar un método de pago.");
            return;
        }

        setLoading(true);
        setError("");

        const { error: err } = await supabase.from("pagos").insert({
            paciente_id: pacienteId,
            monto: Number(form.monto),
            metodo_pago_id: form.metodo_pago_id,
            observacion: form.observacion,
            fecha_pago: new Date().toISOString(),
        });

        setLoading(false);

        if (err) {
            setError(err.message || "Error al guardar el pago.");
        } else {
            onCreated();
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                    <h2 className="text-xl font-semibold text-slate-900">Registrar Pago</h2>
                    <button onClick={onClose} className="rounded-2xl p-2 text-slate-500 hover:bg-slate-100">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="space-y-4 px-6 py-6">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Monto ($)</label>
                        <input
                            type="number"
                            value={form.monto}
                            onChange={(e) => setForm({ ...form, monto: e.target.value })}
                            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-pink-300 focus:bg-white"
                            placeholder="0.00"
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Método de Pago</label>
                        <select
                            value={form.metodo_pago_id}
                            onChange={(e) => setForm({ ...form, metodo_pago_id: e.target.value })}
                            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-pink-300 focus:bg-white"
                        >
                            <option value="">Seleccione un método</option>
                            {metodos.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Observación (Opcional)</label>
                        <textarea
                            rows={3}
                            value={form.observacion}
                            onChange={(e) => setForm({ ...form, observacion: e.target.value })}
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-pink-300 focus:bg-white"
                            placeholder="Ej. Abono a ecografía"
                        />
                    </div>

                    {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</p>}
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-5">
                    <button onClick={onClose} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                        Cancelar
                    </button>
                    <button onClick={guardar} disabled={loading} className="rounded-2xl bg-pink-600 px-5 py-3 text-sm font-medium text-white hover:bg-pink-700 disabled:opacity-70">
                        {loading ? "Guardando..." : "Guardar Pago"}
                    </button>
                </div>
            </div>
        </div>
    );
}
