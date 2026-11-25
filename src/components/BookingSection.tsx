import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Lock,
  MessageCircle,
  UserCheck,
  Video,
} from 'lucide-react';
import {
  buildPatientWhatsAppUrl,
  createAppointmentRequest,
  filterPastSlotsForToday,
  formatDatePtBr,
  formatFirestoreError,
  formatShortDatePtBr,
  getSlotsForDate,
  getTodayIsoLocal,
  isDateSelectable,
} from '../services/agendaService';
import type { AppointmentRecord, AvailabilityConfig, PatientProfile } from '../types/agenda';
import { PatientAuthForm } from './PatientAuthForm';
import { PatientIntakeForm } from './PatientIntakeForm';

interface BookingSectionProps {
  availability: AvailabilityConfig;
  occupiedSlots: Set<string>;
  loadingAvailability: boolean;
  currentUser: User | null;
  patientProfile: PatientProfile | null;
  loadingPatientProfile: boolean;
  onOpenPatientPortal: () => void;
}

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const MONTH_FORMATTER = new Intl.DateTimeFormat('pt-BR', {
  month: 'long',
  year: 'numeric',
});

function toIsoDate(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function BookingSection({
  availability,
  occupiedSlots,
  loadingAvailability,
  currentUser,
  patientProfile,
  loadingPatientProfile,
  onOpenPatientPortal,
}: BookingSectionProps) {
  const today = useMemo(() => new Date(), []);
  const [viewMonth, setViewMonth] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  });

  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<AppointmentRecord | null>(null);

  useEffect(() => {
    if (loadingAvailability || selectedDate) return;
    const base = new Date();
    for (let offset = 0; offset < 45; offset += 1) {
      const candidate = new Date(base.getFullYear(), base.getMonth(), base.getDate() + offset, 12, 0, 0);
      const iso = toIsoDate(candidate.getFullYear(), candidate.getMonth(), candidate.getDate());
      if (isDateSelectable(availability, iso)) {
        const daySlots = filterPastSlotsForToday(getSlotsForDate(availability, iso), iso).filter(
          (slot: string) => !occupiedSlots.has(`${iso}_${slot}`)
        );
        if (daySlots.length > 0) {
          setSelectedDate(iso);
          setViewMonth({ year: candidate.getFullYear(), month: candidate.getMonth() });
          return;
        }
      }
    }
  }, [availability, occupiedSlots, loadingAvailability, selectedDate]);

  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(viewMonth.year, viewMonth.month, 1, 12, 0, 0);
    const startWeekday = firstDayOfMonth.getDay();
    const totalDays = new Date(viewMonth.year, viewMonth.month + 1, 0).getDate();

    const cells: Array<{ day: number | null; iso: string | null }> = [];
    for (let i = 0; i < startWeekday; i += 1) {
      cells.push({ day: null, iso: null });
    }
    for (let d = 1; d <= totalDays; d += 1) {
      cells.push({ day: d, iso: toIsoDate(viewMonth.year, viewMonth.month, d) });
    }
    return cells;
  }, [viewMonth]);

  const availableTimeSlots = useMemo(() => {
    if (!selectedDate) return [];
    const configured = getSlotsForDate(availability, selectedDate);
    const futureOnly = filterPastSlotsForToday(configured, selectedDate);
    return futureOnly.filter((slot: string) => !occupiedSlots.has(`${selectedDate}_${slot}`));
  }, [availability, occupiedSlots, selectedDate]);

  useEffect(() => {
    if (selectedTime && !availableTimeSlots.includes(selectedTime)) {
      setSelectedTime('');
    }
  }, [availableTimeSlots, selectedTime]);

  const canGoPrevMonth =
    viewMonth.year > today.getFullYear() ||
    (viewMonth.year === today.getFullYear() && viewMonth.month > today.getMonth());

  const handleChangeMonth = (delta: number) => {
    setViewMonth((prev) => {
      const next = new Date(prev.year, prev.month + delta, 1, 12, 0, 0);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  };

  const handleSelectDate = (iso: string) => {
    setSelectedDate(iso);
    setSelectedTime('');
    setFormError(null);
  };

  const finalizeBooking = async (name: string, contact: string) => {
    if (!currentUser) {
      setFormError('Faça login antes de confirmar o agendamento.');
      return;
    }
    if (!selectedDate || !selectedTime) {
      setFormError('Escolha uma data e um horário disponível antes de enviar.');
      return;
    }

    setFormError(null);
    setSubmitting(true);
    try {
      const created = await createAppointmentRequest({
        date: selectedDate,
        timeSlot: selectedTime,
        patientUid: currentUser.uid,
        patientName: name,
        patientContact: contact,
        notes,
      });
      setConfirmedBooking({
        id: created.id,
        date: created.date,
        timeSlot: created.timeSlot,
        modality: 'online',
        patientUid: currentUser.uid,
        patientName: created.patientName,
        patientContact: created.patientContact,
        notes: created.notes,
        status: 'pending',
      });
      setNotes('');
      setSelectedTime('');
    } catch (error) {
      setFormError(formatFirestoreError(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmExistingProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!patientProfile) return;
    await finalizeBooking(patientProfile.fullName, patientProfile.phone || patientProfile.email);
  };

  const todayIso = getTodayIsoLocal();
  const monthLabel = MONTH_FORMATTER.format(new Date(viewMonth.year, viewMonth.month, 1, 12, 0, 0));

  return (
    <section id="agendar" className="border-b border-[#E2D9CB] bg-[#FFFDF9] py-14 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="font-mono-tabular text-xs tracking-wide text-[#665B50]">
            Agendamento de Psicoterapia Individual
          </p>
          <h2 className="mt-2 font-display text-2xl sm:text-3xl font-medium text-[#2C241E] text-balance">
            Escolha um horário para o seu encontro online
          </h2>
          <p className="mt-3 text-base text-[#52473D]">
            Escolha livremente sua data e horário. Para concluir a reserva e salvar sua ficha clínica com sigilo, você entrará na sua conta (Google ou E-mail/Senha) na etapa final.
          </p>
        </div>

        {confirmedBooking ? (
          <div className="mt-10 rounded-2xl border border-[#C9D8CD] bg-[#E9EFEA]/55 p-6 sm:p-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-xl">
                <div className="inline-flex items-center gap-2 text-sm font-medium text-[#2F5243]">
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                  <span>Solicitação registrada na sua Área do Paciente</span>
                </div>

                <h3 className="mt-3 font-display text-2xl font-medium text-[#2C241E]">
                  Recebemos o seu pedido, {confirmedBooking.patientName}.
                </h3>

                <p className="mt-3 text-base leading-relaxed text-[#52473D]">
                  Sua ficha clínica e solicitação foram salvas com sigilo. Assim que eu confirmar o horário, você receberá meu contato e o link da sala virtual ficará disponível na sua Área do Paciente.
                </p>

                <div className="mt-6 grid grid-cols-1 gap-4 rounded-xl border border-[#D4DFD7] bg-[#FFFDF9] p-5 sm:grid-cols-3">
                  <div>
                    <p className="font-mono-tabular text-xs text-[#665B50]">Data</p>
                    <p className="mt-1 font-mono-tabular text-sm font-medium text-[#2C241E]">
                      {formatShortDatePtBr(confirmedBooking.date)}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono-tabular text-xs text-[#665B50]">Horário</p>
                    <p className="mt-1 font-mono-tabular text-sm font-medium text-[#2C241E]">
                      {confirmedBooking.timeSlot} ({availability.sessionDuration} min)
                    </p>
                  </div>
                  <div>
                    <p className="font-mono-tabular text-xs text-[#665B50]">Atendimento</p>
                    <p className="mt-1 text-sm font-medium text-[#2C241E]">100% Online</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:min-w-[280px]">
                <button
                  type="button"
                  onClick={onOpenPatientPortal}
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[#2F5243] px-5 py-3 text-sm font-medium text-[#FFFDF9] hover:bg-[#244034] transition-colors whitespace-nowrap cursor-pointer"
                >
                  <UserCheck className="h-4 w-4" aria-hidden="true" />
                  <span>Ir para Área do Paciente</span>
                </button>
                <a
                  href={buildPatientWhatsAppUrl(confirmedBooking, availability.sessionDuration)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-[#2F5243] bg-[#FFFDF9] px-5 py-3 text-sm font-medium text-[#2F5243] hover:bg-[#E9EFEA]/60 transition-colors whitespace-nowrap"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  <span>Enviar aviso pelo WhatsApp</span>
                </a>
                <button
                  type="button"
                  onClick={() => setConfirmedBooking(null)}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[#D4C8B6] bg-[#FFFDF9] px-5 py-3 text-sm font-medium text-[#2C241E] hover:bg-[#F6F2EA] transition-colors cursor-pointer"
                >
                  Solicitar outro horário
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
            {/* Column 1: Calendar & Free Time Slots (always visible before login) */}
            <div className="rounded-2xl border border-[#E2D9CB] bg-[#F6F2EA]/55 p-5 sm:p-7 lg:col-span-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E2D9CB] pb-4">
                <div className="flex items-center gap-2.5">
                  <Calendar className="h-4 w-4 text-[#2F5243]" aria-hidden="true" />
                  <h3 className="font-display text-lg font-medium capitalize text-[#2C241E]">
                    {monthLabel}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleChangeMonth(-1)}
                    disabled={!canGoPrevMonth}
                    aria-label="Mês anterior"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#E2D9CB] bg-[#FFFDF9] text-[#2C241E] hover:bg-[#EFE4D2]/60 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChangeMonth(1)}
                    aria-label="Próximo mês"
                    className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#E2D9CB] bg-[#FFFDF9] text-[#2C241E] hover:bg-[#EFE4D2]/60 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-7 gap-1 text-center">
                {WEEKDAY_LABELS.map((label) => (
                  <div key={label} className="py-1.5 font-mono-tabular text-xs font-medium text-[#665B50]">
                    {label}
                  </div>
                ))}

                {loadingAvailability ? (
                  Array.from({ length: 35 }).map((_, idx) => (
                    <div
                      key={idx}
                      className="h-11 rounded-lg bg-[#E2D9CB]/40 animate-pulse"
                      aria-hidden="true"
                    />
                  ))
                ) : (
                  calendarDays.map((cell, index) => {
                    if (!cell.day || !cell.iso) {
                      return <div key={`empty-${index}`} className="h-11" />;
                    }

                    const selectable = isDateSelectable(availability, cell.iso);
                    const dayFreeSlots = selectable
                      ? filterPastSlotsForToday(getSlotsForDate(availability, cell.iso), cell.iso).filter(
                          (slot: string) => !occupiedSlots.has(`${cell.iso}_${slot}`)
                        )
                      : [];
                    const hasOpenSlots = dayFreeSlots.length > 0;
                    const isSelected = selectedDate === cell.iso;
                    const isToday = cell.iso === todayIso;
                    const hasOverride = Boolean(availability.dateOverrides?.[cell.iso]);

                    return (
                      <button
                        key={cell.iso}
                        type="button"
                        disabled={!hasOpenSlots}
                        onClick={() => handleSelectDate(cell.iso!)}
                        aria-label={`${cell.day} — ${hasOpenSlots ? `${dayFreeSlots.length} horários disponíveis` : 'indisponível'}`}
                        className={`relative flex h-11 items-center justify-center rounded-lg font-mono-tabular text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F5243] ${
                          isSelected
                            ? 'bg-[#2F5243] font-medium text-[#FFFDF9]'
                            : hasOpenSlots
                            ? 'bg-[#FFFDF9] text-[#2C241E] border border-[#E2D9CB] hover:border-[#2F5243] hover:bg-[#E9EFEA]/60 cursor-pointer'
                            : 'text-[#B5AAA0] bg-transparent cursor-not-allowed'
                        }`}
                      >
                        <span>{cell.day}</span>
                        {isToday && !isSelected && <span className="sr-only">(Hoje)</span>}
                        {hasOverride && hasOpenSlots && !isSelected && (
                          <span
                            className="absolute bottom-1 h-1 w-3 rounded-full bg-[#B8732A]"
                            aria-hidden="true"
                          />
                        )}
                      </button>
                    );
                  })
                )}
              </div>

              <div className="mt-7 border-t border-[#E2D9CB] pt-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-[#2F5243]" aria-hidden="true" />
                    <h4 className="font-display text-base font-medium text-[#2C241E]">
                      Horários livres
                    </h4>
                  </div>
                  {selectedDate && (
                    <span className="font-mono-tabular text-xs text-[#665B50] capitalize">
                      {formatDatePtBr(selectedDate)}
                    </span>
                  )}
                </div>

                {!selectedDate ? (
                  <p className="mt-4 text-sm text-[#665B50]">
                    Selecione uma data disponível acima para visualizar os horários livres.
                  </p>
                ) : availableTimeSlots.length === 0 ? (
                  <div className="mt-4 rounded-xl border border-[#E2D9CB] bg-[#FFFDF9] p-4 text-sm text-[#665B50]">
                    Não há horários disponíveis para esta data. Escolha outro dia no calendário.
                  </div>
                ) : (
                  <div className="mt-4 grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                    {availableTimeSlots.map((slot) => {
                      const active = selectedTime === slot;
                      return (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => {
                            setSelectedTime(slot);
                            setFormError(null);
                          }}
                          className={`min-h-[44px] rounded-lg border px-3 py-2 font-mono-tabular text-sm font-medium transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F5243] ${
                            active
                              ? 'border-[#2F5243] bg-[#2F5243] text-[#FFFDF9]'
                              : 'border-[#E2D9CB] bg-[#FFFDF9] text-[#2C241E] hover:border-[#2F5243] hover:bg-[#E9EFEA]/50'
                          }`}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Column 2: Contextual Auth -> Complementary Intake -> Confirm */}
            <div className="rounded-2xl border border-[#E2D9CB] bg-[#FFFDF9] p-5 sm:p-7 lg:col-span-6">
              <div className="flex items-center justify-between gap-4 border-b border-[#E2D9CB] pb-4">
                <div>
                  <h3 className="font-display text-lg font-medium text-[#2C241E]">
                    Confirmar agendamento
                  </h3>
                  <p className="mt-0.5 text-xs text-[#665B50]">
                    Atendimento individual · 100% Online ({availability.sessionDuration} min)
                  </p>
                </div>
                <span className="inline-flex items-center gap-1.5 font-mono-tabular text-xs text-[#2F5243]">
                  <Video className="h-4 w-4" aria-hidden="true" />
                  <span>Online</span>
                </span>
              </div>

              <div className="mt-5 rounded-xl bg-[#EFE4D2]/55 px-4 py-3 text-sm text-[#2C241E] border border-[#E2D9CB]">
                {selectedDate && selectedTime ? (
                  <div className="flex items-center justify-between gap-2">
                    <span>Horário selecionado:</span>
                    <span className="font-mono-tabular font-medium">
                      {formatShortDatePtBr(selectedDate)} · {selectedTime}
                    </span>
                  </div>
                ) : (
                  <span className="text-[#665B50]">
                    Escolha uma data e um horário ao lado para prosseguir.
                  </span>
                )}
              </div>

              {!currentUser ? (
                <div className="mt-5">
                  <PatientAuthForm
                    compact
                    title="Entre ou cadastre-se para confirmar"
                    subtitle="Seu acesso salva sua ficha clínica e libera a Área do Paciente com o link da sessão e histórico."
                  />
                </div>
              ) : loadingPatientProfile ? (
                <div className="mt-6 space-y-3">
                  <div className="h-12 rounded-lg bg-[#F6F2EA] animate-pulse" />
                  <div className="h-24 rounded-lg bg-[#F6F2EA] animate-pulse" />
                </div>
              ) : !patientProfile?.profileCompleted ? (
                <div className="mt-5 space-y-4">
                  <div className="rounded-xl border border-[#E6C79C] bg-[#FDF4E6]/70 px-4 py-3 text-xs leading-relaxed text-[#52473D]">
                    Conectado como <span className="font-mono-tabular font-medium text-[#2C241E]">{currentUser.email}</span>. Complete sua ficha clínica complementar abaixo para concluir sua solicitação.
                  </div>

                  <div>
                    <label htmlFor="sessionNotesBeforeIntake" className="block text-xs font-medium text-[#2C241E]">
                      Observação específica para este horário <span className="font-normal text-[#665B50]">(opcional)</span>
                    </label>
                    <input
                      id="sessionNotesBeforeIntake"
                      type="text"
                      maxLength={1000}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Ex.: preferência de assunto para o primeiro encontro"
                      className="mt-1 min-h-[40px] w-full rounded-lg border border-[#D4C8B6] bg-[#FFFDF9] px-3 text-sm"
                    />
                  </div>

                  {formError && (
                    <div
                      role="alert"
                      className="rounded-lg border border-[#D99B9B] bg-[#FDF2F2] px-4 py-3 text-xs text-[#7A2727]"
                    >
                      {formError}
                    </div>
                  )}

                  <PatientIntakeForm
                    user={currentUser}
                    existingProfile={patientProfile}
                    submitLabel={
                      selectedDate && selectedTime
                        ? 'Salvar ficha e solicitar horário'
                        : 'Salvar ficha clínica'
                    }
                    onSaved={async ({ fullName, phone }) => {
                      if (selectedDate && selectedTime) {
                        await finalizeBooking(fullName, phone || currentUser.email || '');
                      }
                    }}
                  />
                </div>
              ) : (
                <form onSubmit={handleConfirmExistingProfile} className="mt-5 space-y-4">
                  <div className="rounded-xl border border-[#E2D9CB] bg-[#F6F2EA]/60 p-4 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-[#2C241E]">{patientProfile.fullName}</p>
                        <p className="font-mono-tabular text-xs text-[#665B50]">
                          {patientProfile.phone} · {patientProfile.email}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={onOpenPatientPortal}
                        className="text-xs font-medium text-[#2F5243] hover:underline cursor-pointer"
                      >
                        Ver / editar cadastro
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="patientNotes" className="block text-sm font-medium text-[#2C241E]">
                      Como você chega para este encontro?{' '}
                      <span className="font-normal text-[#665B50]">(opcional)</span>
                    </label>
                    <textarea
                      id="patientNotes"
                      rows={3}
                      maxLength={1000}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Se desejar, deixe uma nota breve sobre este atendimento."
                      className="mt-1.5 block w-full rounded-lg border border-[#D4C8B6] bg-[#FFFDF9] px-3.5 py-2.5 text-sm text-[#2C241E] placeholder:text-[#9A8E80] focus:border-[#2F5243] focus:outline-none"
                    />
                  </div>

                  {formError && (
                    <div
                      role="alert"
                      className="rounded-lg border border-[#D99B9B] bg-[#FDF2F2] px-4 py-3 text-sm text-[#7A2727]"
                    >
                      {formError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting || !selectedDate || !selectedTime}
                    className="flex min-h-[48px] w-full items-center justify-center rounded-lg bg-[#2F5243] px-5 py-3 text-sm font-medium text-[#FFFDF9] hover:bg-[#244034] disabled:bg-[#9BA9A1] disabled:cursor-not-allowed transition-colors duration-150 cursor-pointer"
                  >
                    {submitting ? 'Registrando solicitação...' : 'Solicitar horário online'}
                  </button>

                  <p className="flex items-start gap-2 text-xs leading-relaxed text-[#665B50]">
                    <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#2F5243]" aria-hidden="true" />
                    <span>
                      Sigilo clínico garantido: suas informações e seu histórico são acessíveis apenas a você e ao psicólogo Vitor Gomes.
                    </span>
                  </p>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
