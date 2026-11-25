import { LanternMark } from './LanternMark';

const PILLARS = [
  {
    number: '01.',
    title: 'Presença no aqui e agora',
    body: 'Na Gestalt-terapia, olhamos juntos para o que emerge no momento presente — pensamentos, emoções, corpo e relações — sem pressa de encaixar sua história em fórmulas prontas.',
  },
  {
    number: '02.',
    title: 'Escuta acolhedora e ética',
    body: 'A experiência em psicologia clínica, psicologia escolar e filosofia sustenta um diálogo sensível às complexidades da vida adulta, do trabalho, da parentalidade e das travessias da adolescência.',
  },
  {
    number: '03.',
    title: 'O vínculo também acontece na tela',
    body: 'O atendimento exclusivamente online permite que você construa seu processo terapêutico em um ambiente reservado da sua rotina, mantendo profundidade, continuidade e presença.',
  },
];

export function AboutApproachSection() {
  return (
    <section id="sobre" className="border-b border-[#E2D9CB] bg-[#F6F2EA] py-14 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-5">
            <div className="inline-flex items-center gap-2 text-xs font-mono-tabular text-[#B8732A]">
              <LanternMark className="h-4 w-4" />
              <span>Gestalt-terapia &amp; Clínica Online</span>
            </div>

            <h2 className="mt-3 font-display text-2xl sm:text-3xl font-medium text-[#2C241E] text-balance">
              Um espaço de clareza, sem julgamentos.
            </h2>

            <p className="mt-4 text-base leading-relaxed text-[#52473D]">
              Muitas vezes chegamos à terapia sentindo o peso da ansiedade, de transições difíceis ou da sensação de estarmos no piloto automático. Meu papel não é apontar respostas prontas, mas caminhar ao seu lado enquanto iluminamos o que pede atenção hoje.
            </p>

            <div className="mt-6 rounded-xl border border-[#E2D9CB] bg-[#EFE4D2]/60 p-5">
              <p className="font-mono-tabular text-xs text-[#665B50]">Trajetória</p>
              <p className="mt-1.5 text-sm leading-relaxed text-[#2C241E]">
                Psicólogo clínico (CRP 11/20859) com atuação na clínica, psicologia escolar e formação em filosofia — integrando rigor reflexivo e escuta sensível para adultos e adolescentes.
              </p>
            </div>
          </div>

          <div className="lg:col-span-7 divide-y divide-[#E2D9CB] rounded-2xl border border-[#E2D9CB] bg-[#FFFDF9] px-6 sm:px-8">
            {PILLARS.map((item) => (
              <div key={item.number} className="py-6 first:pt-7 last:pb-7">
                <div className="flex items-baseline gap-3">
                  <span className="font-mono-tabular text-sm font-medium text-[#B8732A]">
                    {item.number}
                  </span>
                  <h3 className="font-display text-lg font-medium text-[#2C241E]">
                    {item.title}
                  </h3>
                </div>
                <p className="mt-2 pl-8 text-sm sm:text-base leading-relaxed text-[#52473D]">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
