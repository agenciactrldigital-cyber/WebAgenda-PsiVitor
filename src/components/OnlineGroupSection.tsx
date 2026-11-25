import { MessageCircle, ShieldCheck, Video } from 'lucide-react';
import { buildGroupWhatsAppUrl } from '../services/agendaService';
import type { ClinicSettings, GroupItem } from '../types/agenda';

interface OnlineGroupSectionProps {
  groups: GroupItem[];
  clinicSettings: ClinicSettings;
}

export function OnlineGroupSection({ groups, clinicSettings }: OnlineGroupSectionProps) {
  const activeGroups = groups.filter((g) => g.active);

  if (activeGroups.length === 0) {
    return null;
  }

  return (
    <section id="grupo" className="border-b border-[#E2D9CB] bg-[#FFFDF9] py-14 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <p className="font-mono-tabular text-xs tracking-wide text-[#665B50]">
            Grupo Terapêutico e Vivencial · Sempre Online
          </p>
          <h2 className="mt-2 font-display text-2xl sm:text-3xl font-medium text-[#2C241E] text-balance">
            Encontros em grupo para compartilhar no aqui e agora
          </h2>
        </div>

        <div className="mt-10 space-y-8">
          {activeGroups.map((group) => (
            <div
              key={group.id}
              className="rounded-2xl border border-[#E2D9CB] bg-[#F6F2EA]/60 p-6 sm:p-9"
            >
              <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-start">
                <div className="lg:col-span-6">
                  <div className="flex flex-wrap items-center gap-2 font-mono-tabular text-xs text-[#2F5243]">
                    <Video className="h-4 w-4" aria-hidden="true" />
                    <span>{group.platformLabel || 'Exclusivamente Online (Sala Virtual)'}</span>
                    {group.scheduleText && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="text-[#665B50]">{group.scheduleText}</span>
                      </>
                    )}
                  </div>

                  <h3 className="mt-3 font-display text-2xl sm:text-3xl font-medium text-[#2C241E]">
                    {group.title}
                  </h3>

                  {group.description && (
                    <p className="mt-4 text-base leading-relaxed text-[#52473D]">
                      {group.description}
                    </p>
                  )}

                  <div className="mt-6">
                    <a
                      href={buildGroupWhatsAppUrl(group.title, clinicSettings)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[#2F5243] px-5 py-3 text-sm font-medium text-[#FFFDF9] hover:bg-[#244034] transition-colors whitespace-nowrap"
                    >
                      <MessageCircle className="h-4 w-4" aria-hidden="true" />
                      <span>Quero saber mais e participar</span>
                    </a>
                  </div>
                </div>

                {group.guidelines && group.guidelines.length > 0 && (
                  <div className="rounded-xl border border-[#E2D9CB] bg-[#FFFDF9] p-5 sm:p-6 lg:col-span-6">
                    <div className="flex items-center gap-2 border-b border-[#E2D9CB] pb-3">
                      <ShieldCheck className="h-4 w-4 text-[#B8732A]" aria-hidden="true" />
                      <h4 className="font-display text-base font-medium text-[#2C241E]">
                        Combinados e diretrizes do grupo online
                      </h4>
                    </div>

                    <ul className="mt-4 space-y-3">
                      {group.guidelines.map((rule, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-sm leading-relaxed text-[#52473D]">
                          <span className="font-mono-tabular text-xs font-medium text-[#B8732A] pt-0.5 shrink-0">
                            {String(idx + 1).padStart(2, '0')}.
                          </span>
                          <span>{rule}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
