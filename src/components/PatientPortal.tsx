import { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  LogOut,
  RefreshCw,
  UserCheck,
  Video,
  XCircle,
} from 'lucide-react';
import {
  formatDatePtBr,
  formatShortDatePtBr,
  subscribePatientAppointments,
} from '../services/agendaService';
import { logoutUser } from '../services/authService';
import type {
  AppointmentRecord,
  AppointmentStatus,
  ClinicSettings,
  PatientProfile,
} from '../types/agenda';
import { LanternMark } from './LanternMark';
import { PatientAuthForm } from './PatientAuthForm';
import { PatientIntakeForm } from './PatientIntakeForm';

interface PatientPortalProps {
  user: User | null;
  authReady: boolean;
  patientProfile: PatientProfile | null;
  sessionDuration: number;
  clinicSettings: ClinicSettings;
  onBackToPublic: () => void;
  onBookNewSession: () => void;
}

const STATUS_META: Record<
  AppointmentStatus,
  { label: string; className: string; icon: typeof Clock }
> = {
  pending: {
    label: 'Aguardando confirmação',
    className: 'border-[#E6C79C] bg-[#FDF4E6] text-[#8B5314]',
    icon: Clock,
  },
  confirmed: {
    label: 'Confirmada',
    className: 'border-[#C1D5C7] bg-[#E9EFEA] text-[#264738]',
    icon: CheckCircle2,
  },
  completed: {
    label: 'Concluída',
    className: 'border-[#D1CEC7] bg-[#EFECE5] text-[#473E35]',
    icon: Check,
  },
  rescheduled: {
    label: 'Reagendada',
    className: 'border-[#CBD5E1] bg-[#F1F5F9] text-[#334155]',
    icon: RefreshCw,
  },
  cancelled: {
    label: 'Cancelada',
    className: 'border-[#E5BABA] bg-[#FDF2F2] text-[#7A2727]',
    icon: XCircle,
  },
};

