import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { AboutApproachSection } from './components/AboutApproachSection';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminLogin } from './components/AdminLogin';
import { BookingCompletionPage } from './components/BookingCompletionPage';
import { BookingSection } from './components/BookingSection';
import { FaqSection } from './components/FaqSection';
import { Footer } from './components/Footer';
import { HeroSection } from './components/HeroSection';
import { Navbar } from './components/Navbar';
import { OnlineGroupSection } from './components/OnlineGroupSection';
import { PatientPortal } from './components/PatientPortal';
import {
  clearPendingBookingDraft,
  DEFAULT_AVAILABILITY,
  DEFAULT_CLINIC_SETTINGS,
  DEFAULT_GROUPS,
  loadPendingBookingDraft,
  savePendingBookingDraft,
  subscribeAvailability,
  subscribeClinicSettings,
  subscribeGroups,
  subscribeOccupiedSlots,
  subscribePatientProfile,
  subscribeSlotHolds,
} from './services/agendaService';
import { isAuthorizedPsychologist, subscribeToAuthChanges } from './services/authService';
import type {
  AvailabilityConfig,
  ClinicSettings,
  GroupItem,
  PatientProfile,
  PendingBookingDraft,
  SlotHoldRecord,
} from './types/agenda';

type AppRoute = 'public' | 'patient' | 'admin' | 'register' | 'complete-booking';

function resolveRouteFromUrl(): AppRoute {
  if (typeof window === 'undefined') return 'public';
  const path = window.location.pathname;
  const hash = window.location.hash;
  if (path.startsWith('/admin') || hash === '#admin') return 'admin';
  if (path.startsWith('/paciente') || hash === '#paciente') return 'patient';
  if (path.startsWith('/cadastro') || hash === '#cadastro') return 'register';
  if (path.startsWith('/concluir-agendamento') || hash === '#concluir-agendamento') {
    return 'complete-booking';
  }
  return 'public';
}

