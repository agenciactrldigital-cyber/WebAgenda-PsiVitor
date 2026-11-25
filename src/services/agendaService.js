import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errors';

/** @type {import('../types/agenda').AvailabilityConfig} */
export const DEFAULT_AVAILABILITY = {
  weeklyDays: [1, 2, 3, 4, 5],
  timeSlots: ['08:00', '09:00', '10:00', '14:00', '15:00', '16:00', '17:00'],
  dateOverrides: {},
  sessionDuration: 50,
  blockedDates: [],
  modalities: ['online'],
};

/** @type {import('../types/agenda').GroupItem[]} */
export const DEFAULT_GROUPS = [
  {
    id: 'mito-masculinidade-default',
    title: 'O Mito da Masculinidade',
    scheduleText: 'Encontros semanais · Vagas limitadas',
    platformLabel: 'Exclusivamente Online (Sala Virtual)',
    description:
      'Grupo terapêutico e vivencial no aqui e agora para homens explorarem emoções, relações, paternidade, trabalho e pressões contemporâneas — em diálogo com reflexões como Seja Homem, de JJ Bola.',
    guidelines: [
      'Intervenção psicossocial e vivencial em grupo; não substitui a psicoterapia individual.',
      'Participação com câmera aberta durante os encontros para sustentar presença e vínculo.',
      'Proibida qualquer gravação, captura de tela (print) ou registro dos encontros.',
      'Sigilo absoluto sobre tudo o que for compartilhado pelos participantes.',
      'Vedado o relato de casos clínicos de pacientes, mesmo de forma anonimizada.',
    ],
    active: true,
    isFallback: true,
  },
];

export function getWhatsAppNumber() {
  const raw = import.meta.env.VITE_WHATSAPP_NUMBER || '5588999999999';
  return String(raw).replace(/\D/g, '');
}

export function formatFirestoreError(error) {
  const rawMessage = error?.message || '';
  if (rawMessage.startsWith('{') && rawMessage.includes('"operationType"')) {
    try {
      const parsed = JSON.parse(rawMessage);
      if (String(parsed.error || '').toLowerCase().includes('permission')) {
        return 'Permissão negada no Firestore. Verifique as regras de segurança (firestore.rules) e o login autorizado.';
      }
      return parsed.error || 'Erro ao acessar o Firestore.';
    } catch {
      // fall through
    }
  }
  const code = error?.code || '';
  if (code === 'permission-denied' || rawMessage.toLowerCase().includes('permission')) {
    return 'Permissão negada no Firestore. Verifique as regras de segurança (firestore.rules) e o login autorizado.';
  }
  if (code === 'unavailable') {
    return 'Sem conexão com o banco de dados no momento. Verifique sua internet e tente novamente.';
  }
  return rawMessage || 'Não foi possível concluir a operação no Firestore.';
}

function toOccupiedSlotDocId(date, timeSlot) {
  return `${date}_${String(timeSlot).replace(':', '-')}`;
}

export function getTodayIsoLocal() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDatePtBr(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  const dateObj = new Date(y, m - 1, d, 12, 0, 0);
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(dateObj);
}

export function formatShortDatePtBr(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}

/**
 * @param {import('../types/agenda').AvailabilityConfig} availability
 * @param {string} dateStr
 * @returns {string[]}
 */
export function getSlotsForDate(availability, dateStr) {
  if (!availability || !dateStr) return [];
  const blocked = Array.isArray(availability.blockedDates) ? availability.blockedDates : [];
  if (blocked.includes(dateStr)) return [];

  const overrides = availability.dateOverrides || {};
  if (Array.isArray(overrides[dateStr])) {
    return [...overrides[dateStr]].sort();
  }

  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return [];
  const weekday = new Date(y, m - 1, d, 12, 0, 0).getDay();
  const weeklyDays = Array.isArray(availability.weeklyDays) ? availability.weeklyDays : [];
  if (!weeklyDays.includes(weekday)) return [];

  const slots = Array.isArray(availability.timeSlots) ? availability.timeSlots : [];
  return [...slots].sort();
}

/**
 * @param {import('../types/agenda').AvailabilityConfig} availability
 * @param {string} dateStr
 * @returns {boolean}
 */
export function isDateSelectable(availability, dateStr) {
  const todayIso = getTodayIsoLocal();
  if (dateStr < todayIso) return false;
  return getSlotsForDate(availability, dateStr).length > 0;
}

/**
 * @param {string[]} slots
 * @param {string} dateStr
 * @returns {string[]}
 */
