import { ArrowRight } from 'lucide-react';
import { LanternMark } from './LanternMark';

interface HeroSectionProps {
  sessionDuration: number;
  onBookClick: () => void;
  onGroupClick: () => void;
}

export function HeroSection({ sessionDuration, onBookClick, onGroupClick }: HeroSectionProps) {
  return (
    <section id="inicio" className="border-b border-[#E2D9CB] bg-[#F6F2EA]">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-stretch lg:gap-12">
          <div className="flex flex-col justify-center lg:col-span-7">
            <p className="font-mono-tabular text-xs sm:text-sm tracking-wide text-[#665B50]">
              @psi.vitorgomes <span aria-hidden="true">·</span> CRP 11/20859 <span aria-hidden="true">·</span> Psicoterapia Online
            </p>

            <h1 className="mt-4 font-display text-3xl sm:text-4xl lg:text-[3.15rem] font-medium leading-[1.14] tracking-tight text-[#2C241E] text-balance">
              Iluminar o presente para caminhar com mais leveza.
            </h1>

            <p className="mt-5 max-w-2xl text-base sm:text-[17px] leading-relaxed text-[#52473D]">
              Sou Vitor Gomes, psicólogo clínico e Gestalt-terapeuta. Com percurso na clínica, na psicologia escolar e na filosofia, ofereço um espaço de escuta autêntica, humana e sem julgamentos — no aqui e agora — para adultos e adolescentes em atendimento exclusivamente online.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={onBookClick}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[#2F5243] px-6 py-3 text-sm font-medium text-[#FFFDF9] hover:bg-[#244034] transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F5243] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F6F2EA]"
              >
                <span>Escolher horário online</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={onGroupClick}
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-[#D4C8B6] bg-[#FFFDF9] px-5 py-3 text-sm font-medium text-[#2C241E] hover:bg-[#EFE4D2]/60 transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F5243]"
              >
                Grupo O Mito da Masculinidade
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 flex">
            <div className="relative flex w-full flex-col justify-between overflow-hidden rounded-2xl border border-[#E2D9CB] bg-[#FFFDF9] p-7 sm:p-9">
              <div
                className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full"
                style={{
                  background:
                    'radial-gradient(circle, rgba(184,115,42,0.18) 0%, rgba(239,228,210,0.35) 48%, rgba(255,253,249,0) 75%)',
                }}
                aria-hidden="true"
              />

              <div className="relative flex items-center justify-between gap-4 border-b border-[#E2D9CB]/80 pb-5">
                <div className="flex items-center gap-3 text-[#2C241E]">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#FDF4E6] text-[#B8732A] border border-[#EFE0C6]">
                    <LanternMark className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-display text-base font-medium text-[#2C241E]">
                      A Metáfora da Lanterna
                    </p>
                    <p className="font-mono-tabular text-xs text-[#665B50]">
                      Gestalt-terapia · Aqui e agora
                    </p>
                  </div>
                </div>
              </div>

              <div className="relative my-7 space-y-4">
                <p className="font-display italic text-lg sm:text-xl leading-relaxed text-[#2C241E]">
                  “A terapia não dita o caminho que você deve seguir. Ela funciona como uma lanterna: ajuda a iluminar o que está diante dos seus pés hoje, para que você escolha seus próprios passos com mais clareza.”
                </p>
                <p className="text-sm leading-relaxed text-[#665B50]">
                  Atendimento online pensado para sustentar vínculo, continuidade e presença — onde você estiver.
                </p>
              </div>

              <div className="relative rounded-xl bg-[#EFE4D2]/70 px-4 py-3 text-xs sm:text-sm text-[#2C241E] border border-[#E2D9CB]">
                <span className="font-mono-tabular text-[#665B50]">Para quem:</span>{' '}
                Adultos em transições, trabalho, parentalidade e ansiedade · Adolescentes buscando escuta segura.
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-4 border-t border-[#E2D9CB] pt-7 sm:grid-cols-4 sm:gap-6">
          <div>
            <p className="font-mono-tabular text-xs text-[#665B50]">Duração</p>
            <p className="mt-1 font-display text-lg font-medium text-[#2C241E] font-mono-tabular">
              {sessionDuration} minutos
            </p>
          </div>
          <div>
            <p className="font-mono-tabular text-xs text-[#665B50]">Formato</p>
            <p className="mt-1 font-display text-lg font-medium text-[#2C241E]">
              100% Online
            </p>
          </div>
          <div>
            <p className="font-mono-tabular text-xs text-[#665B50]">Abordagem</p>
            <p className="mt-1 font-display text-lg font-medium text-[#2C241E]">
              Gestalt-terapia
            </p>
          </div>
          <div>
            <p className="font-mono-tabular text-xs text-[#665B50]">Público</p>
            <p className="mt-1 font-display text-lg font-medium text-[#2C241E]">
              Adultos e Adolescentes
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
