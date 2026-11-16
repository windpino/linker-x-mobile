import { createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, sendEmailVerification, sendPasswordResetEmail, signOut, setPersistence, browserSessionPersistence } from 'firebase/auth';
import { getFunctions, connectFunctionsEmulator, httpsCallable } from 'firebase/functions';
import app, { auth } from '../firebase';
const functions = getFunctions(app, 'asia-northeast3');
if (import.meta.env.VITE_AUTH_PRODUCTION_APPROVED !== 'true') connectFunctionsEmulator(functions, '127.0.0.1', 5001);
auth.languageCode = 'ko';
const ready = () => setPersistence(auth, browserSessionPersistence);
export async function register(email,password) {
  await ready();
  const result = await createUserWithEmailAndPassword(auth,email.trim(),password);
  // Name stays in the membership request; Auth never confers company permissions.
  await sendEmailVerification(result.user);
  return result.user;
}
export async function login(email,password) { await ready(); return signInWithEmailAndPassword(auth,email.trim(),password); }
export async function googleLogin() { await ready(); return signInWithPopup(auth,new GoogleAuthProvider()); }
export const verifyEmail = () => sendEmailVerification(auth.currentUser);
export const resetPassword = email => sendPasswordResetEmail(auth,email.trim());
export async function refreshIdentity() { await auth.currentUser.reload(); await auth.currentUser.getIdToken(true); }
export const logout = () => signOut(auth);
export async function callAuth(name,data) { return (await httpsCallable(functions,name)(data)).data; }
export async function reauthenticate(password) {
  const { reauthenticateWithCredential, reauthenticateWithPopup, EmailAuthProvider } = await import('firebase/auth');
  const user = auth.currentUser;
  if (!user) throw new Error('로그인이 필요합니다.');
  if (user.providerData.some(p=>p.providerId==='password')) return reauthenticateWithCredential(user,EmailAuthProvider.credential(user.email,password));
  return reauthenticateWithPopup(user,new GoogleAuthProvider());
}
