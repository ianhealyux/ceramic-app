'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      } else if (result?.ok) {
        router.push('/upload');
        router.refresh();
      } else {
        setError('Error inesperado. Intentá de nuevo.');
      }
    } catch {
      setError('Error de conexión. Intentá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-ceramic-800">Cerámica</h1>
          <p className="mt-2 text-sm text-ceramic-500">
            Editor de fotos con IA
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
          aria-describedby={error ? 'login-error' : undefined}
        >
          <div>
            <label
              htmlFor="username"
              className="mb-1 block text-sm font-medium text-ceramic-700"
            >
              Usuario
            </label>
            <input
              id="username"
              name="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              disabled={loading}
              className="w-full rounded-lg border border-ceramic-200 bg-white px-4 py-3 text-ceramic-800 focus:border-ceramic-500 focus:outline-none focus:ring-2 focus:ring-ceramic-500/20 disabled:opacity-50"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-ceramic-700"
            >
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              disabled={loading}
              className="w-full rounded-lg border border-ceramic-200 bg-white px-4 py-3 text-ceramic-800 focus:border-ceramic-500 focus:outline-none focus:ring-2 focus:ring-ceramic-500/20 disabled:opacity-50"
            />
          </div>

          {error && (
            <p
              id="login-error"
              role="alert"
              aria-live="assertive"
              className="rounded-lg bg-red-50 p-3 text-sm text-red-600"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="mt-2 rounded-lg bg-ceramic-600 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-ceramic-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
