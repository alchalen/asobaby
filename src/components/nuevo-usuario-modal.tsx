"use client";

import { useState } from "react";
import { X, Lock, Mail, User } from "lucide-react";
import { createClient } from "../lib/supabase/client";

type Props = {
    open: boolean;
    onClose: () => void;
    onCreated: () => void;
};

export default function NuevoUsuarioModal({ open, onClose, onCreated }: Props) {
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [form, setForm] = useState({
        email: "",
        password: "",
        nombres: "",
        apellidos: "",
        rol: "operador", // admin, operador
    });

    if (!open) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const guardar = async () => {
        if (!form.email || !form.password) {
            setError("Correo y contraseña son obligatorios");
            return;
        }
        setLoading(true);
        setError("");

        // 1. Crear usuario en Auth (Esto normalmente enviará un correo de confirmación)
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: form.email,
            password: form.password,
            options: {
                data: {
                    nombres: form.nombres,
                    apellidos: form.apellidos,
                    rol: form.rol
                }
            }
        });

        if (authError) {
            setError(authError.message);
            setLoading(false);
            return;
        }

        // 2. Si tienes una tabla 'perfiles' separada, insertarías aquí usando authData.user?.id
        // await supabase.from('perfiles').insert({ ... })

        setLoading(false);
        onCreated();
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                    <h2 className="text-xl font-semibold text-slate-900">Registrar Usuario</h2>
                    <button onClick={onClose} className="rounded-2xl p-2 text-slate-500 hover:bg-slate-100">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="space-y-4 px-6 py-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">Nombres</label>
                            <input name="nombres" onChange={handleChange} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-pink-300" />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">Apellidos</label>
                            <input name="apellidos" onChange={handleChange} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-pink-300" />
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Correo Electrónico</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input name="email" type="email" onChange={handleChange} className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-pink-300" />
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Contraseña</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input name="password" type="password" onChange={handleChange} className="h-11 w-full rounded-xl border border-slate-200 pl-10 pr-3 text-sm outline-none focus:border-pink-300" />
                        </div>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Rol</label>
                        <select name="rol" onChange={handleChange} className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-pink-300 bg-white">
                            <option value="operador">Operador</option>
                            <option value="admin">Administrador</option>
                        </select>
                    </div>

                    {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</div>}
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-5">
                    <button onClick={onClose} className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
                        Cancelar
                    </button>
                    <button onClick={guardar} disabled={loading} className="rounded-2xl bg-pink-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-pink-700 disabled:opacity-70">
                        {loading ? "Registrando..." : "Crear Usuario"}
                    </button>
                </div>
            </div>
        </div>
    );
}