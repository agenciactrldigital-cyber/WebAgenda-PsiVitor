import { FormEvent, useState } from 'react';
import { ArrowLeft, Lock, Mail } from 'lucide-react';
import {
  formatAuthError,
  getAuthorizedEmails,
  loginWithEmail,
  loginWithGoogle,
} from '../services/authService';
import { LanternMark } from './LanternMark';

interface AdminLoginProps {
  onBackToPublic: () => void;
  initialError?: string | null;
}

export function AdminLogin({ onBackToPublic, initialError = null }: AdminLoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  const authorizedEmails = getAuthorizedEmails();

  const handleEmailLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await loginWithEmail(email, password);
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F2EA] px-4 py-10 sm:px-6 flex flex-col justify-center">
      <div className="mx-auto w-full max-w-md">
        <button
          type="button"
          onClick={onBackToPublic}
          className="inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-[#52473D] hover:text-[#2C241E] transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          <span>Voltar para a página pública</span>
        </button>

        <div className="mt-4 rounded-2xl border border-[#E2D9CB] bg-[#FFFDF9] p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#FDF4E6] text-[#B8732A] border border-[#EFE0C6]">
              <LanternMark className="h-5 w-5" />
            </span>
            <div>
              <h1 className="font-display text-xl font-medium text-[#2C241E]">
                Área do Psicólogo
              </h1>
              <p className="font-mono-tabular text-xs text-[#665B50]">
                Vitor Gomes · CRP 11/20859
              </p>
            </div>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-[#52473D]">
            Acesso restrito para gestão de solicitações de atendimento online, horários flexíveis e grupo terapêutico.
          </p>

          <button
            type="button"
            disabled={loading}
            onClick={handleGoogleLogin}
            className="mt-6 flex min-h-[46px] w-full items-center justify-center gap-2.5 rounded-lg border border-[#D4C8B6] bg-[#FFFDF9] px-4 py-2.5 text-sm font-medium text-[#2C241E] hover:bg-[#F6F2EA] disabled:opacity-60 transition-colors cursor-pointer"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.91 6.72-4.91Z"
              />
            </svg>
            <span>Entrar com Google</span>
          </button>

          <div className="my-6 flex items-center gap-3 text-xs text-[#665B50]">
            <span className="h-px flex-1 bg-[#E2D9CB]" />
            <span>ou com e-mail e senha</span>
            <span className="h-px flex-1 bg-[#E2D9CB]" />
          </div>

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label htmlFor="adminEmail" className="block text-sm font-medium text-[#2C241E]">
                E-mail autorizado
              </label>
              <div className="relative mt-1.5">
                <Mail className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-[#665B50]" />
                <input
                  id="adminEmail"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="psi.vitorgomes@gmail.com"
                  className="block min-h-[44px] w-full rounded-lg border border-[#D4C8B6] bg-[#FFFDF9] pl-10 pr-3.5 py-2 text-sm text-[#2C241E] focus:border-[#2F5243] focus:outline-none focus:ring-2 focus:ring-[#2F5243]/20"
                />
              </div>
            </div>

            <div>
              <label htmlFor="adminPassword" className="block text-sm font-medium text-[#2C241E]">
                Senha
              </label>
              <div className="relative mt-1.5">
                <Lock className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-[#665B50]" />
                <input
                  id="adminPassword"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block min-h-[44px] w-full rounded-lg border border-[#D4C8B6] bg-[#FFFDF9] pl-10 pr-3.5 py-2 text-sm text-[#2C241E] focus:border-[#2F5243] focus:outline-none focus:ring-2 focus:ring-[#2F5243]/20"
                />
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-lg border border-[#D99B9B] bg-[#FDF2F2] px-4 py-3 text-xs sm:text-sm text-[#7A2727]"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex min-h-[46px] w-full items-center justify-center rounded-lg bg-[#2F5243] px-4 py-2.5 text-sm font-medium text-[#FFFDF9] hover:bg-[#244034] disabled:opacity-60 transition-colors cursor-pointer"
            >
              {loading ? 'Autenticando...' : 'Entrar no painel'}
            </button>
          </form>

          <p className="mt-5 border-t border-[#E2D9CB] pt-4 text-xs leading-relaxed text-[#665B50]">
            Contas liberadas atualmente (<span className="font-mono-tabular">VITE_PSYCHOLOGIST_EMAILS</span>):{' '}
            <span className="font-mono-tabular text-[#2C241E]">{authorizedEmails.join(', ')}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
