'use client';

import { useState, useEffect, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, AlertCircle, Loader2, ShieldCheck } from 'lucide-react';

/** Traduce códigos de error de NextAuth + errores del backend a mensajes claros en español */
function getErrorMessage(errorCode: string | undefined): string {
  if (!errorCode) return 'Error desconocido al iniciar sesión';

  // Errores específicos lanzados desde authorize() en auth.ts
  const customMessages: Record<string, string> = {
    USUARIO_NO_ENCONTRADO:
      'No existe ninguna cuenta con ese email. ¿Ya te registraste? Ve a la página principal para crear tu cuenta.',
    CONTRASENA_INCORRECTA:
      'La contraseña es incorrecta. Verifica que esté bien escrita (el Bloq Mayús puede estar activado).',
    ERROR_BASE_DE_DATOS:
      'El servidor no pudo conectar con la base de datos. Intenta de nuevo en unos segundos.',
    ERROR_VERIFICACION:
      'Error interno al verificar la contraseña. Intenta de nuevo.',
    INGRESA_EMAIL_Y_CONTRASENA:
      'Debes ingresar tu email y contraseña.',
  };

  if (customMessages[errorCode]) {
    return customMessages[errorCode];
  }

  // Errores estándar de NextAuth
  const nextAuthMessages: Record<string, string> = {
    CredentialsSignin:
      'Email o contraseña incorrectos. Verifica tus credenciales e intenta de nuevo.',
    CallbackRouteError:
      'Error del servidor al validar credenciales. Intenta de nuevo en unos segundos.',
    AccessDenied:
      'Acceso denegado. Tu cuenta no tiene permisos para acceder.',
    Configuration:
      'Error de configuración del servidor. Contacta al administrador.',
    Verification:
      'Tu cuenta aún no ha sido verificada.',
    OAuthSignin: 'Error al iniciar con el proveedor externo.',
    OAuthCallback: 'Error en la respuesta del proveedor externo.',
    OAuthCreateAccount: 'No se pudo crear la cuenta con el proveedor externo.',
    EmailCreateAccount: 'No se pudo crear la cuenta con ese email.',
    SessionRequired: 'Debes iniciar sesión para acceder.',
    Default:
      'Error al iniciar sesión. Verifica tu conexión y vuelve a intentarlo.',
  };

  return nextAuthMessages[errorCode] || nextAuthMessages.Default;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Leer error de URL: NextAuth redirige con ?error=CredentialsSignin&code=XXX
  useEffect(() => {
    const urlError = searchParams.get('error');
    const urlCode = searchParams.get('code');
    // Priorizar el `code` (más específico), luego `error` (genérico NextAuth)
    if (urlCode) {
      setError(getErrorMessage(urlCode));
    } else if (urlError) {
      setError(getErrorMessage(urlError));
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // redirect: false = NextAuth no recarga la página.
      // Si authorize() lanza CredentialsSignin, result.error será "CredentialsSignin".
      // En ese caso mostramos un mensaje genérico útil (getErrorMessage ya lo maneja).
      const result = await signIn('credentials', {
        email: email.toLowerCase().trim(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(getErrorMessage(result.error));
        setLoading(false);
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch {
      setError('Error de conexión. Verifica tu internet e intenta de nuevo.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1120] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-slate-800/40 backdrop-blur-xl p-8 rounded-3xl border border-slate-700/50 shadow-[0_0_40px_-15px_rgba(59,130,246,0.15)]">
        {/* Cabecera */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
            <Lock className="w-7 h-7 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">Iniciar Sesión</h1>
          <p className="text-slate-400 text-sm mt-1.5">
            Ingresa tus credenciales para acceder al curso
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3.5 mb-5 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-rose-300 text-sm font-medium leading-relaxed">
                {error}
              </p>
              {error.includes('Email o contraseña') && (
                <p className="text-rose-400/70 text-xs mt-1.5">
                  Consejo: Asegúrate de que el email esté bien escrito y que el
                  Bloq Mayús no esté activado.
                </p>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label
              htmlFor="login-email"
              className="block text-sm font-medium text-slate-400 mb-2"
            >
              Correo Electrónico
            </label>
            <input
              id="login-email"
              type="email"
              placeholder="tu@correo.com"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError('');
              }}
              className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3.5 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Contraseña */}
          <div>
            <label
              htmlFor="login-password"
              className="block text-sm font-medium text-slate-400 mb-2"
            >
              Contraseña
            </label>
            <input
              id="login-password"
              type="password"
              placeholder="Tu contraseña"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError('');
              }}
              className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3.5 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Botón */}
          <button
            type="submit"
            disabled={loading}
            className="w-full relative group overflow-hidden rounded-xl bg-blue-600 text-white font-bold py-4 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100 disabled:cursor-wait"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-500 group-hover:opacity-90 transition-opacity" />
            <span className="relative flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Verificando credenciales...
                </>
              ) : (
                'Entrar'
              )}
            </span>
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-slate-500 text-sm mt-6">
          ¿No tienes cuenta?{' '}
          <a href="/" className="text-blue-400 hover:text-blue-300 font-semibold underline underline-offset-2 transition-colors">
            Regístrate gratis
          </a>
        </p>

        {/* Admin hint sutil */}
        <div className="mt-6 pt-5 border-t border-slate-700/50">
          <p className="text-center text-slate-600 text-xs flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            ¿Eres administrador? Asegúrate de que el usuario admin existe en la
            base de datos.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0B1120] flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
