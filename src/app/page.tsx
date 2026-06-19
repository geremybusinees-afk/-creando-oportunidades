'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, ChevronRight, ShieldAlert, Star, Bell, PlayCircle, CheckCircle2, Unlock } from 'lucide-react';
import { signIn } from 'next-auth/react';

export default function LandingPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notifications, setNotifications] = useState<Array<{ id: number; name: string; country: string }>>([]);

  const nombres = [
    'Julia', 'María', 'Camila', 'Valentina', 'Sofía', 'Isabella', 'Gabriela',
    'Luciana', 'Ximena', 'Daniela', 'Fernanda', 'Alejandra', 'Paula', 'Andrea',
    'Carolina', 'Verónica', 'Patricia', 'Rosa', 'Ana', 'Claudia', 'Laura',
    'Carmen', 'Teresa', 'Elena', 'Silvia', 'Diana', 'Mónica', 'Cristina',
    'Adriana', 'Liliana', 'Mariana', 'Fabiola', 'Raquel', 'Angélica', 'Esther',
  ];

  const paises = [
    'México', 'Colombia', 'Argentina', 'Perú', 'Chile', 'Ecuador',
    'Venezuela', 'Guatemala', 'Bolivia', 'República Dominicana', 'Honduras',
    'Paraguay', 'El Salvador', 'Nicaragua', 'Costa Rica', 'Panamá',
    'Uruguay', 'Puerto Rico', 'España', 'Estados Unidos',
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      const nombre = nombres[Math.floor(Math.random() * nombres.length)];
      const pais = paises[Math.floor(Math.random() * paises.length)];
      const id = Date.now();
      setNotifications(prev => [...prev, { id, name: nombre, country: pais }]);
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, 4000);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Error al registrarse');
        setLoading(false);
        return;
      }

      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Error al iniciar sesión');
        setLoading(false);
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Error de conexión');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1120] text-white font-sans overflow-hidden relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-screen-xl h-[500px] opacity-30 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-600/20 to-transparent blur-[100px] rounded-full mix-blend-screen" />
      </div>

      <nav className="relative z-20 px-6 py-6 flex justify-between items-center max-w-7xl mx-auto border-b border-white/5">
        <div className="text-2xl font-black tracking-tighter flex items-center">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-400 mr-2 flex items-center justify-center">
            <span className="text-white text-sm">VA</span>
          </div>
          <span className="text-white">Mastery</span>
        </div>
        <div className="flex items-center space-x-4">
          <div className="hidden md:flex items-center text-sm font-medium text-slate-400">
            <Star className="w-4 h-4 text-amber-400 mr-1 fill-amber-400" />
            4.9/5 (2k+ estudiantes)
          </div>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-24 grid lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-5 relative z-10">
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 font-semibold text-sm mb-8 animate-fade-in-up">
            <span className="w-2 h-2 rounded-full bg-blue-400 mr-2 animate-pulse" />
            Oferta Gratuita por Tiempo Limitado
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold leading-[1.1] mb-6 tracking-tight animate-fade-in-up">
            Domina la Asistencia Virtual y Multiplica tus Ingresos
          </h1>
          <p className="text-lg text-slate-400 mb-8 leading-relaxed animate-fade-in-up">
            Regístrate gratis a este mini-curso y descubre el método paso a paso para conseguir clientes internacionales sin experiencia previa.
          </p>

          <div className="mb-8 animate-fade-in-up flex justify-center">
            <div className="relative group">
              <div className="absolute -inset-2 bg-gradient-to-r from-blue-500 via-cyan-400 to-purple-500 rounded-2xl blur-xl opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
              <img
                src="https://cdn.phototourl.com/free/2026-06-19-a9615207-ecc1-433d-808d-c81b10c690d1.png"
                alt="Estudiantes exitosos"
                className="relative w-72 md:w-80 lg:w-96 rounded-xl object-cover shadow-2xl border border-white/10"
              />
            </div>
          </div>

          <div className="bg-slate-800/40 backdrop-blur-xl p-8 rounded-3xl border border-slate-700/50 shadow-[0_0_40px_-15px_rgba(59,130,246,0.3)] animate-fade-in-up">
            <h3 className="text-xl font-bold mb-6 flex items-center">
              <Lock className="w-5 h-5 mr-2 text-blue-400" />
              Crea tu cuenta gratuita
            </h3>
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3 text-rose-400 text-sm">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Nombre</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-600"
                  placeholder="Tu nombre"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Correo Electrónico</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-600"
                  placeholder="tu@correo.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Contraseña</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-600"
                  placeholder="Mínimo 8 caracteres"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full relative group overflow-hidden rounded-xl bg-blue-600 text-white font-bold py-4 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-500 group-hover:opacity-90 transition-opacity" />
                <div className="relative flex items-center justify-center">
                  {loading ? (
                    <div className="flex items-center">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Creando cuenta...
                    </div>
                  ) : (
                    <>
                      Acceder al Curso Ahora
                      <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </div>
              </button>
              <div className="flex items-center justify-center text-xs text-slate-500 space-x-4 mt-4">
                <span className="flex items-center"><ShieldAlert className="w-3 h-3 mr-1" /> Acceso Inmediato</span>
                <span>•</span>
                <span>100% Gratis Hoy</span>
              </div>
            </form>
          </div>
        </div>

        <div className="lg:col-span-7 relative mt-12 lg:mt-0 lg:pl-10">
          <div className="absolute -left-8 top-1/4 z-20 bg-slate-800/80 backdrop-blur-md border border-slate-700 p-4 rounded-2xl shadow-xl animate-bounce-slow hidden md:flex items-center space-x-3">
            <div className="bg-emerald-500/20 p-2 rounded-full"><CheckCircle2 className="w-6 h-6 text-emerald-400" /></div>
            <div>
              <p className="text-sm font-bold text-white">4 Módulos</p>
              <p className="text-xs text-slate-400">Desbloqueados</p>
            </div>
          </div>
          <div className="relative z-10 transform perspective-1000 rotate-y-[-5deg] rotate-x-[2deg] hover:rotate-0 transition-transform duration-700 ease-out">
            <div className="bg-gradient-to-b from-slate-700 to-slate-900 p-[1px] rounded-3xl shadow-2xl shadow-blue-900/40">
              <div className="bg-[#0F172A] rounded-[23px] overflow-hidden relative h-[600px] flex flex-col">
                <div className="h-56 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 p-8 flex flex-col justify-end relative overflow-hidden shrink-0">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
                  <div className="inline-flex items-center space-x-2 bg-black/20 backdrop-blur-sm px-3 py-1.5 rounded-lg w-fit mb-4">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    <span className="text-xs font-medium text-blue-100">Curso Activo</span>
                  </div>
                  <h2 className="text-4xl font-black text-white relative z-10 leading-tight">Masterclass<br />Asistente Virtual</h2>
                </div>
                <div className="p-8 flex-1 overflow-hidden flex flex-col space-y-4">
                  <div className="flex items-center justify-between text-slate-400 text-sm font-medium mb-2 border-b border-slate-800 pb-4">
                    <span>Contenido del Programa</span>
                    <span>4 Clases</span>
                  </div>
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center space-x-4 p-4 bg-slate-800/30 border border-slate-700/50 rounded-xl hover:bg-slate-800/60 transition-colors">
                      <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
                        <PlayCircle className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <div className="h-2.5 w-1/4 bg-slate-600 rounded mb-2.5" />
                        <div className="h-2 w-3/4 bg-slate-700 rounded" />
                      </div>
                    </div>
                  ))}
                  <div className="mt-auto p-5 border border-emerald-500/20 rounded-xl bg-gradient-to-r from-emerald-500/10 to-transparent relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/10 blur-2xl" />
                    <span className="text-emerald-400 font-bold flex items-center relative z-10 text-lg">
                      <Unlock className="w-5 h-5 mr-2" />
                      Valorado en $147 USD - Hoy Gratis
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <div className="fixed bottom-6 left-4 md:left-6 z-50 flex flex-col-reverse gap-2 max-w-[280px] md:max-w-[320px]">
        {notifications.map((n, i) => (
          <div
            key={n.id}
            className="animate-notification-in bg-white text-slate-900 px-4 py-3 rounded-xl shadow-2xl border border-slate-200 flex items-center space-x-3"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-blue-500 flex items-center justify-center text-white shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold truncate">{n.name} *** de {n.country}</p>
              <p className="text-xs text-slate-500">se ha registrado con éxito ✓</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
