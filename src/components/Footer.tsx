import { Lock } from 'lucide-react';
import { getWhatsAppNumber } from '../services/agendaService';

interface FooterProps {
  onOpenAdmin: () => void;
}

export function Footer({ onOpenAdmin }: FooterProps) {
  const whatsappPhone = getWhatsAppNumber();

  return (
    <footer className="bg-[#F6F2EA] py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div>
          <p className="font-display text-base font-medium text-[#2C241E]">Vitor Gomes</p>
          <p className="mt-1 font-mono-tabular text-xs text-[#665B50]">
            Psicólogo Clínico · CRP 11/20859 · @psi.vitorgomes · Atendimento 100% Online
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-5 text-sm text-[#665B50]">
          <a
            href="https://instagram.com/psi.vitorgomes"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#2C241E] transition-colors"
          >
            Instagram
          </a>
          <a
            href={`https://wa.me/${whatsappPhone}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-[#2C241E] transition-colors"
          >
            WhatsApp
          </a>
          <button
            type="button"
            onClick={onOpenAdmin}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-[#E2D9CB] bg-[#FFFDF9] px-3 py-1.5 text-xs font-medium text-[#52473D] hover:border-[#2F5243] hover:text-[#2C241E] transition-colors cursor-pointer"
          >
            <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Área do Psicólogo</span>
          </button>
        </div>
      </div>
    </footer>
  );
}