export function filterPastSlotsForToday(slots, dateStr) {
  const todayIso = getTodayIsoLocal();
  if (dateStr !== todayIso) return slots;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes() + 30;
  return slots.filter((slot) => {
    const [hh, mm] = slot.split(':').map(Number);
    if (Number.isNaN(hh) || Number.isNaN(mm)) return false;
    return hh * 60 + mm > currentMinutes;
  });
}

export function subscribeAvailability(onData, onError) {
  const ref = doc(db, 'availability', 'default');
  return onSnapshot(
    ref,
    (snapshot) => {
      if (!snapshot.exists()) {
        onData({ ...DEFAULT_AVAILABILITY, existsInDb: false });
        return;
      }
      const data = snapshot.data();
      onData({
        weeklyDays: Array.isArray(data.weeklyDays) ? data.weeklyDays : DEFAULT_AVAILABILITY.weeklyDays,
        timeSlots: Array.isArray(data.timeSlots) ? data.timeSlots : DEFAULT_AVAILABILITY.timeSlots,
        dateOverrides:
          data.dateOverrides && typeof data.dateOverrides === 'object' ? data.dateOverrides : {},
        sessionDuration:
          typeof data.sessionDuration === 'number'
            ? data.sessionDuration
            : DEFAULT_AVAILABILITY.sessionDuration,
        blockedDates: Array.isArray(data.blockedDates) ? data.blockedDates : [],
        modalities: ['online'],
        existsInDb: true,
      });
    },
    (error) => {
      if (onError) onError(formatFirestoreError(error));
    }
  );
}

export async function saveAvailability(availabilityData) {
  const ref = doc(db, 'availability', 'default');
  const payload = {
    weeklyDays: [...new Set(availabilityData.weeklyDays)].sort((a, b) => a - b),
    timeSlots: [...new Set(availabilityData.timeSlots)].sort(),
    dateOverrides: availabilityData.dateOverrides || {},
    sessionDuration: Number(availabilityData.sessionDuration) || 50,
    blockedDates: [...new Set(availabilityData.blockedDates)].sort(),
    modalities: ['online'],
    updatedAt: serverTimestamp(),
  };
  try {
    await setDoc(ref, payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'availability/default');
  }
}

export function subscribeOccupiedSlots(onData, onError) {
  const ref = collection(db, 'occupiedSlots');
  return onSnapshot(
    ref,
    (snapshot) => {
      const set = new Set();
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        if (d?.date && d?.timeSlot) {
          set.add(`${d.date}_${d.timeSlot}`);
        } else {
          set.add(docSnap.id.replace('-', ':'));
        }
      });
      onData(set);
    },
    (error) => {
      if (onError) onError(formatFirestoreError(error));
    }
  );
}

export async function createAppointmentRequest({ date, timeSlot, patientName, patientContact, notes }) {
  const cleanName = String(patientName || '').trim();
  const cleanContact = String(patientContact || '').trim();
  const cleanNotes = String(notes || '').trim();

  if (!date || !timeSlot) {
    throw new Error('Selecione uma data e um horário livre antes de continuar.');
  }
  if (cleanName.length < 2) {
    throw new Error('Informe seu nome para podermos registrar a solicitação.');
  }
  if (cleanContact.length < 6) {
    throw new Error('Informe um WhatsApp ou e-mail válido para contato.');
  }

  const batch = writeBatch(db);
  const appointmentRef = doc(collection(db, 'appointments'));
  const slotId = toOccupiedSlotDocId(date, timeSlot);
  const slotRef = doc(db, 'occupiedSlots', slotId);

  batch.set(appointmentRef, {
    date,
    timeSlot,
    modality: 'online',
    patientName: cleanName,
    patientContact: cleanContact,
    notes: cleanNotes,
    status: 'pending',
    createdAt: serverTimestamp(),
  });

  batch.set(slotRef, {
    date,
    timeSlot,
    createdAt: serverTimestamp(),
  });

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'appointments');
  }

  return {
    id: appointmentRef.id,
    date,
    timeSlot,
    modality: 'online',
    patientName: cleanName,
    patientContact: cleanContact,
    notes: cleanNotes,
    status: 'pending',
  };
}

export function subscribeAppointments(onData, onError) {
  const q = query(collection(db, 'appointments'), orderBy('date', 'asc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({
          id: docSnap.id,
          date: d.date || '',
          timeSlot: d.timeSlot || '',
          modality: d.modality || 'online',
          patientName: d.patientName || '',
          patientContact: d.patientContact || '',
          notes: d.notes || '',
          status: d.status || 'pending',
          createdAt: d.createdAt || null,
        });
      });
      list.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.timeSlot.localeCompare(b.timeSlot);
      });
      onData(list);
    },
    (error) => {
      if (onError) onError(formatFirestoreError(error));
    }
  );
}

