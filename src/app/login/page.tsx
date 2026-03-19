"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, Mail, ArrowRight } from "lucide-react";
import { createClient } from "../../lib/supabase/client";

export default function LoginPage() {
    const router = useRouter();
    const supabase = createClient();

    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");

    const [form, setForm] = useState({
        email: "",
        password: "",
    });

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: form.email,
                password: form.password,
            });

            if (error) throw error;

            router.push("/pacientes"); // Redirigir al dashboard
            router.refresh();
        } catch (err: any) {
            console.error("Error de login:", err);
            // Detectar error de conexión (URL incorrecta o red caída)
            if (err instanceof TypeError && err.message === "Failed to fetch") {
                setError("Error de conexión. Verifique la URL de Supabase en .env.local");
            } else {
                setError("Credenciales incorrectas.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
            <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-xl">
                <div className="bg-pink-600 px-8 py-10 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-3xl font-bold text-pink-600 shadow-sm">
                        A
                    </div>
                    <h1 className="text-2xl font-bold text-white">Bienvenido a AsoBaby</h1>
                    <p className="mt-2 text-pink-100">Ingresa tus credenciales de administrador</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6 px-8 py-10">
                    <div className="space-y-4">
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">Correo electrónico</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="email"
                                    required
                                    value={form.email}
                                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none transition focus:border-pink-300 focus:bg-white"
                                    placeholder="admin@asobaby.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">Contraseña</label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={form.password}
                                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-12 text-sm outline-none transition focus:border-pink-300 focus:bg-white"
                                    placeholder="••••••••"
                                />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                        </div>
                    </div>

                    {error && <div className="rounded-xl bg-red-50 p-3 text-center text-sm font-medium text-red-600">{error}</div>}

                    <button disabled={loading} className="group flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-pink-600 text-sm font-bold text-white transition hover:bg-pink-700 disabled:opacity-70">
                        {loading ? "Iniciando sesión..." : <>Ingresar <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></>}
                    </button>
                </form>
            </div>
        </div>
    );
}
