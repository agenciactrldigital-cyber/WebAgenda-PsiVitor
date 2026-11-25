import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { auth, googleProvider } from '../firebase/config';

const DEFAULT_ALLOWED_EMAILS = [
  'agenciactrldigital@gmail.com',
  'psi.josevitorgf@gmail.com',
  'psi.vitorgomes@gmail.com',
];

export function getAuthorizedEmails() {
  const raw = import.meta.env.VITE_PSYCHOLOGIST_EMAILS;
  if (typeof raw === 'string' && raw.trim().length > 0) {
    return raw
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
  }
  return DEFAULT_ALLOWED_EMAILS;
}

export function isAuthorizedPsychologist(user) {
  if (!user || !user.email) return false;
  const email = user.email.trim().toLowerCase();
  const allowed = getAuthorizedEmails();
  return allowed.includes(email);
}

export function formatAuthError(error) {
  const code = error?.code || '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'E-mail ou senha incorretos. Verifique os dados e tente novamente.';
    case 'auth/invalid-email':
      return 'Informe um endereço de e-mail válido.';
    case 'auth/popup-closed-by-user':
      return 'A janela de login com Google foi fechada antes da conclusão.';
    case 'auth/popup-blocked':
      return 'O navegador bloqueou a janela do Google. Permita pop-ups para este site e tente novamente.';
    case 'auth/unauthorized-domain':
      return 'Este domínio ainda não foi autorizado no Firebase Authentication (Authentication → Settings → Authorized domains).';
    case 'auth/operation-not-allowed':
      return 'Este método de login ainda não foi ativado no console do Firebase Authentication.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas seguidas. Aguarde alguns instantes antes de tentar novamente.';
    default:
      return error?.message || 'Não foi possível concluir o acesso. Tente novamente.';
  }
}

export async function loginWithEmail(email, password) {
  const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
  if (!isAuthorizedPsychologist(credential.user)) {
    await signOut(auth);
    throw new Error('Este e-mail não possui permissão para acessar a área do psicólogo.');
  }
  return credential.user;
}

export async function loginWithGoogle() {
  const credential = await signInWithPopup(auth, googleProvider);
  if (!isAuthorizedPsychologist(credential.user)) {
    await signOut(auth);
    throw new Error('Esta conta Google não está na lista de e-mails autorizados do psicólogo.');
  }
  return credential.user;
}

export async function logoutPsychologist() {
  await signOut(auth);
}

export function subscribeToAuthChanges(callback) {
  return onAuthStateChanged(auth, callback);
}