export async function updateAppointmentStatus(appointment, nextStatus) {
  const batch = writeBatch(db);
  const appointmentRef = doc(db, 'appointments', appointment.id);
  const slotRef = doc(db, 'occupiedSlots', toOccupiedSlotDocId(appointment.date, appointment.timeSlot));

  batch.update(appointmentRef, { status: nextStatus });

  if (nextStatus === 'cancelled') {
    batch.delete(slotRef);
  } else {
    batch.set(slotRef, {
      date: appointment.date,
      timeSlot: appointment.timeSlot,
      createdAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `appointments/${appointment.id}`);
  }
}

export async function deleteAppointment(appointment) {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'appointments', appointment.id));
  batch.delete(doc(db, 'occupiedSlots', toOccupiedSlotDocId(appointment.date, appointment.timeSlot)));
  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `appointments/${appointment.id}`);
  }
}

export function subscribeGroups(onData, onError) {
  const ref = collection(db, 'groups');
  return onSnapshot(
    ref,
    (snapshot) => {
      const list = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({
          id: docSnap.id,
          title: d.title || '',
          scheduleText: d.scheduleText || '',
          platformLabel: d.platformLabel || 'Exclusivamente Online (Sala Virtual)',
          description: d.description || '',
          guidelines: Array.isArray(d.guidelines) ? d.guidelines : [],
          active: Boolean(d.active),
        });
      });
      onData(list);
    },
    (error) => {
      if (onError) onError(formatFirestoreError(error));
    }
  );
}

export async function saveGroup(group) {
  const payload = {
    title: String(group.title || '').trim(),
    scheduleText: String(group.scheduleText || '').trim(),
    platformLabel: String(group.platformLabel || 'Exclusivamente Online (Sala Virtual)').trim(),
    description: String(group.description || '').trim(),
    guidelines: Array.isArray(group.guidelines)
      ? group.guidelines.map((g) => String(g).trim()).filter(Boolean)
      : [],
    active: Boolean(group.active),
  };

  if (!payload.title) {
    throw new Error('Informe o nome do grupo ou encontro.');
  }

  try {
    if (group.id && !group.isFallback) {
      await setDoc(doc(db, 'groups', group.id), payload, { merge: true });
      return group.id;
    }

    const created = await addDoc(collection(db, 'groups'), payload);
    return created.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'groups');
  }
}

export async function deleteGroup(groupId) {
  await deleteDoc(doc(db, 'groups', groupId));
}

export async function seedInitialFirestoreData() {
  await saveAvailability(DEFAULT_AVAILABILITY);
  const firstGroup = DEFAULT_GROUPS[0];
  await addDoc(collection(db, 'groups'), {
    title: firstGroup.title,
    scheduleText: firstGroup.scheduleText,
    platformLabel: firstGroup.platformLabel,
    description: firstGroup.description,
    guidelines: firstGroup.guidelines,
    active: true,
  });
}

export function buildPatientWhatsAppUrl(appointment, sessionDuration = 50) {
  const phone = getWhatsAppNumber();
  const formattedDate = formatShortDatePtBr(appointment.date);
  const message = `Olá, Vitor! Acabei de enviar uma solicitação de psicoterapia online pelo site.\n\nNome: ${appointment.patientName}\nData: ${formattedDate}\nHorário: ${appointment.timeSlot} (${sessionDuration} min)\nModalidade: Online\n\nFico no aguardo da confirmação.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function buildPsychologistWhatsAppConfirmUrl(appointment, sessionDuration = 50) {
  const digits = String(appointment.patientContact || '').replace(/\D/g, '');
  const normalizedPhone = digits.length >= 10 && digits.length <= 11 ? `55${digits}` : digits;
  const formattedDate = formatShortDatePtBr(appointment.date);
  const message = `Olá, ${appointment.patientName}! Aqui é o psicólogo Vitor Gomes (CRP 11/20859).\n\nSeu horário de psicoterapia online está confirmado para ${formattedDate} às ${appointment.timeSlot} (duração de ${sessionDuration} min).\n\nAntes do nosso encontro, enviarei o link da sala virtual por aqui. Até breve!`;
  if (normalizedPhone.length >= 12) {
    return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
  }
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}

export function buildGroupWhatsAppUrl(groupTitle = 'O Mito da Masculinidade') {
  const phone = getWhatsAppNumber();
  const message = `Olá, Vitor! Gostaria de saber mais e manifestar interesse no grupo terapêutico online "${groupTitle}".`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