export function PatientPortal({
  user,
  authReady,
  patientProfile,
  sessionDuration,
  clinicSettings,
  onBackToPublic,
  onBookNewSession,
}: PatientPortalProps) {
  const [activeTab, setActiveTab] = useState<'sessions' | 'profile'>('sessions');
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setAppointments([]);
      setLoadingAppointments(false);
      return;
    }
    setLoadingAppointments(true);
    const unsub = subscribePatientAppointments(
      user.uid,
      (list: AppointmentRecord[]) => {
        setAppointments(list);
        setLoadingAppointments(false);
        setError(null);
      },
      (errMsg: string) => {
        setError(errMsg);
        setLoadingAppointments(false);
      }
    );
    return () => unsub();
  }, [user]);

  const counts = useMemo(() => {
    return appointments.reduce(
      (acc, item) => {
        acc.total += 1;
        acc[item.status] = (acc[item.status] || 0) + 1;
        return acc;
      },
      { total: 0, pending: 0, confirmed: 0, completed: 0, rescheduled: 0, cancelled: 0 }
    );
  }, [appointments]);

  const nextUpcoming = useMemo(() => {
    const active = appointments
      .filter((a) => a.status === 'confirmed' || a.status === 'pending')
      .slice()
      .sort((a, b) => (a.date !== b.date ? a.date.localeCompare(b.date) : a.timeSlot.localeCompare(b.timeSlot)));
    return active[0] || null;
  }, [appointments]);

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F6F2EA] text-sm text-[#52473D]">
        Carregando sua área...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F6F2EA] px-4 py-10 sm:px-6 flex flex-col justify-center">
        <div className="mx-auto w-full max-w-md">
          <button
            type="button"
            onClick={onBackToPublic}
            className="inline-flex min-h-[44px] items-center gap-2 text-sm font-medium text-[#52473D] hover:text-[#2C241E] cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            <span>Voltar ao site</span>
          </button>

          <div className="mt-4 rounded-2xl border border-[#E2D9CB] bg-[#FFFDF9] p-6 sm:p-8">
            <div className="mb-5 flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#FDF4E6] text-[#B8732A] border border-[#EFE0C6]">
                <LanternMark className="h-5 w-5" />
              </span>
              <div>
                <h1 className="font-display text-lg font-medium text-[#2C241E]">
                  Área do Paciente
                </h1>
                <p className="font-mono-tabular text-xs text-[#665B50]">
                  {clinicSettings.psychologistName} · {clinicSettings.crp}
                </p>
              </div>
            </div>

            <PatientAuthForm
              title="Entre ou crie seu cadastro"
              subtitle="Acesse seu histórico individual de atendimentos, o link da sala virtual e sua ficha clínica."
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F2EA] text-[#2C241E]">
      <header className="sticky top-0 z-30 border-b border-[#E2D9CB] bg-[#FFFDF9]">
        <div className="mx-auto flex min-h-[64px] max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToPublic}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[#E2D9CB] bg-[#F6F2EA] px-3 py-1.5 text-xs font-medium text-[#2C241E] hover:bg-[#EFE4D2] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Site</span>
            </button>
            <div>
              <p className="font-display text-base sm:text-lg font-medium text-[#2C241E] leading-tight">
                Área do Paciente
              </p>
              <p className="font-mono-tabular text-xs text-[#665B50] truncate max-w-[180px] sm:max-w-none">
                {patientProfile?.fullName || user.displayName || user.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onBookNewSession}
              className="inline-flex min-h-[40px] items-center rounded-lg bg-[#2F5243] px-3.5 py-2 text-xs font-medium text-[#FFFDF9] hover:bg-[#244034] whitespace-nowrap cursor-pointer"
            >
              Agendar sessão
            </button>
            <button
              type="button"
              onClick={() => logoutUser()}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[#D4C8B6] bg-[#FFFDF9] px-3 py-2 text-xs font-medium text-[#2C241E] hover:bg-[#F6F2EA] whitespace-nowrap cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {!patientProfile?.profileCompleted ? (
          <div className="rounded-2xl border border-[#E2D9CB] bg-[#FFFDF9] p-6 sm:p-8">
            <div className="mb-6 max-w-2xl">
              <div className="inline-flex items-center gap-2 text-xs font-mono-tabular text-[#B8732A]">
                <UserCheck className="h-4 w-4" aria-hidden="true" />
                <span>Cadastro Clínico Complementar</span>
              </div>
              <h1 className="mt-2 font-display text-2xl font-medium text-[#2C241E]">
                Complete sua ficha inicial
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-[#52473D]">
                Para oferecer um acompanhamento psicológico seguro e ético, preencha abaixo as informações essenciais que ficam salvas com sigilo para o psicólogo {clinicSettings.psychologistName}.
              </p>
            </div>

            <PatientIntakeForm
              user={user}
              existingProfile={patientProfile}
              submitLabel="Concluir meu cadastro clínico"
            />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-1.5 rounded-xl border border-[#E2D9CB] bg-[#EFE4D2]/50 p-1.5 w-fit">
              <button
                type="button"
                onClick={() => setActiveTab('sessions')}
                className={`min-h-[40px] rounded-lg px-4 py-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'sessions'
                    ? 'bg-[#FFFDF9] text-[#2C241E] border border-[#E2D9CB]'
                    : 'text-[#665B50] hover:text-[#2C241E]'
                }`}
              >
                Minhas Sessões e Histórico ({counts.total})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className={`min-h-[40px] rounded-lg px-4 py-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === 'profile'
                    ? 'bg-[#FFFDF9] text-[#2C241E] border border-[#E2D9CB]'
                    : 'text-[#665B50] hover:text-[#2C241E]'
                }`}
              >
                Meu Cadastro Clínico
              </button>
            </div>

            {activeTab === 'sessions' && (
              <div className="mt-6 space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: 'Confirmadas', value: counts.confirmed },
                    { label: 'Concluídas', value: counts.completed },
                    { label: 'Reagendadas', value: counts.rescheduled },
                    { label: 'Canceladas', value: counts.cancelled },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-xl border border-[#E2D9CB] bg-[#FFFDF9] p-4"
                    >
                      <p className="font-mono-tabular text-xs text-[#665B50]">{stat.label}</p>
                      <p className="mt-1 font-mono-tabular text-2xl font-medium text-[#2C241E]">
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Next Upcoming Session Spotlight */}
                {nextUpcoming && (
                  <div className="rounded-2xl border border-[#C1D5C7] bg-[#E9EFEA]/55 p-6">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-mono-tabular text-xs text-[#2F5243]">
                          Próximo encontro · {STATUS_META[nextUpcoming.status]?.label}
                        </p>
                        <h2 className="mt-1 font-display text-xl font-medium text-[#2C241E] capitalize">
                          {formatDatePtBr(nextUpcoming.date)} às{' '}
                          <span className="font-mono-tabular">{nextUpcoming.timeSlot}</span>
                        </h2>
                        <p className="mt-1 text-sm text-[#52473D]">
                          Sessão individual online ({sessionDuration} min)
                        </p>
                      </div>

                      {nextUpcoming.meetingLink ? (
                        <a
                          href={nextUpcoming.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[#2F5243] px-5 py-2.5 text-sm font-medium text-[#FFFDF9] hover:bg-[#244034] whitespace-nowrap shrink-0"
                        >
                          <Video className="h-4 w-4" aria-hidden="true" />
                          <span>Entrar na sala virtual</span>
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        </a>
                      ) : (
                        <span className="text-xs text-[#52473D]">
                          O link da sala virtual ficará disponível aqui após a confirmação do psicólogo.
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {error && (
                  <div
                    role="alert"
                    className="rounded-xl border border-[#E5BABA] bg-[#FDF2F2] p-4 text-sm text-[#7A2727]"
                  >
                    {error}
                  </div>
                )}

                {/* Full Individual History */}
                <div className="rounded-2xl border border-[#E2D9CB] bg-[#FFFDF9] p-6">
                  <h2 className="font-display text-xl font-medium text-[#2C241E]">
                    Histórico de atendimentos
                  </h2>
                  <p className="mt-1 text-sm text-[#52473D]">
                    Acompanhe todas as suas solicitações, sessões confirmadas, concluídas, reagendadas e canceladas.
                  </p>

                  {loadingAppointments ? (
                    <div className="mt-5 space-y-3">
                      {[1, 2].map((i) => (
                        <div key={i} className="h-20 rounded-xl bg-[#F6F2EA] animate-pulse" />
                      ))}
                    </div>
                  ) : appointments.length === 0 ? (
                    <div className="mt-6 rounded-xl border border-[#E2D9CB] bg-[#F6F2EA]/50 p-6 text-center">
                      <p className="font-display text-lg text-[#2C241E]">
                        Você ainda não possui sessões registradas
                      </p>
                      <p className="mt-1 text-sm text-[#665B50]">
                        Escolha um horário disponível na agenda online para iniciar seu acompanhamento.
                      </p>
                      <button
                        type="button"
                        onClick={onBookNewSession}
                        className="mt-4 inline-flex min-h-[42px] items-center rounded-lg bg-[#2F5243] px-5 py-2 text-sm font-medium text-[#FFFDF9] hover:bg-[#244034] cursor-pointer"
                      >
                        Ver horários disponíveis
                      </button>
                    </div>
                  ) : (
                    <div className="mt-5 divide-y divide-[#E2D9CB]">
                      {appointments.map((item) => {
                        const meta = STATUS_META[item.status] || STATUS_META.pending;
                        const Icon = meta.icon;
                        return (
                          <div
                            key={item.id}
                            className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2.5">
                                <span className="inline-flex items-center gap-1.5 font-mono-tabular text-sm font-medium text-[#2C241E]">
                                  <Calendar className="h-4 w-4 text-[#2F5243]" aria-hidden="true" />
                                  {formatShortDatePtBr(item.date)} · {item.timeSlot}
                                </span>
                                <span
                                  className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-0.5 text-xs font-medium ${meta.className}`}
                                >
                                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                                  <span>{meta.label}</span>
                                </span>
                              </div>
                              {item.notes && (
                                <p className="text-xs sm:text-sm text-[#52473D]">{item.notes}</p>
                              )}
                            </div>

                            {item.meetingLink && item.status === 'confirmed' && (
                              <a
                                href={item.meetingLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-[#2F5243] bg-[#E9EFEA] px-3.5 py-1.5 text-xs font-medium text-[#2F5243] hover:bg-[#DCE6DF] whitespace-nowrap shrink-0"
                              >
                                <Video className="h-3.5 w-3.5" aria-hidden="true" />
                                <span>Acessar sala</span>
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="mt-6 rounded-2xl border border-[#E2D9CB] bg-[#FFFDF9] p-6 sm:p-8">
                <h2 className="font-display text-xl font-medium text-[#2C241E]">
                  Meu Cadastro Clínico
                </h2>
                <p className="mt-1 mb-6 text-sm text-[#52473D]">
                  Mantenha seu telefone, contato de emergência e informações clínicas sempre atualizados para o psicólogo.
                </p>
                <PatientIntakeForm
                  user={user}
                  existingProfile={patientProfile}
                  submitLabel="Atualizar meus dados"
                />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
