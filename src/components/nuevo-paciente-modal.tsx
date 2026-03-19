"use client";

import { useState } from "react";
import { createClient } from "../lib/supabase/client";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
};

export default function NuevoPacienteModal({ open, onClose, onCreated }: Props) {
  const supabase = createClient();

  const [form, setForm] = useState({
    nombres: "",
    apellidos: "",
    cedula: "",
    celular: "",
    embarazada: false,
    semanas_embarazo: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const handleChange = (e: any) => {
    const { name, value, type, checked } = e.target;

    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const guardar = async () => {
    setLoading(true);
    setError("");

    const { error } = await supabase.from("pacientes").insert({
      nombres: form.nombres,
      apellidos: form.apellidos,
      cedula: form.cedula,
      celular: form.celular,
      embarazada: form.embarazada,
      semanas_embarazo: form.semanas_embarazo
        ? Number(form.semanas_embarazo)
        : null,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    onCreated();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold mb-4">Nuevo paciente</h2>

        <div className="space-y-3">

          <input
            name="nombres"
            placeholder="Nombres"
            onChange={handleChange}
            className="w-full border rounded-xl px-3 py-2"
          />

          <input
            name="apellidos"
            placeholder="Apellidos"
            onChange={handleChange}
            className="w-full border rounded-xl px-3 py-2"
          />

          <input
            name="cedula"
            placeholder="Cédula"
            onChange={handleChange}
            className="w-full border rounded-xl px-3 py-2"
          />

          <input
            name="celular"
            placeholder="Celular"
            onChange={handleChange}
            className="w-full border rounded-xl px-3 py-2"
          />

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              name="embarazada"
              onChange={handleChange}
            />
            Embarazada
          </label>

          <input
            name="semanas_embarazo"
            placeholder="Semanas de embarazo"
            onChange={handleChange}
            className="w-full border rounded-xl px-3 py-2"
          />

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-200"
          >
            Cancelar
          </button>

          <button
            onClick={guardar}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-pink-600 text-white"
          >
            {loading ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}