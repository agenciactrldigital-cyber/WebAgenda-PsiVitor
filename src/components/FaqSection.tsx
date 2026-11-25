import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { ClinicSettings } from '../types/agenda';

interface FaqSectionProps {
  sessionDuration: number;
  clinicSettings: ClinicSettings;
}

export function FaqSection({ sessionDuration, clinicSettings }: FaqSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqItems = [
    {
      question: 'Como funciona a confirmação após enviar uma solicitação de horário?',
      answer:
        'Assim que você envia o pedido, o horário fica reservado na agenda para evitar conflitos. Em seguida, entro em contato pelo WhatsApp ou e-mail informado para confirmar o encontro e disponibilizar o link da sala virtual.',
    },
    {
      question: 'Qual é a duração das sessões e o formato do atendimento?',
      answer: `As sessões individuais duram ${sessionDuration} minutos e acontecem no formato ${clinicSettings.modalityLabel} por videochamada, com sigilo profissional garantido.${
        clinicSettings.sessionFeeNote ? ` ${clinicSettings.sessionFeeNote}` : ''
      }`,
    },
    {
      question: 'Quem pode agendar atendimento?',
      answer: `O acompanhamento online contempla ${clinicSettings.audienceLabel.toLowerCase()}, oferecendo um espaço seguro de escuta. Para menores de 18 anos, realizamos um alinhamento inicial com os responsáveis.`,
    },
    {
      question: 'Como funciona o sigilo no formulário e durante as sessões?',
      answer: `Os dados e observações enviados por aqui não ficam visíveis a outros visitantes e são acessados exclusivamente pelo psicólogo ${clinicSettings.psychologistName} (${clinicSettings.crp}), seguindo o Código de Ética Profissional.`,
    },
    {
      question: 'O grupo O Mito da Masculinidade substitui a terapia individual?',
      answer:
        'Não. Trata-se de uma intervenção psicossocial e vivencial em grupo (também realizada exclusivamente online), com combinados específicos de câmera aberta, sigilo e não gravação, podendo caminhar em paralelo ao processo individual.',
    },
  ];

  return (
    <section id="duvidas" className="border-b border-[#E2D9CB] bg-[#F6F2EA] py-14 sm:py-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-left sm:text-center">
          <p className="font-mono-tabular text-xs tracking-wide text-[#665B50]">
            Orientações práticas
          </p>
          <h2 className="mt-2 font-display text-2xl sm:text-3xl font-medium text-[#2C241E]">
            Dúvidas frequentes
          </h2>
        </div>

        <div className="mt-8 divide-y divide-[#E2D9CB] rounded-2xl border border-[#E2D9CB] bg-[#FFFDF9] px-5 sm:px-8">
          {faqItems.map((item, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div key={item.question} className="py-2">
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : idx)}
                  aria-expanded={isOpen}
                  className="flex min-h-[52px] w-full items-center justify-between gap-4 py-3 text-left text-base font-medium text-[#2C241E] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F5243] rounded"
                >
                  <span>{item.question}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-[#665B50] transition-transform duration-150 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                    aria-hidden="true"
                  />
                </button>
                {isOpen && (
                  <p className="pb-4 pr-6 text-sm sm:text-base leading-relaxed text-[#52473D]">
                    {item.answer}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
