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
import {
  DEFAULT_AVAILABILITY,
  DEFAULT_GROUPS,
  subscribeAvailability,
  subscribeGroups,
  subscribeOccupiedSlots,
} from './services/agendaService';
import { isAuthorizedPsychologist, subscribeToAuthChanges } from './services/authService';
import type { AvailabilityConfig, GroupItem } from './types/agenda';

function isAdminRoute(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.location.pathname.startsWith('/admin') ||
    window.location.hash === '#admin'
  );
}

export default function App() {
  const [viewMode, setViewMode] = useState<'public' | 'admin'>(() =>
    isAdminRoute() ? 'admin' : 'public'
  );

  const [availability, setAvailability] = useState<AvailabilityConfig & { existsInDb?: boolean }>(
    DEFAULT_AVAILABILITY
  );
  const [loadingAvailability, setLoadingAvailability] = useState(true);
  const [occupiedSlots, setOccupiedSlots] = useState<Set<string>>(() => new Set());
  const [groups, setGroups] = useState<GroupItem[]>(DEFAULT_GROUPS);

  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const handlePopState = () => {
      setViewMode(isAdminRoute() ? 'admin' : 'public');
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
      if (user && !isAuthorizedPsychologist(user)) {
        setAuthError('Esta conta não está autorizada a gerenciar a agenda.');
        setCurrentUser(null);
      } else {
        setAuthError(null);
        setCurrentUser(user);
      }
      setAuthReady(true);
    });

    return () => {
      unsubAvailability();
      unsubOccupied();
      unsubGroups();
      unsubAuth();
    };
  }, []);

  const navigateTo = (mode: 'public' | 'admin') => {
    setViewMode(mode);
    const targetPath = mode === 'admin' ? '/admin' : '/';
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

    if (!currentUser) {
      return (
        <AdminLogin
          onBackToPublic={() => navigateTo('public')}
          initialError={authError}
        />
      );
    }

    return (
      <AdminDashboard
        user={currentUser}
        availability={availability}
        groups={groups}
        onBackToPublic={() => navigateTo('public')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F2EA] text-[#2C241E]">
      <Navbar onScrollToSection={scrollToSection} />
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
        />
        <AboutApproachSection />
        <OnlineGroupSection groups={groups} />
        <FaqSection />
      </main>
      <Footer onOpenAdmin={() => navigateTo('admin')} />
    </div>
  );
}
