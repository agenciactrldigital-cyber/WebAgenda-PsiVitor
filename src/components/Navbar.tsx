import { useState } from 'react';
import { Menu, X } from 'lucide-react';

interface NavbarProps {
  isPatientSignedIn: boolean;
  onScrollToSection: (sectionId: string) => void;
  onOpenPatientPortal: () => void;
}

const NAV_LINKS = [
  { id: 'sobre', label: 'Sobre' },
  { id: 'agendar', label: 'Agendar' },
  { id: 'grupo', label: 'Grupo Online' },
  { id: 'duvidas', label: 'Dúvidas' },
];

export function Navbar({
  isPatientSignedIn,
  onScrollToSection,
  onOpenPatientPortal,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavigate = (id: string) => {
    setMobileMenuOpen(false);
    onScrollToSection(id);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-[#E2D9CB] bg-[#F6F2EA]/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        <a
          href="#inicio"
          onClick={(e) => {
            e.preventDefault();
            handleNavigate('inicio');
          }}
          className="font-display text-lg font-medium tracking-tight text-[#2C241E] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F5243] rounded"
        >
          Vitor Gomes
        </a>

        <nav className="hidden md:flex items-center gap-7" aria-label="Navegação principal">
          {NAV_LINKS.map((link) => (
            <button
              key={link.id}
              type="button"
              onClick={() => handleNavigate(link.id)}
              className="text-sm font-medium text-[#665B50] hover:text-[#2C241E] transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F5243] rounded py-1"
            >
              {link.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenPatientPortal();
            }}
            className="hidden sm:inline-flex items-center justify-center rounded-lg bg-[#2F5243] px-4 py-2 text-sm font-medium text-[#FFFDF9] hover:bg-[#244034] transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F5243] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F6F2EA]"
          >
            {isPatientSignedIn ? 'Minha Área' : 'Área do Paciente'}
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden inline-flex h-11 w-11 items-center justify-center rounded-lg text-[#2C241E] hover:bg-[#EFE4D2]/70 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F5243]"
            aria-label={mobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#E2D9CB] bg-[#FFFDF9] px-4 py-4">
          <nav className="flex flex-col gap-1" aria-label="Menu móvel">
            {NAV_LINKS.map((link) => (
              <button
                key={link.id}
                type="button"
                onClick={() => handleNavigate(link.id)}
                className="flex min-h-[44px] items-center rounded-lg px-3 text-left text-sm font-medium text-[#2C241E] hover:bg-[#F6F2EA] transition-colors cursor-pointer"
              >
                {link.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenPatientPortal();
              }}
              className="mt-2 flex min-h-[44px] w-full items-center justify-center rounded-lg bg-[#2F5243] px-4 py-2.5 text-sm font-medium text-[#FFFDF9] hover:bg-[#244034] transition-colors cursor-pointer"
            >
              {isPatientSignedIn ? 'Minha Área' : 'Área do Paciente'}
            </button>
          </nav>
        </div>
      )}
    </header>
  );
}
