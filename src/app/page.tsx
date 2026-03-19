export default function HomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Inicio</h2>
        <p className="mt-1 text-sm text-slate-500">
          Resumen general de la actividad de AsoBaby.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Pacientes hoy</p>
          <h3 className="mt-3 text-3xl font-semibold">12</h3>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Citas pendientes</p>
          <h3 className="mt-3 text-3xl font-semibold">8</h3>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Ingresos del día</p>
          <h3 className="mt-3 text-3xl font-semibold">$245.00</h3>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Servicios realizados</p>
          <h3 className="mt-3 text-3xl font-semibold">9</h3>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold">Próximas citas</h3>
          <div className="mt-4 space-y-3">
            {["Mayra Canto - 10:00", "Alejandra Camacho - 11:30", "Ana Salazar - 14:00"].map((item) => (
              <div
                key={item}
                className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"
              >
                <span className="text-sm font-medium">{item}</span>
                <span className="text-xs text-slate-500">Hoy</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-lg font-semibold">Actividad reciente</h3>
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-sm font-medium">Nuevo paciente registrado</p>
              <p className="text-xs text-slate-500">Hace 10 min</p>
            </div>
            <div>
              <p className="text-sm font-medium">Pago registrado</p>
              <p className="text-xs text-slate-500">Hace 25 min</p>
            </div>
            <div>
              <p className="text-sm font-medium">Cita confirmada</p>
              <p className="text-xs text-slate-500">Hace 40 min</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}