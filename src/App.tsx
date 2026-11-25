import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { AboutApproachSection } from './components/AboutApproachSection';
import { AdminDashboard } from './components/AdminDashboard';
import { AdminLogin } from './components/AdminLogin';
import { BookingSection } from './components/BookingSection';
import { FaqSection } from './components/FaqSection';
import { Footer } from './components/Footer';
import { HeroSection } from './components/HeroSection';
import { Navbar } from './components/Navbar';
import { OnlineGroupSection } from './components/OnlineGroupSection';
import { PatientPortal } from './components/PatientPortal';
import {
  DEFAULT_AVAILABILITY,
  DEFAULT_GROUPS,
  subscribeAvailability,
  subscribeGroups,
  subscribeOccupiedSlots,
  subscribePatientProfile,
} from './services/agendaService';
import { isAuthorizedPsychologist, subscribeToAuthChanges } from './services/authService';
import type { AvailabilityConfig, GroupItem, PatientProfile } from './types/agenda';

type AppRoute = 'public' | 'patient' | 'admin';

function resolveRouteFromUrl(): AppRoute {
  if (typeof window === 'undefined') return 'public';
  const path = window.location.pathname;
  const hash = window.location.hash;
  if (path.startsWith('/admin') || hash === '#admin') return 'admin';
  if (path.startsWith('/paciente') || hash === '#paciente') return 'patient';
  return 'public';
}

export default function App() {
  const [viewMode, setViewMode] = useState<AppRoute>(() => resolveRouteFromUrl());

  const [availability, setAvailability] = useState<AvailabilityConfig & { existsInDb?: boolean }>(
    DEFAULT_AVAILABILITY
  );
  const [loadingAvailability, setLoadingAvailability] = useState(true);
  const [occupiedSlots, setOccupiedSlots] = useState<Set<string>>(() => new Set());
  const [groups, setGroups] = useState<GroupItem[]>(DEFAULT_GROUPS);

  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [patientProfile, setPatientProfile] = useState<PatientProfile | null>(null);
  const [loadingPatientProfile, setLoadingPatientProfile] = useState(false);

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

    const unsubOccupied = subscribeOccupiedSlots((slotSet: Set<string>) => {
      setOccupiedSlots(slotSet);
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
      unsubOccupied();
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
    const targetPath = mode === 'admin' ? '/admin' : mode === 'patient' ? '/paciente' : '/';
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
        groups={groups}
        onBackToPublic={() => navigateTo('public')}
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
        onBackToPublic={() => navigateTo('public')}
        onBookNewSession={() => scrollToSection('agendar')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F2EA] text-[#2C241E]">
      <Navbar
        isPatientSignedIn={Boolean(currentUser)}
        onScrollToSection={scrollToSection}
        onOpenPatientPortal={() => navigateTo('patient')}
      />
      <main>
        <HeroSection
          sessionDuration={availability.sessionDuration}
          onBookClick={() => scrollToSection('agendar')}
          onGroupClick={() => scrollToSection('grupo')}
        />
        <BookingSection
          availability={availability}
          occupiedSlots={occupiedSlots}
          loadingAvailability={loadingAvailability}
          currentUser={currentUser}
          patientProfile={patientProfile}
          loadingPatientProfile={loadingPatientProfile}
          onOpenPatientPortal={() => navigateTo('patient')}
        />
        <AboutApproachSection />
        <OnlineGroupSection groups={groups} />
        <FaqSection />
      </main>
      <Footer onOpenAdmin={() => navigateTo('admin')} />
    </div>
  );
}
