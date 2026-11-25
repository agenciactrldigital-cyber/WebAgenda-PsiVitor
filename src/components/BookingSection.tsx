import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Lock,
  MessageCircle,
  Video,
} from 'lucide-react';
import {
  buildPatientWhatsAppUrl,
  createAppointmentRequest,
  filterPastSlotsForToday,
  formatDatePtBr,
  formatShortDatePtBr,
  getSlotsForDate,
  getTodayIsoLocal,
  isDateSelectable,
} from '../services/agendaService';
import type { AppointmentRecord, AvailabilityConfig } from '../types/agenda';

interface BookingSectionProps {
  availability: AvailabilityConfig;
  occupiedSlots: Set<string>;
  loadingAvailability: boolean;
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
}: BookingSectionProps) {
  const today = useMemo(() => new Date(), []);
  const [viewMonth, setViewMonth] = useState({
    year: today.getFullYear(),
    month: today.getMonth(),
  });

  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [patientName, setPatientName] = useState('');
  const [patientContact, setPatientContact] = useState('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<AppointmentRecord | null>(null);

  // Auto-select nearest available date on initial load if none selected
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

  // Clear selectedTime if it became occupied in real time
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!selectedDate || !selectedTime) {
      setFormError('Escolha uma data e um horário disponível antes de enviar.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await createAppointmentRequest({
        date: selectedDate,
        timeSlot: selectedTime,
        patientName,
        patientContact,
        notes,
      });
      setConfirmedBooking({
        id: created.id,
        date: created.date,
        timeSlot: created.timeSlot,
        modality: 'online',
        patientName: created.patientName,
        patientContact: created.patientContact,
        notes: created.notes,
        status: 'pending',
      });
      setPatientName('');
      setPatientContact('');
      setNotes('');
      setSelectedTime('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível enviar sua solicitação.';
      setFormError(message);
    } finally {
      setSubmitting(false);
    }
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
            As sessões têm duração de{' '}
            <span className="font-mono-tabular font-medium text-[#2C241E]">
              {availability.sessionDuration} minutos
            </span>{' '}
            e acontecem por videochamada em ambiente reservado. Apenas horários livres ficam disponíveis.
          </p>
        </div>

        {confirmedBooking ? (
          <div className="mt-10 rounded-2xl border border-[#C9D8CD] bg-[#E9EFEA]/55 p-6 sm:p-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-xl">
                <div className="inline-flex items-center gap-2 text-sm font-medium text-[#2F5243]">
                  <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                  <span>Solicitação registrada com sucesso</span>
                </div>

                <h3 className="mt-3 font-display text-2xl font-medium text-[#2C241E]">
                  Recebemos o seu pedido, {confirmedBooking.patientName}.
                </h3>

                <p className="mt-3 text-base leading-relaxed text-[#52473D]">
                  Sua solicitação foi enviada com sigilo. Em breve entrarei em contato pelo canal informado para confirmar o horário e compartilhar o link da nossa sala virtual.
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
                    <p className="mt-1 text-sm font-medium text-[#2C241E]">
                      100% Online
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:min-w-[270px]">
                <a
                  href={buildPatientWhatsAppUrl(confirmedBooking, availability.sessionDuration)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[#2F5243] px-5 py-3 text-sm font-medium text-[#FFFDF9] hover:bg-[#244034] transition-colors whitespace-nowrap"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden="true" />
                  <span>Confirmar também no WhatsApp</span>
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
            {/* Column 1: Calendar & Free Time Slots */}
            <div className="rounded-2xl border border-[#E2D9CB] bg-[#F6F2EA]/55 p-5 sm:p-7 lg:col-span-7">
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
                          (slot) => !occupiedSlots.has(`${cell.iso}_${slot}`)
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
                        {isToday && !isSelected && (
                          <span className="sr-only">(Hoje)</span>
                        )}
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
                    Não há horários disponíveis para esta data. Escolha outro dia no calendário ou entre em contato pelo WhatsApp para verificar encaixes.
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

            {/* Column 2: Patient Request Form */}
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-[#E2D9CB] bg-[#FFFDF9] p-5 sm:p-7 lg:col-span-5"
            >
              <div className="flex items-center justify-between gap-4 border-b border-[#E2D9CB] pb-4">
                <div>
                  <h3 className="font-display text-lg font-medium text-[#2C241E]">
                    Seus dados para contato
                  </h3>
                  <p className="mt-0.5 text-xs text-[#665B50]">
                    Atendimento individual · 100% Online
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
                    <span>Horário escolhido:</span>
                    <span className="font-mono-tabular font-medium">
                      {formatShortDatePtBr(selectedDate)} · {selectedTime}
                    </span>
                  </div>
                ) : (
                  <span className="text-[#665B50]">
                    Selecione uma data e um horário ao lado para prosseguir.
                  </span>
                )}
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <label htmlFor="patientName" className="block text-sm font-medium text-[#2C241E]">
                    Nome completo
                  </label>
                  <input
                    id="patientName"
                    type="text"
                    required
                    maxLength={120}
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="Como prefere ser chamado(a)"
                    className="mt-1.5 block min-h-[44px] w-full rounded-lg border border-[#D4C8B6] bg-[#FFFDF9] px-3.5 py-2.5 text-sm text-[#2C241E] placeholder:text-[#9A8E80] focus:border-[#2F5243] focus:outline-none focus:ring-2 focus:ring-[#2F5243]/20"
                  />
                </div>

                <div>
                  <label htmlFor="patientContact" className="block text-sm font-medium text-[#2C241E]">
                    WhatsApp ou E-mail
                  </label>
                  <input
                    id="patientContact"
                    type="text"
                    required
                    maxLength={120}
                    value={patientContact}
                    onChange={(e) => setPatientContact(e.target.value)}
                    placeholder="(88) 99999-9999 ou seu@email.com"
                    className="mt-1.5 block min-h-[44px] w-full rounded-lg border border-[#D4C8B6] bg-[#FFFDF9] px-3.5 py-2.5 text-sm text-[#2C241E] placeholder:text-[#9A8E80] focus:border-[#2F5243] focus:outline-none focus:ring-2 focus:ring-[#2F5243]/20"
                  />
                </div>

                <div>
                  <label htmlFor="patientNotes" className="block text-sm font-medium text-[#2C241E]">
                    Como você chega hoje? <span className="font-normal text-[#665B50]">(opcional)</span>
                  </label>
                  <textarea
                    id="patientNotes"
                    rows={3}
                    maxLength={1000}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Se desejar, compartilhe brevemente o que motivou sua busca neste momento."
                    className="mt-1.5 block w-full rounded-lg border border-[#D4C8B6] bg-[#FFFDF9] px-3.5 py-2.5 text-sm text-[#2C241E] placeholder:text-[#9A8E80] focus:border-[#2F5243] focus:outline-none focus:ring-2 focus:ring-[#2F5243]/20"
                  />
                </div>
              </div>

              {formError && (
                <div
                  role="alert"
                  className="mt-4 rounded-lg border border-[#D99B9B] bg-[#FDF2F2] px-4 py-3 text-sm text-[#7A2727]"
                >
                  {formError}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !selectedDate || !selectedTime}
                className="mt-6 flex min-h-[48px] w-full items-center justify-center rounded-lg bg-[#2F5243] px-5 py-3 text-sm font-medium text-[#FFFDF9] hover:bg-[#244034] disabled:bg-[#9BA9A1] disabled:cursor-not-allowed transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F5243] focus-visible:ring-offset-2"
              >
                {submitting ? 'Registrando solicitação...' : 'Solicitar horário online'}
              </button>

              <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-[#665B50]">
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#2F5243]" aria-hidden="true" />
                <span>
                  Sigilo clínico garantido: seus dados e observações são acessíveis exclusivamente ao psicólogo Vitor Gomes.
                </span>
              </p>
            </form>
          </div>
        )}
      </div>
    </section>
  );
}
