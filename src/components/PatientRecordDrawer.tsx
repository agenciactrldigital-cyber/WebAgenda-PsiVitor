import { Calendar, Check, CheckCircle2, Clock, MessageCircle, RefreshCw, Video, X, XCircle } from 'lucide-react';
import { formatShortDatePtBr } from '../services/agendaService';
import type { AppointmentRecord, AppointmentStatus, PatientProfile } from '../types/agenda';

interface PatientRecordDrawerProps {
  patient: PatientProfile | null;
  fallbackName?: string;
  fallbackContact?: string;
  appointments: AppointmentRecord[];
  onClose: () => void;
}

const STATUS_LABEL: Record<AppointmentStatus, { label: string; className: string; icon: typeof Clock }> = {
  pending: { label: 'Pendente', className: 'border-[#E6C79C] bg-[#FDF4E6] text-[#8B5314]', icon: Clock },
  confirmed: { label: 'Confirmada', className: 'border-[#C1D5C7] bg-[#E9EFEA] text-[#264738]', icon: CheckCircle2 },
  completed: { label: 'Concluída', className: 'border-[#D1CEC7] bg-[#EFECE5] text-[#473E35]', icon: Check },
  rescheduled: { label: 'Reagendada', className: 'border-[#CBD5E1] bg-[#F1F5F9] text-[#334155]', icon: RefreshCw },
  cancelled: { label: 'Cancelada', className: 'border-[#E5BABA] bg-[#FDF2F2] text-[#7A2727]', icon: XCircle },
};

