import { FormEvent, useState } from 'react';
import { Lock, Mail, User as UserIcon } from 'lucide-react';
import {
  formatAuthError,
  loginPatientWithEmail,
  loginPatientWithGoogle,
  registerPatientWithEmail,
} from '../services/authService';

interface PatientAuthFormProps {
  title?: string;
  subtitle?: string;
  compact?: boolean;
  onSuccess?: () => void;
}

export function PatientAuthForm({
  title = 'Acesse ou crie sua conta',
  subtitle = 'Entre com Google ou E-mail e senha para salvar seu cadastro clínico e acompanhar suas sessões.',
  compact = false,
  onSuccess,
}: PatientAuthFormProps) {
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginPatientWithGoogle();
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'register') {
        if (fullName.trim().length < 2) {
          throw new Error('Informe seu nome completo para criar o cadastro.');
        }
        await registerPatientWithEmail(email, password, fullName);
      } else {
        await loginPatientWithEmail(email, password);
      }
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(formatAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {!compact && (
        <div>
          <h2 className="font-display text-xl font-medium text-[#2C241E]">{title}</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-[#52473D]">{subtitle}</p>
        </div>
      )}

      {compact && (
        <div>
          <h3 className="font-display text-base font-medium text-[#2C241E]">{title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-[#52473D]">{subtitle}</p>
        </div>
      )}

      <button
        type="button"
        disabled={loading}
        onClick={handleGoogle}
        className="mt-4 flex min-h-[44px] w-full items-center justify-center gap-2.5 rounded-lg border border-[#D4C8B6] bg-[#FFFDF9] px-4 py-2.5 text-sm font-medium text-[#2C241E] hover:bg-[#F6F2EA] disabled:opacity-60 transition-colors cursor-pointer"
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
        <span>Continuar com Google</span>
      </button>

      <div className="my-4 flex items-center gap-3 text-xs text-[#665B50]">
        <span className="h-px flex-1 bg-[#E2D9CB]" />
        <span>ou com e-mail e senha</span>
        <span className="h-px flex-1 bg-[#E2D9CB]" />
      </div>

      <div className="grid grid-cols-2 gap-1 rounded-lg border border-[#E2D9CB] bg-[#F6F2EA] p-1">
        <button
          type="button"
          onClick={() => {
            setMode('register');
            setError(null);
          }}
          className={`min-h-[36px] rounded-md px-3 text-xs font-medium transition-colors cursor-pointer ${
            mode === 'register'
              ? 'bg-[#FFFDF9] text-[#2C241E] border border-[#E2D9CB]'
              : 'text-[#665B50] hover:text-[#2C241E]'
          }`}
        >
          Criar conta
        </button>
        <button
          type="button"
          onClick={() => {
            setMode('login');
            setError(null);
          }}
          className={`min-h-[36px] rounded-md px-3 text-xs font-medium transition-colors cursor-pointer ${
            mode === 'login'
              ? 'bg-[#FFFDF9] text-[#2C241E] border border-[#E2D9CB]'
              : 'text-[#665B50] hover:text-[#2C241E]'
          }`}
        >
          Já tenho conta
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
        {mode === 'register' && (
          <div>
            <label htmlFor="patientAuthName" className="block text-xs font-medium text-[#2C241E]">
              Nome completo
            </label>
            <div className="relative mt-1">
              <UserIcon className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#665B50]" />
              <input
                id="patientAuthName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Seu nome completo"
                className="min-h-[42px] w-full rounded-lg border border-[#D4C8B6] bg-[#FFFDF9] pl-9 pr-3 text-sm text-[#2C241E] focus:border-[#2F5243] focus:outline-none"
              />
            </div>
          </div>
        )}

        <div>
          <label htmlFor="patientAuthEmail" className="block text-xs font-medium text-[#2C241E]">
            E-mail
          </label>
          <div className="relative mt-1">
            <Mail className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#665B50]" />
            <input
              id="patientAuthEmail"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
              className="min-h-[42px] w-full rounded-lg border border-[#D4C8B6] bg-[#FFFDF9] pl-9 pr-3 text-sm text-[#2C241E] focus:border-[#2F5243] focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label htmlFor="patientAuthPassword" className="block text-xs font-medium text-[#2C241E]">
            Senha
          </label>
          <div className="relative mt-1">
            <Lock className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-[#665B50]" />
            <input
              id="patientAuthPassword"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="min-h-[42px] w-full rounded-lg border border-[#D4C8B6] bg-[#FFFDF9] pl-9 pr-3 text-sm text-[#2C241E] focus:border-[#2F5243] focus:outline-none"
            />
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-[#D99B9B] bg-[#FDF2F2] px-3.5 py-2.5 text-xs text-[#7A2727]"
          >
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="flex min-h-[44px] w-full items-center justify-center rounded-lg bg-[#2F5243] px-4 py-2.5 text-sm font-medium text-[#FFFDF9] hover:bg-[#244034] disabled:opacity-60 transition-colors cursor-pointer"
        >
          {loading
            ? 'Processando...'
            : mode === 'register'
            ? 'Criar conta e continuar'
            : 'Entrar e continuar'}
        </button>
      </form>
    </div>
  );
}