export default function App() {
  const [viewMode, setViewMode] = useState<AppRoute>(() => resolveRouteFromUrl());

  const [availability, setAvailability] = useState<AvailabilityConfig & { existsInDb?: boolean }>(
    DEFAULT_AVAILABILITY
  );
  const [clinicSettings, setClinicSettings] = useState<ClinicSettings & { existsInDb?: boolean }>(
    DEFAULT_CLINIC_SETTINGS
  );
  const [loadingAvailability, setLoadingAvailability] = useState(true);
  const [occupiedSlots, setOccupiedSlots] = useState<Set<string>>(() => new Set());
  const [slotHolds, setSlotHolds] = useState<SlotHoldRecord[]>([]);
  const [groups, setGroups] = useState<GroupItem[]>(DEFAULT_GROUPS);

  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [patientProfile, setPatientProfile] = useState<PatientProfile | null>(null);
  const [loadingPatientProfile, setLoadingPatientProfile] = useState(false);

  const [pendingDraft, setPendingDraft] = useState<PendingBookingDraft | null>(() =>
    loadPendingBookingDraft()
  );

  useEffect(() => {
    const handlePopState = () => {
      setViewMode(resolveRouteFromUrl());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const unsubAvailability = subscribeAvailability(
      (data: AvailabilityConfig & { existsInDb?: boolean }) => {
        setAvailability(data);
        setLoadingAvailability(false);
      },
      () => {
        setLoadingAvailability(false);
      }
    );

    const unsubClinicSettings = subscribeClinicSettings(
      (data: ClinicSettings & { existsInDb?: boolean }) => {
        setClinicSettings(data);
      }
    );

    const unsubOccupied = subscribeOccupiedSlots((slotSet: Set<string>) => {
      setOccupiedSlots(slotSet);
    });

    const unsubHolds = subscribeSlotHolds((holds: SlotHoldRecord[]) => {
      setSlotHolds(holds);
    });

    const unsubGroups = subscribeGroups((list: GroupItem[]) => {
      setGroups(list.length > 0 ? list : DEFAULT_GROUPS);
    });

    const unsubAuth = subscribeToAuthChanges((user: User | null) => {
      setCurrentUser(user);
      setAuthReady(true);
    });

    return () => {
      unsubAvailability();
      unsubClinicSettings();
      unsubOccupied();
      unsubHolds();
      unsubGroups();
      unsubAuth();
    };
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setPatientProfile(null);
      setLoadingPatientProfile(false);
      return;
    }
    setLoadingPatientProfile(true);
    const unsubProfile = subscribePatientProfile(
      currentUser.uid,
      (profile: PatientProfile | null) => {
        setPatientProfile(profile);
        setLoadingPatientProfile(false);
      },
      () => {
        setLoadingPatientProfile(false);
      }
    );
    return () => unsubProfile();
  }, [currentUser]);

  const navigateTo = (mode: AppRoute) => {
    setViewMode(mode);
    const targetPath =
      mode === 'admin'
        ? '/admin'
        : mode === 'patient'
        ? '/paciente'
        : mode === 'register'
        ? '/cadastro'
        : mode === 'complete-booking'
        ? '/concluir-agendamento'
        : '/';
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Automatic login verification sync between /cadastro and /concluir-agendamento
  useEffect(() => {
    if (!authReady) return;
    if (viewMode === 'register' && currentUser) {
      navigateTo('complete-booking');
    } else if (viewMode === 'complete-booking' && !currentUser) {
      navigateTo('register');
    }
  }, [authReady, viewMode, currentUser]);

  const scrollToSection = (sectionId: string) => {
    if (viewMode !== 'public') {
      navigateTo('public');
      setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
      }, 120);
      return;
    }
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleStartBookingFlow = (draft: PendingBookingDraft) => {
    savePendingBookingDraft(draft);
    setPendingDraft(draft);
    if (currentUser) {
      navigateTo('complete-booking');
    } else {
      navigateTo('register');
    }
  };

  const handleResumePendingDraft = () => {
    if (currentUser) {
      navigateTo('complete-booking');
    } else {
      navigateTo('register');
    }
  };

  const handleClearDraft = () => {
    clearPendingBookingDraft();
    setPendingDraft(null);
  };

  if (viewMode === 'admin') {
    if (!authReady) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#F6F2EA] text-sm text-[#52473D]">
          Verificando sessão...
        </div>
      );
    }

    const authorizedAdmin = currentUser && isAuthorizedPsychologist(currentUser) ? currentUser : null;
    const adminAuthError =
      currentUser && !isAuthorizedPsychologist(currentUser)
        ? 'A conta conectada não está autorizada para gerenciar a agenda do psicólogo.'
        : null;

    if (!authorizedAdmin) {
      return (
        <AdminLogin
          onBackToPublic={() => navigateTo('public')}
          initialError={adminAuthError}
        />
      );
    }

    return (
      <AdminDashboard
        user={authorizedAdmin}
        availability={availability}
        clinicSettings={clinicSettings}
        groups={groups}
        onBackToPublic={() => navigateTo('public')}
      />
    );
  }

  if (viewMode === 'register' || viewMode === 'complete-booking') {
    return (
      <BookingCompletionPage
        mode={viewMode}
        user={currentUser}
        authReady={authReady}
        patientProfile={patientProfile}
        loadingPatientProfile={loadingPatientProfile}
        pendingDraft={pendingDraft}
        sessionDuration={availability.sessionDuration}
        clinicSettings={clinicSettings}
        onClearDraft={handleClearDraft}
        onBackToBooking={() => scrollToSection('agendar')}
        onOpenPatientPortal={() => navigateTo('patient')}
      />
    );
  }

  if (viewMode === 'patient') {
    return (
      <PatientPortal
        user={currentUser}
        authReady={authReady}
        patientProfile={patientProfile}
        sessionDuration={availability.sessionDuration}
        clinicSettings={clinicSettings}
        onBackToPublic={() => navigateTo('public')}
        onBookNewSession={() => scrollToSection('agendar')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F2EA] text-[#2C241E]">
      <Navbar
        psychologistName={clinicSettings.psychologistName}
        isPatientSignedIn={Boolean(currentUser)}
        onScrollToSection={scrollToSection}
        onOpenPatientPortal={() => navigateTo('patient')}
      />
      <main>
        <HeroSection
          sessionDuration={availability.sessionDuration}
          clinicSettings={clinicSettings}
          onBookClick={() => scrollToSection('agendar')}
          onGroupClick={() => scrollToSection('grupo')}
        />
        <BookingSection
          availability={availability}
          clinicSettings={clinicSettings}
          occupiedSlots={occupiedSlots}
          slotHolds={slotHolds}
          loadingAvailability={loadingAvailability}
          currentUser={currentUser}
          patientProfile={patientProfile}
          pendingDraft={pendingDraft}
          onStartBookingFlow={handleStartBookingFlow}
          onResumePendingDraft={handleResumePendingDraft}
        />
        <AboutApproachSection clinicSettings={clinicSettings} />
        <OnlineGroupSection groups={groups} clinicSettings={clinicSettings} />
        <FaqSection
          sessionDuration={availability.sessionDuration}
          clinicSettings={clinicSettings}
        />
      </main>
      <Footer clinicSettings={clinicSettings} onOpenAdmin={() => navigateTo('admin')} />
    </div>
  );
}
