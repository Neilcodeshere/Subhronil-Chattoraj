import { site } from "@/content/site";

export const reasons = ["Project", "Collaboration", "Opportunity", "Just saying hello"] as const;

export function createMailto(data: { name: string; email: string; reason: string; message: string }) {
  const subject = `Portfolio enquiry — ${data.reason}`;
  const body = `Hi Subhronil,\n\n${data.message.trim()}\n\n—\nName: ${data.name.trim()}\nEmail: ${data.email.trim()}\nReason: ${data.reason}`;
  return `mailto:${site.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
