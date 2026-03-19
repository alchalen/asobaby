"use client";

import { useEffect, useState } from "react";
import { Plus, Search, Shield, Trash2 } from "lucide-react";
import { createClient } from "../../lib/supabase/client";
import NuevoUsuarioModal from "../../components/nuevo-usuario-modal";

type Usuario = {
    id: string;
    email: string;
    nombres: string;
    apellidos: string;
    rol: string;
    created_at: string;
};

export default function UsuariosPage() {
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [search, setSearch] = useState("");
    const supabase = createClient();

    const cargarUsuarios = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("perfiles")
                .select("*")
                .order("created_at", { ascending: false });

            if (!error && data) {
                setUsuarios(data as Usuario[]);
            }
        } catch (error) {
            console.error("Error cargando usuarios", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarUsuarios();
    }, []);

    const usuariosFiltrados = usuarios.filter((u) =>
        `${u.nombres} ${u.apellidos} ${u.email}`.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900">Usuarios</h2>
                    <p className="mt-1 text-sm text-slate-500">Administra el acceso al sistema y roles.</p>
                </div>
                <button
                    onClick={() => setModalOpen(true)}
                    className="inline-flex items-center gap-2 rounded-2xl bg-pink-600 px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-pink-700"
                >
                    <Plus className="h-4 w-4" />
                    Nuevo Usuario
                </button>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-4 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2">
                    <Search className="h-4 w-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o correo..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
                    />
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-100">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500">
                            <tr>
                                <th className="px-4 py-3 font-medium">Usuario</th>
                                <th className="px-4 py-3 font-medium">Rol</th>
                                <th className="px-4 py-3 font-medium">Fecha Creación</th>
                                <th className="px-4 py-3 text-right font-medium">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {usuariosFiltrados.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-slate-500">
                                        {loading ? "Cargando..." : "No se encontraron usuarios."}
                                    </td>
                                </tr>
                            ) : (
                                usuariosFiltrados.map((user) => (
                                    <tr key={user.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-slate-900">{user.nombres} {user.apellidos}</p>
                                            <p className="text-xs text-slate-500">{user.email}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${user.rol === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                <Shield className="h-3 w-3" /> {user.rol}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-500">{new Date(user.created_at).toLocaleDateString()}</td>
                                        <td className="px-4 py-3 text-right">
                                            <button className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <NuevoUsuarioModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={cargarUsuarios} />
        </div>
    );
}