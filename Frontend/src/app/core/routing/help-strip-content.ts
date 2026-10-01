/** The "need help?" wording for each page that shows the help strip. Used in app.routes.ts. */
import { type HelpStripContent } from "./page-route-data";

export const HELP_STRIPS = {
  home: {
    title: "Need help using the platform?",
    text: "Our support team can help you submit or track a community report.",
    showPhone: true,
    email: "support@ocsp.om",
    emailLabel: "Email support"
  },
  citizenIssues: {
    title: "Need help with one of your reports?",
    text: "Citizen Support is available Sunday–Thursday, 8:00 AM–4:00 PM.",
    showPhone: true,
    email: "support@ocsp.om",
    emailLabel: "Email support"
  },
  staffDashboard: {
    title: "Need support with an admin task?",
    text: "Contact the OCSP service desk for access, setup, routing or escalation assistance.",
    showPhone: true,
    email: "servicedesk@ocsp.om",
    emailLabel: "Service desk"
  },
  notifications: {
    title: "Have a question about an update?",
    text: "Our support team can help you understand the progress of your report.",
    showPhone: false,
    email: "support@ocsp.om",
    emailLabel: "Email support"
  }
} satisfies Record<string, HelpStripContent>;
