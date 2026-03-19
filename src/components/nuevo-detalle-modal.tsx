"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { createClient } from "../lib/supabase/client";

type Props = {
    open: boolean;
    pacienteId: string;
    onClose: () => void;
    onCreated: () => void;
};

export default function NuevoDetalleModal({ open, pacienteId, onClose, onCreated }: Props) {
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [form, setForm] = useState({
        titulo: "",
        descripcion: "",
    });

    useEffect(() => {
        if (open) {
            setForm({ titulo: "", descripcion: "" });
            setError("");
        }
    }, [open]);

    if (!open) return null;

    const guardar = async () => {
        if (!form.titulo) {
            setError("El título es obligatorio");
            return;
        }

        setLoading(true);
        setError("");

        const { error: err } = await supabase.from("detalles_paciente").insert({
            paciente_id: pacienteId,
            titulo: form.titulo,
            descripcion: form.descripcion,
            fecha_detalle: new Date().toISOString(),
        });

        setLoading(false);

        if (err) {
            setError(err.message);
        } else {
            onCreated();
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                    <h2 className="text-xl font-semibold text-slate-900">Nuevo detalle</h2>
                    <button onClick={onClose} className="rounded-2xl p-2 text-slate-500 hover:bg-slate-100">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="space-y-4 px-6 py-6">
                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Título</label>
                        <input
                            type="text"
                            value={form.titulo}
                            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                            className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-pink-300 focus:bg-white"
                            placeholder="Ej. Antecedentes, Alergias..."
                        />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Descripción</label>
                        <textarea
                            rows={4}
                            value={form.descripcion}
                            onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-pink-300 focus:bg-white"
                            placeholder="Información adicional..."
                        />
                    </div>

                    {error && <p className="text-sm text-red-600">{error}</p>}
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-5">
                    <button onClick={onClose} className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
                        Cancelar
                    </button>
                    <button onClick={guardar} disabled={loading} className="rounded-2xl bg-pink-600 px-5 py-3 text-sm font-medium text-white hover:bg-pink-700 disabled:opacity-70">
                        {loading ? "Guardando..." : "Guardar"}
                    </button>
                </div>
            </div>
        </div>
    );
}
