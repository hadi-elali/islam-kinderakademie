import {
  LegalPlaceholder,
  LegalPlaceholderField,
} from "@/components/legal-placeholder";

const fields: LegalPlaceholderField[] = [
  {
    label: "Angaben gemäß § 5 TMG",
    placeholder:
      "Bund für islamische Bildung e. V.\n\nFüssener Str. 15\n12309 Berlin",
  },
  {
    label: "Vertreten durch",
    placeholder:
      "Samer Khalil (1. Vorsitzender)\nAnne-Maria Nowak (2. Vorsitzende)\nMohammad Klait (Schriftführer)",
  },
  {
    label: "Kontakt",
    placeholder: "E-Mail: info@bufib.de \n Telefonnummer: 0174 5971114",
    
    href: "mailto:info@bufib.de",
  },
  {
    label: "Registereintrag",
    placeholder:
      "Eintragung im Vereinsregister.\nRegistergericht: Amtsgericht Berlin-Charlottenburg\nRegisternummer: VR 32921",
  },
  {
    label: "Steuernummer",
    placeholder: "27/657/53847",
  },
  {
    label: "Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV",
    placeholder: "Bund für islamische Bildung e.V.",
  },

  {
    label: "Quelle",
    placeholder: "http://www.e-recht24.de",
    href: "http://www.e-recht24.de",
  },
];

export default function ImpressumScreen() {
  return (
    <LegalPlaceholder
      title="Impressum"
      description="Anbieterkennzeichnung des Bund für islamische Bildung e. V."
      fields={fields}
      isPlaceholder={false}
    />
  );
}
