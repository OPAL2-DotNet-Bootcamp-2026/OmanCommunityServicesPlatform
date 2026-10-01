/**
 * What a route may declare in its `data`. The app shell reads it to set the
 * page's body class and help strip; the guard reads `roles`.
 */
import { type SessionRole } from "../models/enums";

export interface HelpStripContent {
  title: string;
  text: string;
  /** Shows the 8000 0000 phone link before the email link. */
  showPhone: boolean;
  email: string;
  emailLabel: string;
}

export interface PageRouteData {
  /** Roles allowed on the page, checked by signedInGuard. Omit for any signed-in user. */
  roles?: SessionRole[];
  /** Extra classes for <body>, e.g. "ocsp-portal ocsp-portal--citizen" for the portal styles. */
  bodyClass?: string;
  /** The "need help?" strip above the footer; omit for none. */
  helpStrip?: HelpStripContent;
}
