"use client";

import { useState, type FormEvent } from "react";
import { ArrowUpRight, Check, Copy } from "lucide-react";
import { site } from "@/content/site";
import { createMailto, reasons } from "@/lib/contact";
import { Reveal } from "./reveal";

export function Contact() {
  const [reason, setReason] = useState<string>("Project");
  const [status, setStatus] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [copied, setCopied] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "");
    const email = String(data.get("email") ?? "");
    const message = String(data.get("message") ?? "");
    if (!name.trim() || !message.trim()) { setStatus("Please add your name and a message before opening your email app."); return; }
    window.location.href = createMailto({ name, email, reason, message });
    setStatus("Your email draft is ready to open. Send it from your email app to complete your message. If nothing opens, email me directly using the address on this page.");
  }

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(site.email);
      setCopied(true); setCopyStatus("Email address copied.");
    } catch { setCopyStatus(`You can select and copy this address: ${site.email}`); }
  }

  return <section id="contact" className="contact-section section-shell section-spacing" aria-labelledby="contact-heading" tabIndex={-1}>
    <div className="contact-grid"><Reveal className="contact-intro"><h2 id="contact-heading">Contact.</h2><p>For projects or collaborations, email me or use the form.</p><div className="contact-email"><span className="eyebrow">Email</span><div><a href={`mailto:${site.email}`}>{site.email}</a><button className="icon-button" aria-label="Copy email address" onClick={copyEmail}>{copied ? <Check size={16} /> : <Copy size={16} />}</button></div><span className="copy-status" role="status">{copyStatus}</span></div><div className="social-links">{site.socials.map((social) => <a key={social.name} href={social.href} target="_blank" rel="noopener noreferrer">{social.name}<ArrowUpRight size={15} /></a>)}</div></Reveal>
      <Reveal className="contact-form-wrap" delay={0.1}><form onSubmit={submit} className="contact-form"><div className="form-row"><label htmlFor="contact-name">Your name<input id="contact-name" name="name" autoComplete="name" placeholder="Your name" required maxLength={80} /></label><label htmlFor="contact-email">Email address<input id="contact-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required maxLength={150} /></label></div><fieldset><legend>Reason for contacting me</legend><div className="reason-options">{reasons.map((item) => <label key={item}><input type="radio" name="reason" value={item} checked={reason === item} onChange={() => setReason(item)} /><span>{item}</span></label>)}</div></fieldset><label htmlFor="contact-message">Message<textarea id="contact-message" name="message" rows={5} placeholder="Your message" required maxLength={1200} /></label><button type="submit" className="button button-purple">Open email draft <ArrowUpRight size={19} /></button><p className="form-note">Opens a draft in your email app. You choose when to send it.</p><p className="form-status" role="status">{status}</p></form></Reveal></div>
  </section>;
}
