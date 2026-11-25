import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  ArrowLeft,
  CalendarOff,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Database,
  FileText,
  LogOut,
  MessageCircle,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Video,
  XCircle,
} from 'lucide-react';
import {
  buildPsychologistWhatsAppConfirmUrl,
  deleteAppointment,
  deleteGroup,
  formatFirestoreError,
  formatShortDatePtBr,
  saveAvailability,
  saveGroup,
  seedInitialFirestoreData,
  subscribeAllPatients,
  subscribeAppointments,
  updateAppointmentMeetingLink,
  updateAppointmentStatus,
} from '../services/agendaService';
import { logoutPsychologist } from '../services/authService';
import type {
  AppointmentRecord,
  AppointmentStatus,
  AvailabilityConfig,
  GroupItem,
  PatientProfile,
} from '../types/agenda';
import { PatientRecordDrawer } from './PatientRecordDrawer';

interface AdminDashboardProps {
  user: User;
  availability: AvailabilityConfig & { existsInDb?: boolean };
  groups: GroupItem[];
  onBackToPublic: () => void;
}

type AdminTab = 'appointments' | 'patients' | 'schedule' | 'blocks' | 'groups' | 'deploy';

const WEEKDAYS = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
];

const STATUS_META: Record<
  AppointmentStatus,
  { label: string; className: string; icon: typeof Clock }