export function PatientRecordDrawer({
  patient,
  fallbackName,
  fallbackContact,
  appointments,
  onClose,
}: PatientRecordDrawerProps) {
  const counts = appointments.reduce(
    (acc, a) => {
      acc.total += 1;
      acc[a.status] = (acc[a.status] || 0) + 1;
      return acc;
    },
    { total: 0, pending: 0, confirmed: 0, completed: 0, rescheduled: 0, cancelled: 0 }
  );

  const phoneDigits = String(patient?.phone || fallbackContact || '').replace(/\D/g, '');
  const normalizedWa = phoneDigits.length >= 10 && phoneDigits.length <= 11 ? `55${phoneDigits}` : phoneDigits;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#2C241E]/45 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-label="Ficha clínica do paciente"
    >
      <div className="relative h-full w-full max-w-2xl overflow-y-auto border-l border-[#E2D9CB] bg-[#FFFDF9] p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4 border-b border-[#E2D9CB] pb-5">
          <div>
            <p className="font-mono-tabular text-xs text-[#B8732A]">Ficha Clínica do Paciente</p>
            <h2 className="mt-1 font-display text-2xl font-medium text-[#2C241E]">
              {patient?.fullName || fallbackName || 'Paciente'}
            </h2>
            <p className="mt-1 font-mono-tabular text-xs text-[#665B50]">
              {patient?.email || fallbackContact}
              {patient?.phone ? ` · ${patient.phone}` : ''}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar ficha"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#E2D9CB] text-[#2C241E] hover:bg-[#F6F2EA] cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {normalizedWa.length >= 12 && (
          <div className="mt-5">
            <a
              href={`https://wa.me/${normalizedWa}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-[#2F5243] bg-[#E9EFEA] px-4 py-2 text-xs font-medium text-[#2F5243] hover:bg-[#DCE6DF]"
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              <span>Abrir conversa no WhatsApp</span>
            </a>
          </div>
        )}

        {/* Complementary Registration Details */}
        <div className="mt-6 space-y-5">
          <h3 className="font-display text-lg font-medium text-[#2C241E]">
            Cadastro complementar
          </h3>

          {!patient ? (
            <div className="rounded-xl border border-[#E2D9CB] bg-[#F6F2EA] p-4 text-sm text-[#52473D]">
              Este agendamento não possui uma ficha cadastral completa vinculada ainda.
            </div>
          ) : (
            <div className="space-y-4 rounded-xl border border-[#E2D9CB] bg-[#F6F2EA]/55 p-5 text-sm">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="font-mono-tabular text-xs text-[#665B50]">Nascimento</p>
                  <p className="mt-0.5 font-mono-tabular text-[#2C241E]">
                    {formatShortDatePtBr(patient.birthDate)}
                  </p>
                </div>
                <div>
                  <p className="font-mono-tabular text-xs text-[#665B50]">Cidade / Estado</p>
                  <p className="mt-0.5 text-[#2C241E]">{patient.cityState}</p>
                </div>
                <div>
                  <p className="font-mono-tabular text-xs text-[#665B50]">Ocupação</p>
                  <p className="mt-0.5 text-[#2C241E]">{patient.occupation}</p>
                </div>
                <div>
                  <p className="font-mono-tabular text-xs text-[#665B50]">Faixa etária</p>
                  <p className="mt-0.5 text-[#2C241E]">
                    {patient.isMinor ? 'Adolescente / Menor de 18 anos' : 'Adulto (18+)'}
                  </p>
                </div>
              </div>

              {patient.isMinor && (
                <div className="border-t border-[#E2D9CB] pt-3">
                  <p className="font-mono-tabular text-xs text-[#B8732A]">Responsável Legal</p>
                  <p className="mt-1 text-[#2C241E]">
                    {patient.guardianName} · <span className="font-mono-tabular">{patient.guardianPhone}</span>
                  </p>
                </div>
              )}

              <div className="border-t border-[#E2D9CB] pt-3">
                <p className="font-mono-tabular text-xs text-[#665B50]">Contato de Emergência</p>
                <p className="mt-1 text-[#2C241E]">
                  {patient.emergencyContactName} ({patient.emergencyContactRelation}) ·{' '}
                  <span className="font-mono-tabular">{patient.emergencyContactPhone}</span>
                </p>
              </div>

              <div className="border-t border-[#E2D9CB] pt-3">
                <p className="font-mono-tabular text-xs text-[#665B50]">Motivo da busca</p>
                <p className="mt-1 leading-relaxed text-[#2C241E]">{patient.reasonForTherapy}</p>
              </div>

              <div className="grid grid-cols-1 gap-3 border-t border-[#E2D9CB] pt-3 sm:grid-cols-2">
                <div>
                  <p className="font-mono-tabular text-xs text-[#665B50]">Terapia anterior</p>
                  <p className="mt-1 text-[#2C241E]">
                    {patient.hadPreviousTherapy
                      ? patient.previousTherapyDetails || 'Sim (sem detalhes adicionais)'
                      : 'Não'}
                  </p>
                </div>
                <div>
                  <p className="font-mono-tabular text-xs text-[#665B50]">Medicação / Acomp. médico</p>
                  <p className="mt-1 text-[#2C241E]">
                    {patient.usesMedication
                      ? patient.medicationDetails || 'Sim (sem detalhes adicionais)'
                      : 'Não'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Individual Session History */}
        <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-medium text-[#2C241E]">
              Histórico individual de atendimentos
            </h3>
            <span className="font-mono-tabular text-xs text-[#665B50]">
              {counts.total} registro(s)
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {[
              { label: 'Concluídas', value: counts.completed },
              { label: 'Confirmadas', value: counts.confirmed },
              { label: 'Reagendadas', value: counts.rescheduled },
              { label: 'Canceladas', value: counts.cancelled },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border border-[#E2D9CB] bg-[#F6F2EA]/60 p-3">
                <p className="font-mono-tabular text-[11px] text-[#665B50]">{s.label}</p>
                <p className="mt-0.5 font-mono-tabular text-lg font-medium text-[#2C241E]">
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          {appointments.length === 0 ? (
            <p className="text-sm text-[#665B50]">Nenhuma sessão registrada para este paciente.</p>
          ) : (
            <div className="divide-y divide-[#E2D9CB] rounded-xl border border-[#E2D9CB] bg-[#FFFDF9] px-4">
              {appointments
                .slice()
                .sort((a, b) => (a.date !== b.date ? b.date.localeCompare(a.date) : b.timeSlot.localeCompare(a.timeSlot)))
                .map((item) => {
                  const meta = STATUS_LABEL[item.status] || STATUS_LABEL.pending;
                  const Icon = meta.icon;
                  return (
                    <div key={item.id} className="py-3.5 space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 font-mono-tabular text-sm font-medium text-[#2C241E]">
                          <Calendar className="h-3.5 w-3.5 text-[#2F5243]" aria-hidden="true" />
                          <span>
                            {formatShortDatePtBr(item.date)} · {item.timeSlot}
                          </span>
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${meta.className}`}
                        >
                          <Icon className="h-3 w-3" aria-hidden="true" />
                          <span>{meta.label}</span>
                        </span>
                      </div>

                      {item.notes && (
                        <p className="text-xs leading-relaxed text-[#52473D]">{item.notes}</p>
                      )}

                      {item.meetingLink && (
                        <p className="flex items-center gap-1.5 text-xs text-[#2F5243] truncate">
                          <Video className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                          <a
                            href={item.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline truncate"
                          >
                            {item.meetingLink}
                          </a>
                        </p>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
