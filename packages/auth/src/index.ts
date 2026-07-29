/**
 * @anesis/auth — connexion des opérateurs par lien magique (founder et operator).
 * Logique de jeton pure (`token`), envoi derrière Resend/env (`mailer`), service DB (`service`).
 */
export {
  MAGIC_LINK_TTL_MS,
  SESSION_TTL_MS,
  hashToken,
  issueToken,
  verifyToken,
  type MagicLinkPurpose,
  type IssuedToken,
  type StoredToken,
  type VerifyOutcome,
} from "./token.js";
export { makeMailer, type Mailer, type MailerMode, type MailerConfig } from "./mailer.js";
export {
  requestMagicLink,
  consumeMagicLink,
  resolveSession,
  type AuthDeps,
  type RequestMagicLinkInput,
  type RequestMagicLinkResult,
  type ConsumeMagicLinkResult,
} from "./service.js";
