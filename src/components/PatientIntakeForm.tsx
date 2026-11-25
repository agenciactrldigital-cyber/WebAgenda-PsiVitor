import { FormEvent, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { Lock } from 'lucide-react';
import { formatFirestoreError, savePatientProfile } from '../services/agendaService';
import type { PatientProfile } from '../types/agenda';

interface PatientIntakeFormProps {
  user: User;
  existingProfile: PatientProfile | null;
  submitLabel?: string;
  onSaved?: (savedSummary: { fullName: string; phone: string }) => void | Promise<void>;
}

export function PatientIntakeForm({
  user,
  existingProfile,
  submitLabel = 'Salvar ficha clínica',
  onSaved,
}: PatientIntakeFormProps) {
  const [fullName, setFullName] = useState(
    existingProfile?.fullName || user.displayName || ''
  );
  const [phone, setPhone] = useState(existingProfile?.phone || '');
  const [birthDate, setBirthDate] = useState(existingProfile?.birthDate || '');
  const [cityState, setCityState] = useState(existingProfile?.cityState || '');
  const [occupation, setOccupation] = useState(existingProfile?.occupation || '');

  const [isMinor, setIsMinor] = useState(Boolean(existingProfile?.isMinor));
  const [guardianName, setGuardianName] = useState(existingProfile?.guardianName || '');
  const [guardianPhone, setGuardianPhone] = useState(existingProfile?.guardianPhone || '');

  const [emergencyContactName, setEmergencyContactName] = useState(
    existingProfile?.emergencyContactName || ''
  );
  const [emergencyContactRelation, setEmergencyContactRelation] = useState(
    existingProfile?.emergencyContactRelation || ''
  );
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(
    existingProfile?.emergencyContactPhone || ''
  );

  const [reasonForTherapy, setReasonForTherapy] = useState(
    existingProfile?.reasonForTherapy || ''
  );
  const [hadPreviousTherapy, setHadPreviousTherapy] = useState(
    Boolean(existingProfile?.hadPreviousTherapy)
  );
  const [previousTherapyDetails, setPreviousTherapyDetails] = useState(
    existingProfile?.previousTherapyDetails || ''
  );
  const [usesMedication, setUsesMedication] = useState(
    Boolean(existingProfile?.usesMedication)
  );
  const [medicationDetails, setMedicationDetails] = useState(
    existingProfile?.medicationDetails || ''
  );
  const [acceptedTerms, setAcceptedTerms] = useState(
    Boolean(existingProfile?.acceptedTerms)
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!existingProfile) return;
    setFullName(existingProfile.fullName || user.displayName || '');
    setPhone(existingProfile.phone || '');
    setBirthDate(existingProfile.birthDate || '');
    setCityState(existingProfile.cityState || '');
    setOccupation(existingProfile.occupation || '');
    setIsMinor(Boolean(existingProfile.isMinor));
    setGuardianName(existingProfile.guardianName || '');
    setGuardianPhone(existingProfile.guardianPhone || '');
    setEmergencyContactName(existingProfile.emergencyContactName || '');
    setEmergencyContactRelation(existingProfile.emergencyContactRelation || '');
    setEmergencyContactPhone(existingProfile.emergencyContactPhone || '');
    setReasonForTherapy(existingProfile.reasonForTherapy || '');
    setHadPreviousTherapy(Boolean(existingProfile.hadPreviousTherapy));
    setPreviousTherapyDetails(existingProfile.previousTherapyDetails || '');
    setUsesMedication(Boolean(existingProfile.usesMedication));
    setMedicationDetails(existingProfile.medicationDetails || '');
    setAcceptedTerms(Boolean(existingProfile.acceptedTerms));
  }, [existingProfile, user.displayName]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSavedNotice(null);
    setSaving(true);
    try {
      await savePatientProfile(
        user.uid,
        {
          email: user.email || existingProfile?.email || '',
          fullName,
          phone,
          birthDate,
          cityState,
          occupation,
          isMinor,
          guardianName,
          guardianPhone,
          emergencyContactName,
          emergencyContactRelation,
          emergencyContactPhone,
          reasonForTherapy,
          hadPreviousTherapy,
          previousTherapyDetails,
          usesMedication,
          medicationDetails,
          acceptedTerms,
        },
        Boolean(existingProfile)
      );

      if (onSaved) {
        await onSaved({ fullName: fullName.trim(), phone: phone.trim() });
      } else {
        setSavedNotice('Cadastro clínico salvo com segurança.');
      }
    } catch (err) {
      setError(formatFirestoreError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Section 1: Personal Info */}
      <div className="space-y-3.5">
        <div className="border-b border-[#E2D9CB] pb-2">
          <p className="font-mono-tabular text-xs text-[#B8732A]">01. Dados pessoais</p>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="intakeFullName" className="block text-xs font-medium text-[#2C241E]">
              Nome completo
            </label>
            <input
              id="intakeFullName"
              type="text"
              required
              maxLength={120}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 min-h-[42px] w-full rounded-lg border border-[#D4C8B6] bg-[#FFFDF9] px-3 text-sm text-[#2C241E] focus:border-[#2F5243] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="intakePhone" className="block text-xs font-medium text-[#2C241E]">
              WhatsApp (com DDD)
            </label>
            <input
              id="intakePhone"
              type="tel"
              required
              maxLength={40}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(88) 99999-9999"
              className="mt-1 min-h-[42px] w-full rounded-lg border border-[#D4C8B6] bg-[#FFFDF9] px-3 text-sm text-[#2C241E] focus:border-[#2F5243] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="intakeBirthDate" className="block text-xs font-medium text-[#2C241E]">
              Data de nascimento
            </label>
            <input
              id="intakeBirthDate"
              type="date"
              required
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="mt-1 min-h-[42px] w-full rounded-lg border border-[#D4C8B6] bg-[#FFFDF9] px-3 font-mono-tabular text-sm text-[#2C241E] focus:border-[#2F5243] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="intakeCity" className="block text-xs font-medium text-[#2C241E]">
              Cidade / Estado
            </label>
            <input
              id="intakeCity"
              type="text"
              required
              maxLength={120}
              value={cityState}
              onChange={(e) => setCityState(e.target.value)}
              placeholder="Ex.: São Paulo — SP"
              className="mt-1 min-h-[42px] w-full rounded-lg border border-[#D4C8B6] bg-[#FFFDF9] px-3 text-sm text-[#2C241E] focus:border-[#2F5243] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="intakeOccupation" className="block text-xs font-medium text-[#2C241E]">
              Ocupação / Estudo
            </label>
            <input
              id="intakeOccupation"
              type="text"
              required
              maxLength={120}
              value={occupation}
              onChange={(e) => setOccupation(e.target.value)}
              placeholder="Ex.: Designer, Estudante..."
              className="mt-1 min-h-[42px] w-full rounded-lg border border-[#D4C8B6] bg-[#FFFDF9] px-3 text-sm text-[#2C241E] focus:border-[#2F5243] focus:outline-none"
            />
          </div>
        </div>

        <label className="flex items-center gap-2.5 pt-1 text-sm text-[#2C241E] cursor-pointer">
          <input
            type="checkbox"
            checked={isMinor}
            onChange={(e) => setIsMinor(e.target.checked)}
            className="h-4 w-4 accent-[#2F5243]"
          />
          <span>O atendimento é para adolescente / menor de 18 anos</span>
        </label>

        {isMinor && (
          <div className="grid grid-cols-1 gap-3 rounded-xl border border-[#E2D9CB] bg-[#F6F2EA]/70 p-4 sm:grid-cols-2">
            <div>
              <label htmlFor="guardianName" className="block text-xs font-medium text-[#2C241E]">
                Nome do responsável legal
              </label>
              <input
                id="guardianName"
                type="text"
                required={isMinor}
                maxLength={120}
                value={guardianName}
                onChange={(e) => setGuardianName(e.target.value)}
                className="mt-1 min-h-[40px] w-full rounded-lg border border-[#D4C8B6] bg-[#FFFDF9] px-3 text-sm"
              />
            </div>
            <div>
              <label htmlFor="guardianPhone" className="block text-xs font-medium text-[#2C241E]">
                WhatsApp do responsável
              </label>
              <input
                id="guardianPhone"
                type="tel"
                required={isMinor}
                maxLength={40}
                value={guardianPhone}
                onChange={(e) => setGuardianPhone(e.target.value)}
                className="mt-1 min-h-[40px] w-full rounded-lg border border-[#D4C8B6] bg-[#FFFDF9] px-3 text-sm"
              />
            </div>
          </div>
        )}
      </div>

      {/* Section 2: Emergency Contact */}
      <div className="space-y-3.5">
        <div className="border-b border-[#E2D9CB] pb-2">
          <p className="font-mono-tabular text-xs text-[#B8732A]">02. Contato de emergência</p>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
          <div>
            <label htmlFor="emergencyName" className="block text-xs font-medium text-[#2C241E]">
              Nome
            </label>
            <input
              id="emergencyName"
              type="text"
              required
              maxLength={120}
              value={emergencyContactName}
              onChange={(e) => setEmergencyContactName(e.target.value)}
              className="mt-1 min-h-[42px] w-full rounded-lg border border-[#D4C8B6] bg-[#FFFDF9] px-3 text-sm"
            />
          </div>
          <div>
            <label htmlFor="emergencyRelation" className="block text-xs font-medium text-[#2C241E]">
              Vínculo / Parentesco
            </label>
            <input
              id="emergencyRelation"
              type="text"
              required
              maxLength={80}
              value={emergencyContactRelation}
              onChange={(e) => setEmergencyContactRelation(e.target.value)}
              placeholder="Mãe, Cônjuge, Amigo(a)"
              className="mt-1 min-h-[42px] w-full rounded-lg border border-[#D4C8B6] bg-[#FFFDF9] px-3 text-sm"
            />
          </div>
          <div>
            <label htmlFor="emergencyPhone" className="block text-xs font-medium text-[#2C241E]">
              Telefone
            </label>
            <input
              id="emergencyPhone"
              type="tel"
              required
              maxLength={40}
              value={emergencyContactPhone}
              onChange={(e) => setEmergencyContactPhone(e.target.value)}
              className="mt-1 min-h-[42px] w-full rounded-lg border border-[#D4C8B6] bg-[#FFFDF9] px-3 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Section 3: Clinical Context */}
      <div className="space-y-3.5">
        <div className="border-b border-[#E2D9CB] pb-2">
          <p className="font-mono-tabular text-xs text-[#B8732A]">03. Contexto clínico inicial</p>
        </div>

        <div>
          <label htmlFor="reasonForTherapy" className="block text-xs font-medium text-[#2C241E]">
            O que motivou sua busca pela psicoterapia neste momento?
          </label>
          <textarea
            id="reasonForTherapy"
            required
            rows={3}
            maxLength={1500}
            value={reasonForTherapy}
            onChange={(e) => setReasonForTherapy(e.target.value)}
            placeholder="Compartilhe com suas palavras o que está vivendo hoje."
            className="mt-1 w-full rounded-lg border border-[#D4C8B6] bg-[#FFFDF9] p-3 text-sm text-[#2C241E] focus:border-[#2F5243] focus:outline-none"
          />
        </div>

        <div className="space-y-2.5">
          <label className="flex items-center gap-2.5 text-sm text-[#2C241E] cursor-pointer">
            <input
              type="checkbox"
              checked={hadPreviousTherapy}
              onChange={(e) => setHadPreviousTherapy(e.target.checked)}
              className="h-4 w-4 accent-[#2F5243]"
            />
            <span>Já fiz acompanhamento psicológico anteriormente</span>
          </label>

          {hadPreviousTherapy && (
            <input
              type="text"
              maxLength={1000}
              value={previousTherapyDetails}
              onChange={(e) => setPreviousTherapyDetails(e.target.value)}
              placeholder="Se desejar, informe há quanto tempo ou como foi a experiência"
              className="min-h-[40px] w-full rounded-lg border border-[#D4C8B6] bg-[#FFFDF9] px-3 text-sm"
            />
          )}
        </div>

        <div className="space-y-2.5">
          <label className="flex items-center gap-2.5 text-sm text-[#2C241E] cursor-pointer">
            <input
              type="checkbox"
              checked={usesMedication}
              onChange={(e) => setUsesMedication(e.target.checked)}
              className="h-4 w-4 accent-[#2F5243]"
            />
            <span>Faço uso atual de medicação psiquiátrica ou acompanhamento médico</span>
          </label>

          {usesMedication && (
            <input
              type="text"
              maxLength={1000}
              value={medicationDetails}
              onChange={(e) => setMedicationDetails(e.target.value)}
              placeholder="Informe qual(is) medicação(ões) ou especialidade médica"
              className="min-h-[40px] w-full rounded-lg border border-[#D4C8B6] bg-[#FFFDF9] px-3 text-sm"
            />
          )}
        </div>
      </div>

      <label className="flex items-start gap-2.5 rounded-xl border border-[#E2D9CB] bg-[#F6F2EA]/70 p-3.5 text-xs leading-relaxed text-[#52473D] cursor-pointer">
        <input
          type="checkbox"
          required
          checked={acceptedTerms}
          onChange={(e) => setAcceptedTerms(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[#2F5243]"
        />
        <span>
          Estou ciente de que os atendimentos individuais ocorrem exclusivamente online e que todas as informações acima são protegidas pelo sigilo profissional do psicólogo Vitor Gomes (CRP 11/20859).
        </span>
      </label>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-[#D99B9B] bg-[#FDF2F2] px-4 py-3 text-xs sm:text-sm text-[#7A2727]"
        >
          {error}
        </div>
      )}

      {savedNotice && (
        <div className="rounded-lg border border-[#C1D5C7] bg-[#E9EFEA] px-4 py-3 text-xs sm:text-sm text-[#264738]">
          {savedNotice}
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="flex min-h-[46px] w-full items-center justify-center rounded-lg bg-[#2F5243] px-5 py-2.5 text-sm font-medium text-[#FFFDF9] hover:bg-[#244034] disabled:opacity-60 transition-colors cursor-pointer"
      >
        {saving ? 'Salvando dados clínicos...' : submitLabel}
      </button>

      <p className="flex items-center gap-2 text-xs text-[#665B50]">
        <Lock className="h-3.5 w-3.5 shrink-0 text-[#2F5243]" aria-hidden="true" />
        <span>Visível apenas para você e para o psicólogo Vitor Gomes.</span>
      </p>
    </form>
  );
}