> = {
  pending: {
    label: 'Pendente',
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

const FIRESTORE_RULES_SNIPPET = `// Regras completas e atualizadas em firestore.rules na raiz do projeto
// Coleções protegidas: availability, groups, patients, occupiedSlots, appointments`;

export function AdminDashboard({
  user,
  availability,
  groups,
  onBackToPublic,
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('appointments');
  const [appointments, setAppointments] = useState<AppointmentRecord[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(true);
  const [appointmentsError, setAppointmentsError] = useState<string | null>(null);

  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [patientSearch, setPatientSearch] = useState('');

  const [drawerContext, setDrawerContext] = useState<{
    patient: PatientProfile | null;
    fallbackName?: string;
    fallbackContact?: string;
    appointments: AppointmentRecord[];
  } | null>(null);

  const [statusFilter, setStatusFilter] = useState<'all' | AppointmentStatus>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [meetingLinkDrafts, setMeetingLinkDrafts] = useState<Record<string, string>>({});

  // Schedule state synced with availability
  const [weeklyDays, setWeeklyDays] = useState<number[]>(availability.weeklyDays);
  const [timeSlots, setTimeSlots] = useState<string[]>(availability.timeSlots);
  const [dateOverrides, setDateOverrides] = useState<Record<string, string[]>>(
    availability.dateOverrides || {}
  );
  const [sessionDuration, setSessionDuration] = useState<number>(availability.sessionDuration);
  const [blockedDates, setBlockedDates] = useState<string[]>(availability.blockedDates);

  const [newTimeSlot, setNewTimeSlot] = useState('18:00');
  const [overrideDate, setOverrideDate] = useState('');
  const [overrideSlotInput, setOverrideSlotInput] = useState('09:00');
  const [newBlockedDate, setNewBlockedDate] = useState('');

  const [savingSchedule, setSavingSchedule] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);

  // Group editor state
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupTitle, setGroupTitle] = useState('');
  const [groupSchedule, setGroupSchedule] = useState('');
  const [groupPlatform, setGroupPlatform] = useState('Exclusivamente Online (Sala Virtual)');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupGuidelinesText, setGroupGuidelinesText] = useState('');
  const [groupActive, setGroupActive] = useState(true);
  const [savingGroup, setSavingGroup] = useState(false);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    setWeeklyDays(availability.weeklyDays);
    setTimeSlots(availability.timeSlots);
    setDateOverrides(availability.dateOverrides || {});
    setSessionDuration(availability.sessionDuration);
    setBlockedDates(availability.blockedDates);
  }, [availability]);

  useEffect(() => {
    const unsubAppointments = subscribeAppointments(
      (list: AppointmentRecord[]) => {
        setAppointments(list);
        setLoadingAppointments(false);
        setAppointmentsError(null);
      },
      (errMsg: string) => {
        setAppointmentsError(errMsg);
        setLoadingAppointments(false);
      }
    );

    const unsubPatients = subscribeAllPatients(
      (list: PatientProfile[]) => {
        setPatients(list);
        setLoadingPatients(false);
      },
      () => {
        setLoadingPatients(false);
      }
    );

    return () => {
      unsubAppointments();
      unsubPatients();
    };
  }, []);

  const showSuccess = (msg: string) => {
    setFeedbackError(null);
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  const showError = (msg: string) => {
    setFeedbackMessage(null);
    setFeedbackError(msg);
  };

  const patientsByUid = useMemo(() => {
    const map = new Map<string, PatientProfile>();
    patients.forEach((p) => map.set(p.uid, p));
    return map;
  }, [patients]);

  const filteredAppointments = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return appointments.filter((item) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (!q) return true;
      return (
        item.patientName.toLowerCase().includes(q) ||
        item.patientContact.toLowerCase().includes(q) ||
        item.date.includes(q)
      );
    });
  }, [appointments, statusFilter, searchTerm]);

  const filteredPatients = useMemo(() => {
    const q = patientSearch.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(
      (p) =>
        p.fullName.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        p.phone.toLowerCase().includes(q)
    );
  }, [patients, patientSearch]);

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

  const openPatientDrawerFromAppointment = (appointment: AppointmentRecord) => {
    const matchedPatient = appointment.patientUid
      ? patientsByUid.get(appointment.patientUid) || null
      : null;

    const relatedAppointments = appointments.filter((a) =>
      appointment.patientUid
        ? a.patientUid === appointment.patientUid
        : a.patientContact === appointment.patientContact
    );

    setDrawerContext({
      patient: matchedPatient,
      fallbackName: appointment.patientName,
      fallbackContact: appointment.patientContact,
      appointments: relatedAppointments,
    });
  };

  const openPatientDrawerFromProfile = (patient: PatientProfile) => {
    const relatedAppointments = appointments.filter((a) => a.patientUid === patient.uid);
    setDrawerContext({
      patient,
      appointments: relatedAppointments,
    });
  };

  const handleStatusChange = async (appointment: AppointmentRecord, nextStatus: AppointmentStatus) => {
    setActionBusyId(appointment.id);
    try {
      const draftLink = meetingLinkDrafts[appointment.id];
      await updateAppointmentStatus(appointment, nextStatus, draftLink);
      showSuccess(
        `Solicitação de ${appointment.patientName} atualizada para ${STATUS_META[nextStatus].label}.`
      );
    } catch (err) {
      showError(formatFirestoreError(err));
    } finally {
      setActionBusyId(null);
    }
  };

  const handleSaveMeetingLink = async (appointment: AppointmentRecord) => {
    const link = meetingLinkDrafts[appointment.id] ?? appointment.meetingLink ?? '';
    setActionBusyId(appointment.id);
    try {
      await updateAppointmentMeetingLink(appointment.id, link);
      showSuccess(`Link da sala salvo para ${appointment.patientName}.`);
    } catch (err) {
      showError(formatFirestoreError(err));
    } finally {
      setActionBusyId(null);
    }
  };

  const handleDeleteAppointment = async (appointment: AppointmentRecord) => {
    setActionBusyId(appointment.id);
    try {
      await deleteAppointment(appointment);
      setConfirmDeleteId(null);
      showSuccess(`Registro de ${appointment.patientName} removido e horário liberado.`);
    } catch (err) {
      showError(formatFirestoreError(err));
    } finally {
      setActionBusyId(null);
    }
  };

  const handleToggleWeekday = (dayVal: number) => {
    setWeeklyDays((prev) =>
      prev.includes(dayVal) ? prev.filter((d) => d !== dayVal) : [...prev, dayVal].sort((a, b) => a - b)
    );
  };

  const handleAddTimeSlot = () => {
    if (!/^\d{2}:\d{2}$/.test(newTimeSlot)) return;
    if (!timeSlots.includes(newTimeSlot)) {
      setTimeSlots((prev) => [...prev, newTimeSlot].sort());
    }
  };

  const handleRemoveTimeSlot = (slot: string) => {
    setTimeSlots((prev) => prev.filter((s) => s !== slot));
  };

  const handleAddOverrideSlot = () => {
    if (!overrideDate || !/^\d{2}:\d{2}$/.test(overrideSlotInput)) return;
    setDateOverrides((prev) => {
      const existing = Array.isArray(prev[overrideDate]) ? prev[overrideDate] : [];
      if (existing.includes(overrideSlotInput)) return prev;
      return {
        ...prev,
        [overrideDate]: [...existing, overrideSlotInput].sort(),
      };
    });
  };

  const handleRemoveOverrideSlot = (dateKey: string, slot: string) => {
    setDateOverrides((prev) => {
      const nextList = (prev[dateKey] || []).filter((s) => s !== slot);
      const copy = { ...prev };
      if (nextList.length === 0) {
        delete copy[dateKey];
      } else {
        copy[dateKey] = nextList;
      }
      return copy;
    });
  };

  const handleClearOverrideDate = (dateKey: string) => {
    setDateOverrides((prev) => {
      const copy = { ...prev };
      delete copy[dateKey];
      return copy;
    });
  };

  const handleSaveSchedule = async () => {
    setSavingSchedule(true);
    try {
      await saveAvailability({
        weeklyDays,
        timeSlots,
        dateOverrides,
        sessionDuration,
        blockedDates,
        modalities: ['online'],
      });
      showSuccess('Configurações da agenda online salvas no Firestore.');
    } catch (err) {
      showError(formatFirestoreError(err));
    } finally {
      setSavingSchedule(false);
    }
  };

  const handleAddBlockedDate = async () => {
    if (!newBlockedDate) return;
    const updated = blockedDates.includes(newBlockedDate)
      ? blockedDates
      : [...blockedDates, newBlockedDate].sort();
    setBlockedDates(updated);
    setNewBlockedDate('');
    try {
      await saveAvailability({
        weeklyDays,
        timeSlots,
        dateOverrides,
        sessionDuration,
        blockedDates: updated,
        modalities: ['online'],
      });
      showSuccess(`Data ${formatShortDatePtBr(newBlockedDate)} bloqueada.`);
    } catch (err) {
      showError(formatFirestoreError(err));
    }
  };

  const handleRemoveBlockedDate = async (dateToUnblock: string) => {
    const updated = blockedDates.filter((d) => d !== dateToUnblock);
    setBlockedDates(updated);
    try {
      await saveAvailability({
        weeklyDays,
        timeSlots,
        dateOverrides,
        sessionDuration,
        blockedDates: updated,
        modalities: ['online'],
      });
      showSuccess(`Bloqueio da data ${formatShortDatePtBr(dateToUnblock)} removido.`);
    } catch (err) {
      showError(formatFirestoreError(err));
    }
  };

  const handleStartEditGroup = (group: GroupItem) => {
    setEditingGroupId(group.id);
    setGroupTitle(group.title);
    setGroupSchedule(group.scheduleText);
    setGroupPlatform(group.platformLabel || 'Exclusivamente Online (Sala Virtual)');
    setGroupDescription(group.description || '');
    setGroupGuidelinesText((group.guidelines || []).join('\n'));
    setGroupActive(group.active);
  };

  const handleResetGroupForm = () => {
    setEditingGroupId(null);
    setGroupTitle('');
    setGroupSchedule('');
    setGroupPlatform('Exclusivamente Online (Sala Virtual)');
    setGroupDescription('');
    setGroupGuidelinesText('');
    setGroupActive(true);
  };

  const handleSaveGroupSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSavingGroup(true);
    try {
      const existing = groups.find((g) => g.id === editingGroupId);
      await saveGroup({
        id: editingGroupId || undefined,
        isFallback: existing?.isFallback,
        title: groupTitle,
        scheduleText: groupSchedule,
        platformLabel: groupPlatform,
        description: groupDescription,
        guidelines: groupGuidelinesText
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean),
        active: groupActive,
      });
      handleResetGroupForm();
      showSuccess('Grupo terapêutico online salvo com sucesso.');
    } catch (err) {
      showError(formatFirestoreError(err));
    } finally {
      setSavingGroup(false);
    }
  };

  const handleToggleGroupActive = async (group: GroupItem) => {
    try {
      await saveGroup({ ...group, active: !group.active });
      showSuccess(`Grupo "${group.title}" ${!group.active ? 'ativado' : 'ocultado'}.`);
    } catch (err) {
      showError(formatFirestoreError(err));
    }
  };

  const handleDeleteGroup = async (group: GroupItem) => {
    if (group.isFallback) return;
    try {
      await deleteGroup(group.id);
      showSuccess(`Grupo "${group.title}" removido.`);
    } catch (err) {
      showError(formatFirestoreError(err));
    }
  };

  const handleSeedInitial = async () => {
    setSeeding(true);
    try {
      await seedInitialFirestoreData();
      showSuccess('Agenda padrão e grupo online inicializados no Firestore.');
    } catch (err) {
      showError(formatFirestoreError(err));
    } finally {
      setSeeding(false);
    }
  };

  const handleCopy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      showError('Não foi possível copiar automaticamente.');
    }
  };

  const overrideKeys = Object.keys(dateOverrides).sort();

  return (
    <div className="min-h-screen bg-[#F6F2EA] text-[#2C241E]">
      <header className="sticky top-0 z-30 border-b border-[#E2D9CB] bg-[#FFFDF9]">
        <div className="mx-auto flex min-h-[64px] max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onBackToPublic}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[#E2D9CB] bg-[#F6F2EA] px-3 py-1.5 text-xs font-medium text-[#2C241E] hover:bg-[#EFE4D2] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Site público</span>
            </button>
            <div>
              <h1 className="font-display text-lg font-medium text-[#2C241E] leading-tight">
                Painel do Psicólogo
              </h1>
              <p className="font-mono-tabular text-xs text-[#665B50] truncate max-w-[220px] sm:max-w-none">
                {user.email}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => logoutPsychologist()}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[#D4C8B6] bg-[#FFFDF9] px-3.5 py-2 text-xs font-medium text-[#2C241E] hover:bg-[#F6F2EA] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Sair</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {availability.existsInDb === false && (
          <div className="mb-6 flex flex-col gap-3 rounded-xl border border-[#E6C79C] bg-[#FDF4E6] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Database className="mt-0.5 h-5 w-5 shrink-0 text-[#B8732A]" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium text-[#2C241E]">
                  Banco de dados pronto para inicialização
                </p>
                <p className="text-xs text-[#52473D]">
                  O documento <span className="font-mono-tabular">availability/default</span> ainda não foi gravado no Firestore. Clique ao lado para salvar a grade inicial e o grupo online.
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={seeding}
              onClick={handleSeedInitial}
              className="inline-flex min-h-[40px] items-center justify-center rounded-lg bg-[#2F5243] px-4 py-2 text-xs font-medium text-[#FFFDF9] hover:bg-[#244034] disabled:opacity-60 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {seeding ? 'Salvando...' : 'Inicializar no Firestore'}
            </button>
          </div>
        )}

        {feedbackMessage && (
          <div className="mb-6 rounded-xl border border-[#C1D5C7] bg-[#E9EFEA] px-4 py-3 text-sm text-[#264738]">
            {feedbackMessage}
          </div>
        )}

        {feedbackError && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-[#E5BABA] bg-[#FDF2F2] px-4 py-3 text-sm text-[#7A2727]"
          >
            {feedbackError}
          </div>
        )}

        {/* Tab Bar */}
        <div
          role="tablist"
          aria-label="Seções do painel"
          className="flex items-center gap-1.5 overflow-x-auto rounded-xl border border-[#E2D9CB] bg-[#EFE4D2]/50 p-1.5"
        >
          {[
            { id: 'appointments', label: `Solicitações (${counts.pending})` },
            { id: 'patients', label: `Pacientes (${patients.length})` },
            { id: 'schedule', label: 'Grade Flexível' },
            { id: 'blocks', label: `Bloqueios (${blockedDates.length})` },
            { id: 'groups', label: 'Grupo Online' },
            { id: 'deploy', label: 'Vercel & Firebase' },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                type="button"
                aria-selected={active}
                onClick={() => setActiveTab(tab.id as AdminTab)}
                className={`min-h-[40px] rounded-lg px-4 py-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-[#FFFDF9] text-[#2C241E] border border-[#E2D9CB]'
                    : 'text-[#665B50] hover:text-[#2C241E]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: APPOINTMENTS */}
        {activeTab === 'appointments' && (
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {[
                { label: 'Total', value: counts.total },
                { label: 'Pendentes', value: counts.pending },
                { label: 'Confirmadas', value: counts.confirmed },
                { label: 'Concluídas', value: counts.completed },
                { label: 'Reagendadas', value: counts.rescheduled },
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

            <div className="flex flex-col gap-3 rounded-xl border border-[#E2D9CB] bg-[#FFFDF9] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'all', label: 'Todas' },
                  { id: 'pending', label: 'Pendentes' },
                  { id: 'confirmed', label: 'Confirmadas' },
                  { id: 'completed', label: 'Concluídas' },
                  { id: 'rescheduled', label: 'Reagendadas' },
                  { id: 'cancelled', label: 'Canceladas' },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setStatusFilter(f.id as 'all' | AppointmentStatus)}
                    className={`min-h-[36px] rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      statusFilter === f.id
                        ? 'bg-[#2F5243] text-[#FFFDF9]'
                        : 'bg-[#F6F2EA] text-[#52473D] hover:bg-[#EFE4D2]'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#665B50]" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar nome, contato ou data"
                  className="min-h-[38px] w-full rounded-lg border border-[#D4C8B6] bg-[#FFFDF9] pl-9 pr-3 text-xs sm:text-sm text-[#2C241E] focus:border-[#2F5243] focus:outline-none"
                />
              </div>
            </div>

            {appointmentsError && (
              <div
                role="alert"
                className="rounded-xl border border-[#E5BABA] bg-[#FDF2F2] p-4 text-sm text-[#7A2727]"
              >
                {appointmentsError}
              </div>
            )}

            {loadingAppointments ? (
              <div className="space-y-3">
                {[1, 2, 3].map((item) => (
                  <div
                    key={item}
                    className="h-24 rounded-xl border border-[#E2D9CB] bg-[#FFFDF9]/70 animate-pulse"
                  />
                ))}
              </div>
            ) : filteredAppointments.length === 0 ? (
              <div className="rounded-2xl border border-[#E2D9CB] bg-[#FFFDF9] p-8 text-center">
                <p className="font-display text-lg text-[#2C241E]">
                  Nenhuma solicitação encontrada
                </p>
                <p className="mt-1 text-sm text-[#665B50]">
                  Quando pacientes enviarem pedidos de sessão online, eles aparecerão aqui em tempo real.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAppointments.map((appointment) => {
                  const meta = STATUS_META[appointment.status] || STATUS_META.pending;
                  const StatusIcon = meta.icon;
                  const isBusy = actionBusyId === appointment.id;
                  const linkValue =
                    meetingLinkDrafts[appointment.id] !== undefined
                      ? meetingLinkDrafts[appointment.id]
                      : appointment.meetingLink || '';

                  return (
                    <div
                      key={appointment.id}
                      className="rounded-xl border border-[#E2D9CB] bg-[#FFFDF9] p-5 space-y-4"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="font-mono-tabular text-sm font-medium text-[#2C241E]">
                              {formatShortDatePtBr(appointment.date)} · {appointment.timeSlot}
                            </span>
                            <span className="font-mono-tabular text-xs text-[#665B50]">
                              Online ({sessionDuration} min)
                            </span>
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-0.5 text-xs font-medium ${meta.className}`}
                            >
                              <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />
                              <span>{meta.label}</span>
                            </span>
                          </div>

                          <div>
                            <h3 className="font-display text-lg font-medium text-[#2C241E]">
                              {appointment.patientName}
                            </h3>
                            <p className="font-mono-tabular text-xs sm:text-sm text-[#52473D]">
                              Contato: {appointment.patientContact}
                            </p>
                          </div>

                          {appointment.notes && (
                            <p className="rounded-lg bg-[#F6F2EA] px-3.5 py-2.5 text-sm leading-relaxed text-[#52473D]">
                              {appointment.notes}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => openPatientDrawerFromAppointment(appointment)}
                            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-[#D4C8B6] bg-[#F6F2EA] px-3 py-1.5 text-xs font-medium text-[#2C241E] hover:bg-[#EFE4D2] transition-colors whitespace-nowrap cursor-pointer"
                          >
                            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Ver ficha do paciente</span>
                          </button>

                          <a
                            href={buildPsychologistWhatsAppConfirmUrl(
                              { ...appointment, meetingLink: linkValue },
                              sessionDuration
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-[#2F5243] bg-[#E9EFEA] px-3 py-1.5 text-xs font-medium text-[#2F5243] hover:bg-[#DCE6DF] transition-colors whitespace-nowrap"
                          >
                            <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>WhatsApp</span>
                          </a>

                          {appointment.status !== 'confirmed' && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleStatusChange(appointment, 'confirmed')}
                              className="inline-flex min-h-[38px] items-center rounded-lg bg-[#2F5243] px-3 py-1.5 text-xs font-medium text-[#FFFDF9] hover:bg-[#244034] disabled:opacity-60 whitespace-nowrap cursor-pointer"
                            >
                              Confirmar
                            </button>
                          )}

                          {appointment.status !== 'completed' && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleStatusChange(appointment, 'completed')}
                              className="inline-flex min-h-[38px] items-center rounded-lg border border-[#D4C8B6] bg-[#FFFDF9] px-3 py-1.5 text-xs font-medium text-[#2C241E] hover:bg-[#F6F2EA] disabled:opacity-60 whitespace-nowrap cursor-pointer"
                            >
                              Concluir
                            </button>
                          )}

                          {appointment.status !== 'rescheduled' && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleStatusChange(appointment, 'rescheduled')}
                              className="inline-flex min-h-[38px] items-center rounded-lg border border-[#CBD5E1] bg-[#FFFDF9] px-3 py-1.5 text-xs font-medium text-[#334155] hover:bg-[#F1F5F9] disabled:opacity-60 whitespace-nowrap cursor-pointer"
                            >
                              Reagendar
                            </button>
                          )}

                          {appointment.status !== 'cancelled' && (
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleStatusChange(appointment, 'cancelled')}
                              className="inline-flex min-h-[38px] items-center rounded-lg border border-[#E5BABA] bg-[#FFFDF9] px-3 py-1.5 text-xs font-medium text-[#7A2727] hover:bg-[#FDF2F2] disabled:opacity-60 whitespace-nowrap cursor-pointer"
                            >
                              Cancelar
                            </button>
                          )}

                          {confirmDeleteId === appointment.id ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleDeleteAppointment(appointment)}
                                className="min-h-[38px] rounded-lg bg-[#7A2727] px-3 py-1.5 text-xs font-medium text-white cursor-pointer"
                              >
                                Confirmar exclusão
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="min-h-[38px] rounded-lg border border-[#D4C8B6] px-2.5 py-1.5 text-xs text-[#52473D] cursor-pointer"
                              >
                                Não
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              aria-label={`Excluir registro de ${appointment.patientName}`}
                              onClick={() => setConfirmDeleteId(appointment.id)}
                              className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-lg border border-[#E2D9CB] text-[#665B50] hover:border-[#7A2727] hover:text-[#7A2727] transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Virtual Room Link Bar */}
                      <div className="flex flex-col gap-2 border-t border-[#E2D9CB]/80 pt-3 sm:flex-row sm:items-center">
                        <label
                          htmlFor={`link-${appointment.id}`}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#52473D] shrink-0"
                        >
                          <Video className="h-3.5 w-3.5 text-[#2F5243]" aria-hidden="true" />
                          <span>Link da sala virtual:</span>
                        </label>
                        <input
                          id={`link-${appointment.id}`}
                          type="url"
                          maxLength={500}
                          value={linkValue}
                          onChange={(e) =>
                            setMeetingLinkDrafts((prev) => ({
                              ...prev,
                              [appointment.id]: e.target.value,
                            }))
                          }
                          placeholder="https://meet.google.com/..."
                          className="min-h-[36px] flex-1 rounded-lg border border-[#D4C8B6] bg-[#FFFDF9] px-3 text-xs text-[#2C241E] focus:border-[#2F5243] focus:outline-none"
                        />
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleSaveMeetingLink(appointment)}
                          className="min-h-[36px] rounded-lg border border-[#D4C8B6] bg-[#F6F2EA] px-3.5 py-1.5 text-xs font-medium text-[#2C241E] hover:bg-[#EFE4D2] disabled:opacity-60 whitespace-nowrap cursor-pointer"
                        >
                          Salvar link
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: PATIENTS REGISTRY */}
        {activeTab === 'patients' && (
          <div className="mt-6 space-y-5">
            <div className="flex flex-col gap-3 rounded-xl border border-[#E2D9CB] bg-[#FFFDF9] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-display text-xl font-medium text-[#2C241E]">
                  Pacientes cadastrados
                </h2>
                <p className="text-xs sm:text-sm text-[#52473D]">
                  Consulte fichas clínicas completas e o histórico individual de sessões por paciente.
                </p>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-[#665B50]" />
                <input
                  type="search"
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  placeholder="Buscar por nome, WhatsApp ou e-mail"
                  className="min-h-[38px] w-full rounded-lg border border-[#D4C8B6] bg-[#FFFDF9] pl-9 pr-3 text-xs sm:text-sm text-[#2C241E] focus:border-[#2F5243] focus:outline-none"
                />
              </div>
            </div>

            {loadingPatients ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-20 rounded-xl bg-[#FFFDF9] animate-pulse" />
                ))}
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="rounded-2xl border border-[#E2D9CB] bg-[#FFFDF9] p-8 text-center">
                <p className="font-display text-lg text-[#2C241E]">
                  Nenhum paciente cadastrado ainda
                </p>
                <p className="mt-1 text-sm text-[#665B50]">
                  Assim que os pacientes criarem sua conta e preencherem a ficha complementar, aparecerão aqui.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {filteredPatients.map((patient) => {
                  const patientSessions = appointments.filter((a) => a.patientUid === patient.uid);
                  const completedCount = patientSessions.filter((a) => a.status === 'completed').length;
                  const confirmedCount = patientSessions.filter((a) => a.status === 'confirmed').length;
                  const rescheduledCount = patientSessions.filter((a) => a.status === 'rescheduled').length;
                  const cancelledCount = patientSessions.filter((a) => a.status === 'cancelled').length;

                  return (
                    <div
                      key={patient.uid}
                      className="flex flex-col justify-between rounded-xl border border-[#E2D9CB] bg-[#FFFDF9] p-5"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-display text-lg font-medium text-[#2C241E]">
                              {patient.fullName}
                            </h3>
                            <p className="font-mono-tabular text-xs text-[#665B50]">
                              {patient.phone} · {patient.email}
                            </p>
                          </div>
                          {patient.isMinor && (
                            <span className="font-mono-tabular text-xs text-[#B8732A]">
                              Menor (18-)
                            </span>
                          )}
                        </div>

                        <p className="mt-3 line-clamp-2 text-xs sm:text-sm text-[#52473D]">
                          {patient.reasonForTherapy}
                        </p>

                        <div className="mt-4 flex flex-wrap gap-3 border-t border-[#E2D9CB]/80 pt-3 font-mono-tabular text-xs text-[#52473D]">
                          <span>Concluídas: {completedCount}</span>
                          <span aria-hidden="true">·</span>
                          <span>Confirmadas: {confirmedCount}</span>
                          <span aria-hidden="true">·</span>
                          <span>Reagendadas: {rescheduledCount}</span>
                          <span aria-hidden="true">·</span>
                          <span>Canceladas: {cancelledCount}</span>
                        </div>
                      </div>

                      <div className="mt-4 pt-2">
                        <button
                          type="button"
                          onClick={() => openPatientDrawerFromProfile(patient)}
                          className="inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-lg border border-[#2F5243] bg-[#E9EFEA] px-4 py-2 text-xs font-medium text-[#2F5243] hover:bg-[#DCE6DF] transition-colors cursor-pointer"
                        >
                          <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                          <span>Abrir ficha clínica e histórico</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: FLEXIBLE SCHEDULE */}
        {activeTab === 'schedule' && (
          <div className="mt-6 space-y-6">
            <div className="rounded-2xl border border-[#E2D9CB] bg-[#FFFDF9] p-6 space-y-6">
              <div>
                <h2 className="font-display text-xl font-medium text-[#2C241E]">
                  Grade semanal padrão (100% Online)
                </h2>
                <p className="mt-1 text-sm text-[#52473D]">
                  Defina seus dias recorrentes, duração da sessão e horários disponíveis.
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-[#2C241E]">Dias da semana ativos</p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {WEEKDAYS.map((day) => {
                    const active = weeklyDays.includes(day.value);
                    return (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => handleToggleWeekday(day.value)}
                        className={`min-h-[42px] min-w-[54px] rounded-lg border px-3 py-2 text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                          active
                            ? 'border-[#2F5243] bg-[#2F5243] text-[#FFFDF9]'
                            : 'border-[#D4C8B6] bg-[#FFFDF9] text-[#52473D] hover:bg-[#F6F2EA]'
                        }`}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="sessionDurationInput" className="block text-sm font-medium text-[#2C241E]">
                    Duração da sessão (minutos)
                  </label>
                  <input
                    id="sessionDurationInput"
                    type="number"
                    min={20}
                    max={120}
                    step={5}
                    value={sessionDuration}
                    onChange={(e) => setSessionDuration(Number(e.target.value) || 50)}
                    className="mt-1.5 min-h-[42px] w-36 rounded-lg border border-[#D4C8B6] bg-[#FFFDF9] px-3 font-mono-tabular text-sm text-[#2C241E]"
                  />
                </div>

                <div>
                  <label htmlFor="addStandardSlot" className="block text-sm font-medium text-[#2C241E]">
                    Adicionar horário padrão
                  </label>
                  <div className="mt-1.5 flex items-center gap-2">
                    <input
                      id="addStandardSlot"
                      type="time"
                      value={newTimeSlot}
                      onChange={(e) => setNewTimeSlot(e.target.value)}
                      className="min-h-[42px] rounded-lg border border-[#D4C8B6] bg-[#FFFDF9] px-3 font-mono-tabular text-sm text-[#2C241E]"
                    />
                    <button
                      type="button"
                      onClick={handleAddTimeSlot}
                      className="inline-flex min-h-[42px] items-center gap-1.5 rounded-lg border border-[#2F5243] bg-[#E9EFEA] px-4 py-2 text-xs font-medium text-[#2F5243] hover:bg-[#DCE6DF] cursor-pointer"
                    >
                      <Plus className="h-4 w-4" aria-hidden="true" />
                      <span>Adicionar</span>
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-[#2C241E]">Horários padrão ativos</p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {timeSlots.length === 0 ? (
                    <p className="text-sm text-[#665B50]">Nenhum horário padrão cadastrado.</p>
                  ) : (
                    timeSlots.map((slot) => (
                      <div
                        key={slot}
                        className="inline-flex items-center gap-2 rounded-lg border border-[#D4C8B6] bg-[#F6F2EA] px-3 py-1.5 font-mono-tabular text-sm text-[#2C241E]"
                      >
                        <span>{slot}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTimeSlot(slot)}
                          aria-label={`Remover horário ${slot}`}
                          className="text-[#665B50] hover:text-[#7A2727] cursor-pointer"
                        >
                          ×
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-[#E2D9CB] bg-[#FFFDF9] p-6 space-y-5">
              <div>
                <h3 className="font-display text-lg font-medium text-[#2C241E]">
                  Horários flexíveis por data específica
                </h3>
                <p className="mt-1 text-sm text-[#52473D]">
                  Personalize horários para um dia específico (inclusive abrindo um sábado ou ajustando a grade de um único dia).
                </p>
              </div>

              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label htmlFor="overrideDateInput" className="block text-xs font-medium text-[#665B50]">
                    Data específica
                  </label>
                  <input
                    id="overrideDateInput"
                    type="date"
                    value={overrideDate}
                    onChange={(e) => setOverrideDate(e.target.value)}
                    className="mt-1 min-h-[42px] rounded-lg border border-[#D4C8B6] bg-[#FFFDF9] px-3 font-mono-tabular text-sm text-[#2C241E]"
                  />
                </div>
                <div>
                  <label htmlFor="overrideTimeInput" className="block text-xs font-medium text-[#665B50]">
                    Horário
                  </label>
                  <input
                    id="overrideTimeInput"
                    type="time"
                    value={overrideSlotInput}
                    onChange={(e) => setOverrideSlotInput(e.target.value)}
                    className="mt-1 min-h-[42px] rounded-lg border border-[#D4C8B6] bg-[#FFFDF9] px-3 font-mono-tabular text-sm text-[#2C241E]"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddOverrideSlot}
                  disabled={!overrideDate}
                  className="inline-flex min-h-[42px] items-center gap-1.5 rounded-lg border border-[#2F5243] bg-[#E9EFEA] px-4 py-2 text-xs font-medium text-[#2F5243] hover:bg-[#DCE6DF] disabled:opacity-50 cursor-pointer"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  <span>Incluir na data</span>
                </button>
              </div>

              {overrideKeys.length > 0 && (
                <div className="divide-y divide-[#E2D9CB] rounded-xl border border-[#E2D9CB] bg-[#F6F2EA]/50 px-4">
                  {overrideKeys.map((dateKey) => (
                    <div
                      key={dateKey}
                      className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono-tabular text-sm font-medium text-[#2C241E]">
                          {formatShortDatePtBr(dateKey)}:
                        </span>
                        {dateOverrides[dateKey].map((slot) => (
                          <span
                            key={slot}
                            className="inline-flex items-center gap-1.5 rounded-md border border-[#D4C8B6] bg-[#FFFDF9] px-2.5 py-1 font-mono-tabular text-xs text-[#2C241E]"
                          >
                            {slot}
                            <button
                              type="button"
                              onClick={() => handleRemoveOverrideSlot(dateKey, slot)}
                              className="text-[#665B50] hover:text-[#7A2727] cursor-pointer"
                              aria-label={`Remover ${slot} de ${dateKey}`}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleClearOverrideDate(dateKey)}
                        className="self-start text-xs text-[#7A2727] hover:underline cursor-pointer sm:self-center"
                      >
                        Restaurar padrão semanal
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  disabled={savingSchedule}
                  onClick={handleSaveSchedule}
                  className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[#2F5243] px-6 py-2.5 text-sm font-medium text-[#FFFDF9] hover:bg-[#244034] disabled:opacity-60 cursor-pointer"
                >
                  {savingSchedule ? 'Salvando grade...' : 'Salvar grade flexível'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: BLOCKED DATES */}
        {activeTab === 'blocks' && (
          <div className="mt-6 rounded-2xl border border-[#E2D9CB] bg-[#FFFDF9] p-6 space-y-6">
            <div>
              <h2 className="font-display text-xl font-medium text-[#2C241E]">
                Bloqueio de datas específicas
              </h2>
              <p className="mt-1 text-sm text-[#52473D]">
                Feriados, viagens ou dias sem atendimento ficam ocultos imediatamente para novos agendamentos.
              </p>
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label htmlFor="blockDateInput" className="block text-xs font-medium text-[#665B50]">
                  Escolha a data para bloquear
                </label>
                <input
                  id="blockDateInput"
                  type="date"
                  value={newBlockedDate}
                  onChange={(e) => setNewBlockedDate(e.target.value)}
                  className="mt-1 min-h-[42px] rounded-lg border border-[#D4C8B6] bg-[#FFFDF9] px-3 font-mono-tabular text-sm text-[#2C241E]"
                />
              </div>
              <button
                type="button"
                disabled={!newBlockedDate}
                onClick={handleAddBlockedDate}
                className="inline-flex min-h-[42px] items-center gap-1.5 rounded-lg bg-[#2F5243] px-4 py-2 text-xs sm:text-sm font-medium text-[#FFFDF9] hover:bg-[#244034] disabled:opacity-50 cursor-pointer"
              >
                <CalendarOff className="h-4 w-4" aria-hidden="true" />
                <span>Bloquear data</span>
              </button>
            </div>

            {blockedDates.length === 0 ? (
              <p className="text-sm text-[#665B50]">Nenhuma data bloqueada no momento.</p>
            ) : (
              <div className="flex flex-wrap gap-2.5">
                {blockedDates.map((dateStr) => (
                  <div
                    key={dateStr}
                    className="inline-flex items-center gap-3 rounded-lg border border-[#E2D9CB] bg-[#F6F2EA] px-3.5 py-2 font-mono-tabular text-sm text-[#2C241E]"
                  >
                    <span>{formatShortDatePtBr(dateStr)}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveBlockedDate(dateStr)}
                      className="text-xs font-sans font-medium text-[#2F5243] hover:underline cursor-pointer"
                    >
                      Desbloquear
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: ONLINE GROUPS */}
        {activeTab === 'groups' && (
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="space-y-4 lg:col-span-6">
              <div className="rounded-2xl border border-[#E2D9CB] bg-[#FFFDF9] p-6">
                <h2 className="font-display text-xl font-medium text-[#2C241E]">
                  Grupos e encontros online
                </h2>
                <p className="mt-1 text-sm text-[#52473D]">
                  Gerencie o grupo O Mito da Masculinidade e outros encontros online exibidos na página pública.
                </p>

                <div className="mt-5 space-y-3">
                  {groups.map((group) => (
                    <div
                      key={group.id}
                      className="rounded-xl border border-[#E2D9CB] bg-[#F6F2EA]/60 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-mono-tabular text-xs text-[#665B50]">
                            {group.active ? 'Ativo no site' : 'Oculto'} · {group.platformLabel}
                          </p>
                          <h3 className="mt-1 font-display text-lg font-medium text-[#2C241E]">
                            {group.title}
                          </h3>
                          {group.scheduleText && (
                            <p className="mt-0.5 text-xs text-[#52473D]">{group.scheduleText}</p>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleStartEditGroup(group)}
                          className="min-h-[36px] rounded-lg border border-[#D4C8B6] bg-[#FFFDF9] px-3 py-1.5 text-xs font-medium text-[#2C241E] hover:bg-[#EFE4D2]/50 cursor-pointer"
                        >
                          Editar
                        </button>
                        {!group.isFallback && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleToggleGroupActive(group)}
                              className="min-h-[36px] rounded-lg border border-[#D4C8B6] bg-[#FFFDF9] px-3 py-1.5 text-xs font-medium text-[#2F5243] cursor-pointer"
                            >
                              {group.active ? 'Ocultar' : 'Ativar'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteGroup(group)}
                              className="min-h-[36px] rounded-lg border border-[#E5BABA] bg-[#FFFDF9] px-3 py-1.5 text-xs font-medium text-[#7A2727] cursor-pointer"
                            >
                              Excluir
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <form
              onSubmit={handleSaveGroupSubmit}
              className="rounded-2xl border border-[#E2D9CB] bg-[#FFFDF9] p-6 space-y-4 lg:col-span-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-medium text-[#2C241E]">
                  {editingGroupId ? 'Editar grupo online' : 'Novo grupo online'}
                </h3>
                {editingGroupId && (
                  <button
                    type="button"
                    onClick={handleResetGroupForm}
                    className="text-xs text-[#665B50] hover:underline cursor-pointer"
                  >
                    Cancelar edição
                  </button>
                )}
              </div>

              <div>
                <label htmlFor="groupTitle" className="block text-sm font-medium text-[#2C241E]">
                  Título do grupo
                </label>
                <input
                  id="groupTitle"
                  type="text"
                  required
                  value={groupTitle}
                  onChange={(e) => setGroupTitle(e.target.value)}
                  placeholder="O Mito da Masculinidade"
                  className="mt-1 min-h-[42px] w-full rounded-lg border border-[#D4C8B6] bg-[#FFFDF9] px-3 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="groupSchedule" className="block text-sm font-medium text-[#2C241E]">
                    Frequência / Horário
                  </label>
                  <input
                    id="groupSchedule"
                    type="text"
                    value={groupSchedule}
                    onChange={(e) => setGroupSchedule(e.target.value)}
                    placeholder="Encontros semanais · Quinta-feira 19h"
                    className="mt-1 min-h-[42px] w-full rounded-lg border border-[#D4C8B6] bg-[#FFFDF9] px-3 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="groupPlatform" className="block text-sm font-medium text-[#2C241E]">
                    Plataforma (Online)
                  </label>
                  <input
                    id="groupPlatform"
                    type="text"
                    value={groupPlatform}
                    onChange={(e) => setGroupPlatform(e.target.value)}
                    placeholder="Exclusivamente Online (Sala Virtual)"
                    className="mt-1 min-h-[42px] w-full rounded-lg border border-[#D4C8B6] bg-[#FFFDF9] px-3 text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="groupDescription" className="block text-sm font-medium text-[#2C241E]">
                  Descrição acolhedora
                </label>
                <textarea
                  id="groupDescription"
                  rows={3}
                  value={groupDescription}
                  onChange={(e) => setGroupDescription(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-[#D4C8B6] bg-[#FFFDF9] p-3 text-sm"
                />
              </div>

              <div>
                <label htmlFor="groupGuidelines" className="block text-sm font-medium text-[#2C241E]">
                  Diretrizes e combinados (uma por linha)
                </label>
                <textarea
                  id="groupGuidelines"
                  rows={5}
                  value={groupGuidelinesText}
                  onChange={(e) => setGroupGuidelinesText(e.target.value)}
                  placeholder="Participação com câmera aberta..."
                  className="mt-1 w-full rounded-lg border border-[#D4C8B6] bg-[#FFFDF9] p-3 text-sm"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-[#2C241E] cursor-pointer">
                <input
                  type="checkbox"
                  checked={groupActive}
                  onChange={(e) => setGroupActive(e.target.checked)}
                  className="h-4 w-4 accent-[#2F5243]"
                />
                <span>Exibir este grupo na página pública</span>
              </label>

              <button
                type="submit"
                disabled={savingGroup}
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[#2F5243] px-5 py-2.5 text-sm font-medium text-[#FFFDF9] hover:bg-[#244034] disabled:opacity-60 cursor-pointer"
              >
                {savingGroup ? 'Salvando grupo...' : 'Salvar grupo online'}
              </button>
            </form>
          </div>
        )}

        {/* TAB 6: VERCEL & FIREBASE GUIDE */}
        {activeTab === 'deploy' && (
          <div className="mt-6 space-y-6">
            <div className="rounded-2xl border border-[#E2D9CB] bg-[#FFFDF9] p-6 space-y-4">
              <h2 className="font-display text-xl font-medium text-[#2C241E]">
                Checklist de Deploy na Vercel &amp; Firebase Console
              </h2>
              <ol className="space-y-3 text-sm leading-relaxed text-[#52473D]">
                <li>
                  <span className="font-mono-tabular font-medium text-[#B8732A]">01.</span>{' '}
                  O projeto Firebase <span className="font-mono-tabular">gen-lang-client-0741407642</span> e o banco Firestore já estão provisionados e com as regras de segurança (<span className="font-mono-tabular">firestore.rules</span>) publicadas.
                </li>
                <li>
                  <span className="font-mono-tabular font-medium text-[#B8732A]">02.</span>{' '}
                  <strong>Importante para cadastro de pacientes com E-mail/Senha:</strong> No Firebase Console, acesse <strong>Authentication → Sign-in method → Adicionar novo provedor → E-mail/senha</strong> e ative-o (o provedor Google já vem ativado).
                </li>
                <li>
                  <span className="font-mono-tabular font-medium text-[#B8732A]">03.</span>{' '}
                  Ao publicar na Vercel, adicione o domínio do seu deploy em <strong>Authentication → Settings → Authorized domains</strong> (ex.: <span className="font-mono-tabular">seu-app.vercel.app</span>).
                </li>
                <li>
                  <span className="font-mono-tabular font-medium text-[#B8732A]">04.</span>{' '}
                  Na <strong>Vercel → Project Settings → Environment Variables</strong>, cadastre as variáveis de <span className="font-mono-tabular">.env.example</span> (<span className="font-mono-tabular">VITE_FIREBASE_*</span>, <span className="font-mono-tabular">VITE_FIREBASE_DATABASE_ID</span>, <span className="font-mono-tabular">VITE_PSYCHOLOGIST_EMAILS</span> e <span className="font-mono-tabular">VITE_WHATSAPP_NUMBER</span>).
                </li>
              </ol>
            </div>

            <div className="rounded-2xl border border-[#E2D9CB] bg-[#FFFDF9] p-6">
              <div className="flex items-center justify-between gap-4">
                <h3 className="font-display text-lg font-medium text-[#2C241E]">
                  Referência de Segurança
                </h3>
                <button
                  type="button"
                  onClick={() => handleCopy('rules', FIRESTORE_RULES_SNIPPET)}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-[#D4C8B6] bg-[#F6F2EA] px-3 py-1.5 text-xs font-medium text-[#2C241E] hover:bg-[#EFE4D2] cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>{copiedKey === 'rules' ? 'Copiado!' : 'Copiar nota'}</span>
                </button>
              </div>
              <pre className="mt-4 overflow-x-auto rounded-xl border border-[#E2D9CB] bg-[#F6F2EA] p-4 font-mono-tabular text-xs leading-relaxed text-[#2C241E]">
                {FIRESTORE_RULES_SNIPPET}
              </pre>
            </div>
          </div>
        )}
      </main>

      {drawerContext && (
        <PatientRecordDrawer
          patient={drawerContext.patient}
          fallbackName={drawerContext.fallbackName}
          fallbackContact={drawerContext.fallbackContact}
          appointments={drawerContext.appointments}
          onClose={() => setDrawerContext(null)}
        />
      )}
    </div>
  );
}
