import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  ArrowRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  Phone,
  User as UserIcon,
  Video,
} from 'lucide-react';
import {
  createTemporarySlotHold,
  filterPastSlotsForToday,
  formatDatePtBr,
  formatFirestoreError,
  formatShortDatePtBr,
  getSlotsForDate,
  getTodayIsoLocal,
  isDateSelectable,
} from '../services/agendaService';
import type {
  AvailabilityConfig,
  ClinicSettings,
  PatientProfile,
  PendingBookingDraft,
  SlotHoldRecord,
} from '../types/agenda';

interface BookingSectionProps {
  availability: AvailabilityConfig;
  clinicSettings: ClinicSettings;
  occupiedSlots: Set<string>;
  slotHolds: SlotHoldRecord[];
  loadingAvailability: boolean;
  currentUser: User | null;
  patientProfile: PatientProfile | null;
  pendingDraft: PendingBookingDraft | null;
  onStartBookingFlow: (draft: PendingBookingDraft) => void;
  onResumePendingDraft: () => void;
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
  clinicSettings,
  occupiedSlots,
  slotHolds,
  loadingAvailability,
  currentUser,
  patientProfile,
  pendingDraft,
  onStartBookingFlow,
  onResumePendingDraft,
}: BookingSectionProps) {
  const today = useMemo(() => new Date(), []);
  const [viewMonth, setViewMonth] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  });

  const [selectedDate, setSelectedDate] = useState<string>(() => pendingDraft?.date || '');
  const [selectedTime, setSelectedTime] = useState<string>(() => pendingDraft?.timeSlot || '');
  const [basicName, setBasicName] = useState<string>(
    () => pendingDraft?.patientName || patientProfile?.fullName || currentUser?.displayName || ''
  );
  const [basicPhone, setBasicPhone] = useState<string>(
    () => pendingDraft?.patientPhone || patientProfile?.phone || ''
  );

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 15000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!basicName && (patientProfile?.fullName || currentUser?.displayName)) {
      setBasicName(patientProfile?.fullName || currentUser?.displayName || '');
    }
    if (!basicPhone && patientProfile?.phone) {
      setBasicPhone(patientProfile.phone);
    }
  }, [patientProfile, currentUser, basicName, basicPhone]);

  const activeExternalHolds = useMemo(() => {
    const set = new Set<string>();
    slotHolds.forEach((hold) => {
      const isMine =
        (pendingDraft?.holdToken && hold.holdToken === pendingDraft.holdToken) ||
        (currentUser?.uid && hold.ownerUid === currentUser.uid);
      if (!isMine && hold.expiresAtMs > nowMs) {
        set.add(`${hold.date}_${hold.timeSlot}`);
      }
    });
    return set;
  }, [slotHolds, pendingDraft?.holdToken, currentUser?.uid, nowMs]);

  useEffect(() => {
    if (loadingAvailability || selectedDate) return;
    const base = new Date();
    for (let offset = 0; offset < 45; offset += 1) {
      const candidate = new Date(
        base.getFullYear(),
        base.getMonth(),
        base.getDate() + offset,
        12,
        0,
        0
      );
      const iso = toIsoDate(candidate.getFullYear(), candidate.getMonth(), candidate.getDate());
      if (isDateSelectable(availability, iso)) {
        const daySlots = filterPastSlotsForToday(getSlotsForDate(availability, iso), iso).filter(
          (slot: string) =>
            !occupiedSlots.has(`${iso}_${slot}`) && !activeExternalHolds.has(`${iso}_${slot}`)
        );
        if (daySlots.length > 0) {
          setSelectedDate(iso);
          setViewMonth({ year: candidate.getFullYear(), month: candidate.getMonth() });
          return;
        }
      }
    }
  }, [availability, occupiedSlots, activeExternalHolds, loadingAvailability, selectedDate]);

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
    return futureOnly.filter(
      (slot: string) =>
        !occupiedSlots.has(`${selectedDate}_${slot}`) &&
        !activeExternalHolds.has(`${selectedDate}_${slot}`)
    );
  }, [availability, occupiedSlots, activeExternalHolds, selectedDate]);

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

  const handleContinuePreview = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedDate || !selectedTime) {
      setFormError('Escolha uma data e um horário livre ao lado para continuar.');
      return;
    }

    const cleanName = basicName.trim();
    const cleanPhone = basicPhone.trim();

    if (cleanName.length < 2) {
      setFormError('Informe seu nome para reservar o horário.');
      return;
    }
    if (cleanPhone.replace(/\D/g, '').length < 8 && cleanPhone.length < 8) {
      setFormError('Informe seu número de WhatsApp com DDD para contato.');
      return;
    }

    setSubmitting(true);
    try {
      const isSameDraftSlot =
        pendingDraft &&
        pendingDraft.date === selectedDate &&
        pendingDraft.timeSlot === selectedTime &&
        pendingDraft.expiresAtMs > Date.now();

      const holdResult = await createTemporarySlotHold({
        date: selectedDate,
        timeSlot: selectedTime,
        ownerUid: currentUser?.uid || '',
        existingHoldToken: isSameDraftSlot ? pendingDraft.holdToken : '',
        existingExpiresAtMs: isSameDraftSlot ? pendingDraft.expiresAtMs : 0,
      });

      const nextDraft: PendingBookingDraft = {
        date: selectedDate,
        timeSlot: selectedTime,
        patientName: cleanName,
        patientPhone: cleanPhone,
        holdToken: holdResult.holdToken,
        createdAtMs: holdResult.createdAtMs,
        expiresAtMs: holdResult.expiresAtMs,
      };

      onStartBookingFlow(nextDraft);
    } catch (error) {
      setFormError(formatFirestoreError(error));
    } finally {
      setSubmitting(false);
    }
  };

  const todayIso = getTodayIsoLocal();
  const monthLabel = MONTH_FORMATTER.format(new Date(viewMonth.year, viewMonth.month, 1, 12, 0, 0));
  const hasActiveDraft = Boolean(pendingDraft && pendingDraft.expiresAtMs > nowMs);

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
            Selecione a data e o horário desejados e informe apenas seu nome e WhatsApp. Na etapa seguinte, você finaliza seu acesso com o horário reservado por 30 minutos.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
          {/* Column 1: Calendar & Free Time Slots */}
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
                        (slot: string) =>
                          !occupiedSlots.has(`${cell.iso}_${slot}`) &&
                          !activeExternalHolds.has(`${cell.iso}_${slot}`)
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

          {/* Column 2: Simple, Low-Friction Preview (Name + Phone only) */}
          <div className="rounded-2xl border border-[#E2D9CB] bg-[#FFFDF9] p-5 sm:p-7 lg:col-span-6">
            <div className="flex items-center justify-between gap-4 border-b border-[#E2D9CB] pb-4">
              <div>
                <h3 className="font-display text-lg font-medium text-[#2C241E]">
                  Prévia do agendamento
                </h3>
                <p className="mt-0.5 text-xs text-[#665B50]">
                  Atendimento individual · {clinicSettings.modalityLabel} ({availability.sessionDuration} min)
                  {clinicSettings.sessionFeeNote ? ` · ${clinicSettings.sessionFeeNote}` : ''}
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 font-mono-tabular text-xs text-[#2F5243]">
                <Video className="h-4 w-4" aria-hidden="true" />
                <span>Online</span>
              </span>
            </div>

            {hasActiveDraft && pendingDraft && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#C1D5C7] bg-[#E9EFEA]/70 px-4 py-3 text-xs text-[#264738]">
                <span>
                  Você já tem uma reserva de 30 min para{' '}
                  <strong className="font-mono-tabular">
                    {formatShortDatePtBr(pendingDraft.date)} às {pendingDraft.timeSlot}
                  </strong>
                  .
                </span>
                <button
                  type="button"
                  onClick={onResumePendingDraft}
                  className="font-medium underline hover:text-[#1D352A] cursor-pointer"
                >
                  Retomar agora
                </button>
              </div>
            )}

            <div className="mt-5 rounded-xl bg-[#EFE4D2]/55 px-4 py-3.5 text-sm text-[#2C241E] border border-[#E2D9CB]">
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

            <form onSubmit={handleContinuePreview} className="mt-5 space-y-4">
              <div>
                <label htmlFor="previewName" className="block text-sm font-medium text-[#2C241E]">
                  Seu nome
                </label>
                <div className="relative mt-1.5">
                  <UserIcon className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-[#665B50]" />
                  <input
                    id="previewName"
                    type="text"
                    required
                    maxLength={120}
                    value={basicName}
                    onChange={(e) => setBasicName(e.target.value)}
                    placeholder="Como prefere ser chamado(a)"
                    className="min-h-[46px] w-full rounded-lg border border-[#D4C8B6] bg-[#FFFDF9] pl-10 pr-3.5 text-sm text-[#2C241E] placeholder:text-[#9A8E80] focus:border-[#2F5243] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="previewPhone" className="block text-sm font-medium text-[#2C241E]">
                  WhatsApp / Número
                </label>
                <div className="relative mt-1.5">
                  <Phone className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-[#665B50]" />
                  <input
                    id="previewPhone"
                    type="tel"
                    required
                    maxLength={40}
                    value={basicPhone}
                    onChange={(e) => setBasicPhone(e.target.value)}
                    placeholder="(88) 99999-9999"
                    className="min-h-[46px] w-full rounded-lg border border-[#D4C8B6] bg-[#FFFDF9] pl-10 pr-3.5 text-sm text-[#2C241E] placeholder:text-[#9A8E80] focus:border-[#2F5243] focus:outline-none"
                  />
                </div>
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
                className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg bg-[#2F5243] px-5 py-3 text-sm font-medium text-[#FFFDF9] hover:bg-[#244034] disabled:bg-[#9BA9A1] disabled:cursor-not-allowed transition-colors duration-150 cursor-pointer"
              >
                <span>
                  {submitting
                    ? 'Reservando horário...'
                    : currentUser
                    ? 'Seguir para concluir agendamento'
                    : 'Continuar agendamento'}
                </span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>

              <p className="flex items-start gap-2 text-xs leading-relaxed text-[#665B50]">
                <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#B8732A]" aria-hidden="true" />
                <span>
                  Ao continuar, verificamos seu acesso e mantemos este horário reservado por 30 minutos para que você conclua seu cadastro sem perder os dados escolhidos.
                </span>
              </p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
