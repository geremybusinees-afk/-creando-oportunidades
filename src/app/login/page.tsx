'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError('Credenciales inválidas');
      setLoading(false);
      return;
    }

    router.push('/dashboard');
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[#0B1120] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-slate-800/40 backdrop-blur-xl p-8 rounded-3xl border border-slate-700/50">
        <h1 className="text-2xl font-bold text-white mb-6 flex items-center">
          <Lock className="w-5 h-5 mr-2 text-blue-400" />
          Iniciar Sesión
        </h1>
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3 text-rose-400 text-sm mb-4">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="password"
            placeholder="Contraseña"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-70"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        <p className="text-center text-slate-500 text-sm mt-6">
          ¿No tienes cuenta?{' '}
          <a href="/" className="text-blue-400 hover:underline">Regístrate gratis</a>
        </p>
      </div>
    </div>
  );
}
