import { FormEvent, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Lock,
  LogOut,
  MessageCircle,
  UserCheck,
  Video,
} from 'lucide-react';
import {
  buildPatientWhatsAppUrl,
  createAppointmentRequest,
  formatDatePtBr,
  formatFirestoreError,
  formatShortDatePtBr,
  releaseTemporarySlotHold,
} from '../services/agendaService';
import { logoutUser } from '../services/authService';
import type { AppointmentRecord, PatientProfile, PendingBookingDraft } from '../types/agenda';
import { LanternMark } from './LanternMark';
import { PatientAuthForm } from './PatientAuthForm';
import { PatientIntakeForm } from './PatientIntakeForm';

interface BookingCompletionPageProps {
  mode: 'register' | 'complete-booking';
  user: User | null;
  authReady: boolean;
  patientProfile: PatientProfile | null;
  loadingPatientProfile: boolean;
  pendingDraft: PendingBookingDraft | null;
  sessionDuration: number;
  onClearDraft: () => void;
  onBackToBooking: () => void;
  onOpenPatientPortal: () => void;
}

function formatCountdown(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function BookingCompletionPage({
  mode,
  user,
  authReady,
  patientProfile,
  loadingPatientProfile,
  pendingDraft,
  sessionDuration,
  onClearDraft,
  onBackToBooking,
  onOpenPatientPortal,
}: BookingCompletionPageProps) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<AppointmentRecord | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const remainingMs = pendingDraft ? Math.max(0, pendingDraft.expiresAtMs - nowMs) : 0;
  const isDraftActive = Boolean(pendingDraft && remainingMs > 0);

  useEffect(() => {
    if (pendingDraft && remainingMs <= 0 && !confirmedBooking) {
      onClearDraft();
    }
  }, [pendingDraft, remainingMs, confirmedBooking, onClearDraft]);

  const handleChangeSlot = async () => {
    if (pendingDraft && user) {
      await releaseTemporarySlotHold(pendingDraft.date, pendingDraft.timeSlot);
    }
    onClearDraft();
    onBackToBooking();
  };

  const finalizeBooking = async (name: string, contact: string) => {
    if (!user) {
      setError('Entre na sua conta para concluir o agendamento.');
      return;
    }
    if (!pendingDraft || remainingMs <= 0) {
      setError('O tempo de reserva de 30 minutos expirou. Escolha um novo horário na agenda.');
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const created = await createAppointmentRequest({
        date: pendingDraft.date,
        timeSlot: pendingDraft.timeSlot,
        patientUid: user.uid,
        patientName: name,
        patientContact: contact,
        notes,
      });

      setConfirmedBooking({
        id: created.id,
        date: created.date,
        timeSlot: created.timeSlot,
        modality: 'online',
        patientUid: user.uid,
        patientName: created.patientName,
        patientContact: created.patientContact,
        notes: created.notes,
        status: 'pending',
      });
      onClearDraft();
    } catch (err) {
      setError(formatFirestoreError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmExistingProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!pendingDraft) return;
    const finalName = patientProfile?.fullName || pendingDraft.patientName;
    const finalPhone =
      pendingDraft.patientPhone || patientProfile?.phone || patientProfile?.email || user?.email || '';
    await finalizeBooking(finalName, finalPhone);
  };

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F6F2EA] text-sm text-[#52473D]">
        Verificando sua sessão...
      </div>
    );
  }

  if (confirmedBooking) {
    return (
      <div className="min-h-screen bg-[#F6F2EA] px-4 py-10 sm:px-6 flex flex-col justify-center">
        <div className="mx-auto w-full max-w-2xl rounded-2xl border border-[#C9D8CD] bg-[#FFFDF9] p-6 sm:p-10">
          <div className="inline-flex items-center gap-2 text-sm font-medium text-[#2F5243]">
            <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            <span>Agendamento concluído e registrado</span>
          </div>

          <h1 className="mt-3 font-display text-2xl sm:text-3xl font-medium text-[#2C241E]">
            Recebemos seu pedido, {confirmedBooking.patientName}.
          </h1>

          <p className="mt-3 text-base leading-relaxed text-[#52473D]">
            Sua reserva foi confirmada como solicitação e sua ficha clínica ficou salva com sigilo. Assim que eu aprovar o horário, o link da sala virtual ficará disponível na sua Área do Paciente.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 rounded-xl border border-[#D4DFD7] bg-[#E9EFEA]/45 p-5 sm:grid-cols-3">
            <div>
              <p className="font-mono-tabular text-xs text-[#665B50]">Data</p>
              <p className="mt-1 font-mono-tabular text-sm font-medium text-[#2C241E]">
                {formatShortDatePtBr(confirmedBooking.date)}
              </p>
            </div>
            <div>
              <p className="font-mono-tabular text-xs text-[#665B50]">Horário</p>
              <p className="mt-1 font-mono-tabular text-sm font-medium text-[#2C241E]">
                {confirmedBooking.timeSlot} ({sessionDuration} min)
              </p>
            </div>
            <div>
              <p className="font-mono-tabular text-xs text-[#665B50]">Modalidade</p>
              <p className="mt-1 text-sm font-medium text-[#2C241E]">100% Online</p>
            </div>
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={onOpenPatientPortal}
              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-lg bg-[#2F5243] px-5 py-2.5 text-sm font-medium text-[#FFFDF9] hover:bg-[#244034] transition-colors cursor-pointer"
            >
              <UserCheck className="h-4 w-4" aria-hidden="true" />
              <span>Ir para Área do Paciente</span>
            </button>
            <a
              href={buildPatientWhatsAppUrl(confirmedBooking, sessionDuration)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-lg border border-[#2F5243] bg-[#FFFDF9] px-5 py-2.5 text-sm font-medium text-[#2F5243] hover:bg-[#E9EFEA]/60 transition-colors"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              <span>Avisar no WhatsApp</span>
            </a>
            <button
              type="button"
              onClick={onBackToBooking}
              className="inline-flex min-h-[46px] items-center justify-center rounded-lg border border-[#D4C8B6] bg-[#FFFDF9] px-5 py-2.5 text-sm font-medium text-[#2C241E] hover:bg-[#F6F2EA] transition-colors cursor-pointer"
            >
              Voltar à página inicial
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isDraftActive || !pendingDraft) {
    return (
      <div className="min-h-screen bg-[#F6F2EA] px-4 py-10 sm:px-6 flex flex-col justify-center">
        <div className="mx-auto w-full max-w-lg rounded-2xl border border-[#E2D9CB] bg-[#FFFDF9] p-6 sm:p-8 text-center">
          <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-xl border border-[#EFE0C6] bg-[#FDF4E6] text-[#B8732A]">
            <Clock className="h-5 w-5" aria-hidden="true" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-medium text-[#2C241E]">
            Reserva temporária expirada ou não iniciada
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#52473D]">
            A pré-reserva mantém o horário guardado por 30 minutos para conclusão do cadastro. Escolha um horário disponível na agenda para iniciar novamente.
          </p>
          <button
            type="button"
            onClick={onBackToBooking}
            className="mt-6 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[#2F5243] px-5 py-2.5 text-sm font-medium text-[#FFFDF9] hover:bg-[#244034] cursor-pointer"
          >
            <Calendar className="h-4 w-4" aria-hidden="true" />
            <span>Escolher horário na agenda</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F2EA] text-[#2C241E]">
      <header className="sticky top-0 z-30 border-b border-[#E2D9CB] bg-[#FFFDF9]">
        <div className="mx-auto flex min-h-[64px] max-w-4xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={onBackToBooking}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[#E2D9CB] bg-[#F6F2EA] px-3 py-1.5 text-xs font-medium text-[#2C241E] hover:bg-[#EFE4D2] cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Voltar para a agenda</span>
          </button>

          <div className="inline-flex items-center gap-2 rounded-lg border border-[#E6C79C] bg-[#FDF4E6] px-3 py-1.5 font-mono-tabular text-xs font-medium text-[#8B5314]">
            <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>Reserva ativa: {formatCountdown(remainingMs)}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 space-y-6">
        {/* Preserved Preview Summary Card */}
        <section className="rounded-2xl border border-[#C1D5C7] bg-[#E9EFEA]/55 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-mono-tabular text-xs text-[#2F5243]">
                Horário reservado por 30 minutos para você concluir
              </p>
              <h2 className="mt-1 font-display text-xl font-medium text-[#2C241E] capitalize">
                {formatDatePtBr(pendingDraft.date)} ·{' '}
                <span className="font-mono-tabular">{pendingDraft.timeSlot}</span>
              </h2>
              <p className="mt-1 text-sm text-[#52473D]">
                <span className="font-medium text-[#2C241E]">{pendingDraft.patientName}</span> ·{' '}
                <span className="font-mono-tabular">{pendingDraft.patientPhone}</span> · Atendimento 100% Online ({sessionDuration} min)
              </p>
            </div>

            <button
              type="button"
              onClick={handleChangeSlot}
              className="inline-flex min-h-[38px] items-center justify-center rounded-lg border border-[#D4C8B6] bg-[#FFFDF9] px-3.5 py-1.5 text-xs font-medium text-[#2C241E] hover:bg-[#F6F2EA] whitespace-nowrap shrink-0 cursor-pointer"
            >
              Trocar horário
            </button>
          </div>
        </section>

        {mode === 'register' || !user ? (
          <section className="mx-auto max-w-xl rounded-2xl border border-[#E2D9CB] bg-[#FFFDF9] p-6 sm:p-8">
            <div className="mb-5 flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#EFE0C6] bg-[#FDF4E6] text-[#B8732A]">
                <LanternMark className="h-5 w-5" />
              </span>
              <div>
                <h1 className="font-display text-xl font-medium text-[#2C241E]">
                  Crie seu cadastro ou entre para concluir
                </h1>
                <p className="text-xs text-[#665B50]">
                  Seus dados selecionados ({formatShortDatePtBr(pendingDraft.date)} às {pendingDraft.timeSlot}) já estão salvos na reserva acima.
                </p>
              </div>
            </div>

            <PatientAuthForm
              compact
              initialFullName={pendingDraft.patientName}
              title="Acesse com Google ou E-mail e senha"
              subtitle="Ao entrar, você seguirá automaticamente para a etapa final do seu agendamento."
            />
          </section>
        ) : (
          <section className="rounded-2xl border border-[#E2D9CB] bg-[#FFFDF9] p-6 sm:p-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-[#E2D9CB] pb-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#C1D5C7] bg-[#E9EFEA] text-[#2F5243]">
                  <Video className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h1 className="font-display text-xl font-medium text-[#2C241E]">
                    Concluir agendamento
                  </h1>
                  <p className="font-mono-tabular text-xs text-[#665B50]">
                    Conectado como {user.email}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => logoutUser()}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-lg border border-[#D4C8B6] bg-[#F6F2EA] px-3 py-1.5 text-xs font-medium text-[#2C241E] hover:bg-[#EFE4D2] cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Trocar conta</span>
              </button>
            </div>

            {loadingPatientProfile ? (
              <div className="space-y-3">
                <div className="h-12 rounded-lg bg-[#F6F2EA] animate-pulse" />
                <div className="h-28 rounded-lg bg-[#F6F2EA] animate-pulse" />
              </div>
            ) : !patientProfile?.profileCompleted ? (
              <div className="space-y-5">
                <div className="rounded-xl border border-[#E6C79C] bg-[#FDF4E6]/70 px-4 py-3 text-xs sm:text-sm leading-relaxed text-[#52473D]">
                  Como este é o seu primeiro acesso, complete sua ficha clínica complementar abaixo. Seu nome e WhatsApp da prévia já foram preenchidos e seu horário continua reservado.
                </div>

                <div>
                  <label htmlFor="notesNewPatient" className="block text-xs font-medium text-[#2C241E]">
                    Observação específica para este horário <span className="font-normal text-[#665B50]">(opcional)</span>
                  </label>
                  <input
                    id="notesNewPatient"
                    type="text"
                    maxLength={1000}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ex.: algo que queira antecipar para este encontro"
                    className="mt-1 min-h-[42px] w-full rounded-lg border border-[#D4C8B6] bg-[#FFFDF9] px-3 text-sm"
                  />
                </div>

                {error && (
                  <div
                    role="alert"
                    className="rounded-lg border border-[#D99B9B] bg-[#FDF2F2] px-4 py-3 text-sm text-[#7A2727]"
                  >
                    {error}
                  </div>
                )}

                <PatientIntakeForm
                  user={user}
                  existingProfile={patientProfile}
                  initialFullName={pendingDraft.patientName}
                  initialPhone={pendingDraft.patientPhone}
                  submitLabel={
                    submitting
                      ? 'Concluindo cadastro e agendamento...'
                      : 'Concluir cadastro e finalizar agendamento'
                  }
                  onSaved={async ({ fullName, phone }) => {
                    await finalizeBooking(fullName, phone || pendingDraft.patientPhone || user.email || '');
                  }}
                />
              </div>
            ) : (
              <form onSubmit={handleConfirmExistingProfile} className="space-y-5">
                <div className="rounded-xl border border-[#E2D9CB] bg-[#F6F2EA]/60 p-4 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-[#2C241E]">{patientProfile.fullName}</p>
                      <p className="font-mono-tabular text-xs text-[#665B50]">
                        {pendingDraft.patientPhone || patientProfile.phone} · {patientProfile.email}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onOpenPatientPortal}
                      className="text-xs font-medium text-[#2F5243] hover:underline cursor-pointer"
                    >
                      Ver / editar ficha na Área do Paciente
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="patientNotesComplete" className="block text-sm font-medium text-[#2C241E]">
                    Como você chega para este encontro?{' '}
                    <span className="font-normal text-[#665B50]">(opcional)</span>
                  </label>
                  <textarea
                    id="patientNotesComplete"
                    rows={3}
                    maxLength={1000}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Se desejar, deixe uma breve nota sobre este atendimento."
                    className="mt-1.5 block w-full rounded-lg border border-[#D4C8B6] bg-[#FFFDF9] px-3.5 py-2.5 text-sm text-[#2C241E] placeholder:text-[#9A8E80] focus:border-[#2F5243] focus:outline-none"
                  />
                </div>

                {error && (
                  <div
                    role="alert"
                    className="rounded-lg border border-[#D99B9B] bg-[#FDF2F2] px-4 py-3 text-sm text-[#7A2727]"
                  >
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex min-h-[48px] w-full items-center justify-center rounded-lg bg-[#2F5243] px-5 py-3 text-sm font-medium text-[#FFFDF9] hover:bg-[#244034] disabled:bg-[#9BA9A1] disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  {submitting ? 'Concluindo agendamento...' : 'Concluir agendamento'}
                </button>

                <p className="flex items-start gap-2 text-xs leading-relaxed text-[#665B50]">
                  <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#2F5243]" aria-hidden="true" />
                  <span>
                    Sigilo clínico garantido: suas informações e seu histórico são acessíveis apenas a você e ao psicólogo Vitor Gomes.
                  </span>
                </p>
              </form>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
