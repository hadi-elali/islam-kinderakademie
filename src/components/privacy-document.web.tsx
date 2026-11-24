import { useEffect, type ReactNode } from 'react';
import Head from 'expo-router/head';

import { CaptchaWithdrawal } from '@/components/auth/captcha-privacy';
import { Card } from '@/components/ui/primitives';
import { Palette } from '@/constants/design';
import { PRIVACY_VERSION } from '@/constants/privacy';
import policy from '@/constants/privacy-policy.json';
import type { PrivacyDocumentProps } from './privacy-document';

function inline(text: string): ReactNode[] {
  return text.split(/(\[[^\]]+\]\((?:https:\/\/|mailto:)[^\s)]+\)|\*\*[^*]+\*\*)/g).map((part, index) => {
    const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(part);
    if (link) return <a key={index} href={link[2]} rel="noreferrer">{link[1]}</a>;
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>;
    return part;
  });
}

function Paragraphs({ paragraphs }: { paragraphs: string[] }) {
  const elements: ReactNode[] = [];
  for (let index = 0; index < paragraphs.length; index++) {
    const text = paragraphs[index];
    if (text.startsWith('• ')) {
      const items = [text.slice(2)];
      while (paragraphs[index + 1]?.startsWith('• ')) items.push(paragraphs[++index].slice(2));
      elements.push(<ul key={index}>{items.map((item, n) => <li key={n}>{inline(item)}</li>)}</ul>);
    } else {
      elements.push(<p key={index}>{inline(text)}</p>);
    }
  }
  return elements;
}

function focusTarget(id: string) {
  // Native fragment scrolling remains available without this focus enhancement.
  requestAnimationFrame(() => document.getElementById(id)?.focus({ preventScroll: true }));
}

export function PrivacyTitle() {
  return <>
    <Head>
      <html lang="de" />
      <title>Datenschutzerklärung | Islam-Kinderakademie</title>
      <meta name="description" content="Datenschutzhinweise der Islam-Kinderakademie: Verantwortlicher, Datenverarbeitung, Einwilligungen, Speicherdauer und Ihre Rechte." />
    </Head>
    <h1 lang="de" style={{ fontFamily: 'system-ui, sans-serif', fontSize: 'clamp(1.6rem, 5vw, 2.15rem)', lineHeight: 1.25, color: Palette.ink, margin: 0, overflowWrap: 'anywhere' }}>Datenschutzerklärung</h1>
  </>;
}

export function PrivacyDocument(_props: PrivacyDocumentProps) {
  useEffect(() => {
    const target = document.getElementById(window.location.hash.slice(1));
    if (target) {
      target.scrollIntoView();
      target.focus({ preventScroll: true });
    }
  }, []);

  return <main lang="de" className="privacy-document" aria-label="Datenschutzinformationen">
    <style>{`
      .privacy-document { font: 1rem/1.65 system-ui, sans-serif; color: ${Palette.inkSoft}; overflow-wrap: anywhere; min-width: 0; }
      .privacy-document a { color: ${Palette.forest}; text-decoration: underline; text-underline-offset: .15em; }
      .privacy-document a:focus-visible, .privacy-document [role=button]:focus-visible { outline: 3px solid ${Palette.forest}; outline-offset: 3px; border-radius: 3px; }
      .privacy-document h2 { font-size: 1.35rem; line-height: 1.4; color: ${Palette.ink}; margin: 0 0 1.2rem; text-transform: none; }
      .privacy-document h3 { font-size: 1.1rem; color: ${Palette.ink}; margin: 0 0 1rem; }
      .privacy-document p { margin: 0 0 1rem; white-space: pre-line; }
      .privacy-document li { margin: .4rem 0; }
      .privacy-document ul { padding-inline-start: 1.4rem; }
      .privacy-document [id] { scroll-margin-top: 1.5rem; }
      .privacy-document .privacy-tools { display: flex; flex-wrap: wrap; gap: .5rem 1.5rem; margin-bottom: 1.5rem; }
      .privacy-document .privacy-tools a { min-height: 44px; display: inline-flex; align-items: center; }
      .privacy-document .privacy-toc { margin-bottom: 1.5rem; }
      .privacy-document .privacy-toc ul { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 17rem), 1fr)); gap: .25rem 1.5rem; }
      .privacy-document .privacy-toc li { margin: 0; }
      .privacy-document .privacy-toc a { display: block; padding: .35rem 0; }
      .privacy-document section { padding: 1.5rem 0; }
      .privacy-document section + section { border-top: 1px solid ${Palette.line}; }
      .privacy-document .privacy-settings { padding: 1rem; margin: 1.5rem 0; border: 1px solid ${Palette.forest}; border-radius: 12px; }
      .privacy-document .privacy-back { display: inline-block; padding: .5rem 0; }
      @media print { .privacy-document .privacy-tools, .privacy-document .privacy-toc, .privacy-document .privacy-settings, .privacy-document .privacy-back { display: none; } .privacy-document h2 { break-after: avoid; } }
    `}</style>
    <nav className="privacy-tools" aria-label="Direktzugriffe zum Datenschutz">
      <a href="#hcaptcha-einstellungen" onClick={() => focusTarget('hcaptcha-einstellungen')}>hCaptcha-Einstellungen und Widerruf</a>
      <a href={`/legal/privacy-${PRIVACY_VERSION}.html`} target="_blank" rel="noopener noreferrer" aria-label="Druckansicht öffnen (neuer Tab)">Druckansicht öffnen</a>
    </nav>
    <nav className="privacy-toc" aria-labelledby="inhaltsverzeichnis">
      <Card>
        <h2 id="inhaltsverzeichnis" tabIndex={-1}>Inhaltsverzeichnis</h2>
        <ul>{policy.sections.map((section, index) => <li key={section.title}>
          <a href={`#abschnitt-${index + 1}`} onClick={() => focusTarget(`abschnitt-${index + 1}`)}>{section.title}</a>
        </li>)}</ul>
      </Card>
    </nav>
    <article aria-label="Datenschutzerklärung der Islam-Kinderakademie">
      <Card>
        {policy.sections.map((section, index) => <section key={section.title} aria-labelledby={`abschnitt-${index + 1}`}>
          <h2 id={`abschnitt-${index + 1}`} tabIndex={-1}>{section.title}</h2>
          <Paragraphs paragraphs={section.paragraphs} />
          {index === 10 && <aside className="privacy-settings" aria-labelledby="hcaptcha-einstellungen">
            <h3 id="hcaptcha-einstellungen" tabIndex={-1}>Einstellungen zu hCaptcha</h3>
            <CaptchaWithdrawal />
          </aside>}
          <a className="privacy-back" href="#inhaltsverzeichnis" onClick={() => focusTarget('inhaltsverzeichnis')}>Zum Inhaltsverzeichnis</a>
        </section>)}
      </Card>
    </article>
  </main>;
}
