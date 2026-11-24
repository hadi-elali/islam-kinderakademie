# Darstellung und Zugänglichkeit der Datenschutzerklärung

Stand: 24. November 2026. Geprüft wurde der lokale Produktions-Export. Die Änderung wurde nicht durch den Agenten produktiv veröffentlicht.

## Umgesetzte Anforderungen

Die Gestaltung wurde insbesondere anhand der Verständlichkeits- und Zugänglichkeitsanforderungen aus [Art. 12 und 13 DSGVO](https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32016R0679) sowie der [Hinweise der Berliner Datenschutzaufsicht zur Einwilligungsgestaltung](https://www.datenschutz-berlin.de/themen/internet/cookies/) überarbeitet.

- Der Erklärungstext beginnt mit Verantwortlichem und Kontakt. Das Inhaltsverzeichnis verlinkt alle 21 Abschnitte.
- Größere Überschriften in normaler Schreibweise, mindestens 16 Pixel beziehungsweise relative Schriftgrößen im Fließtext, echte HTML-Absätze und Listen und unterstrichene Links verbessern die Lesbarkeit.
- Die hCaptcha-Einstellung ist als Bedienbereich innerhalb von Abschnitt 11 getrennt erkennbar. Ein Direktlink führt unmittelbar zu Status und Widerruf. Vorherige Zustimmung, Kontaktalternative und Widerruf bleiben erhalten.
- Deutsche HTML-Sprache, ein aussagekräftiger Seitentitel, semantische Überschriften und sichtbarer Tastaturfokus unterstützen assistive Technik. Interne Sprunglinks setzen auch den Tastaturfokus auf das Ziel.
- Die öffentliche Datenschutzroute wartet nicht auf den Abschluss der Anmeldung. Der vollständige Erklärungstext wird bereits in das statische HTML geschrieben. Andere Akademierouten behalten ihren Zugriffsschutz.
- Die erzeugte HTML-Druckansicht enthält den gleichen Erklärungstext ohne Skripte oder aktive Anbieter-Einbindungen und lässt sich unabhängig von der App öffnen.

## Ergebnisse

TypeScript, ESLint, Web-Export und Whitespace-Prüfung bestanden. Die Browserprüfung lief mit frischen Chrome-Profilen ohne Formularversand oder E-Mail-Auslösung. Bei 320, 390 und 1440 Pixeln wurden alle Abschnitte, Sprunglinks, Tastaturbedienung und die Position der hCaptcha-Einstellung geprüft. Es wurde kein horizontaler Überlauf festgestellt. Ein direkter Aufruf mit Fragment erreichte die Einstellung ebenfalls.

Bei Registrierung und Passwortwiederherstellung wurden vor Zustimmung keine hCaptcha-Anfragen beobachtet; nach Zustimmung wurde das Widget geladen. Der Widerruf auf der Datenschutzseite war erreichbar und beendete die Einbindung mit Neuladen. Danach wurden keine weiteren hCaptcha-Anfragen beobachtet. Mit deaktivierter JavaScript-Ausführung blieben alle 21 Abschnitte und das vollständige Inhaltsverzeichnis im Browser lesbar; dabei gab es ebenfalls keine hCaptcha-Anfragen.

Redigierter Nachweis: [Browserprüfung](evidence/datenschutz-darstellung-2026-11-24.json). Er enthält keine Cookie-Werte, Formulareingaben oder Authentifizierungstokens. Zusätzlich wurden die generierten HTML-Dateien und Hashwerte der kanonischen Textfassungen geprüft.

## Umfang und Grenzen

Die Textfassung `2026-11-23.1` und die frühere Fassung `2026-11-15.1` behalten ihre bisherigen SHA-256-Werte. Einwilligungstexte und Datenbankmigrationen wurden hierfür nicht verändert. Es ist keine weitere Migration allein für die Darstellungsänderung erforderlich. Der Status einer früher erforderlichen Migration ist davon getrennt zu betrachten.

Die native Darstellung ist typgeprüft, aber nicht auf einem echten Mobilgerät vermessen. Die Überarbeitung ist keine vollständige Prüfung aller Vereinsabläufe, organisatorischen Maßnahmen, Verträge oder möglicher besonderer gesetzlicher Anwendungsbereiche. Sie enthält keine pauschale Zusicherung vollständiger Rechtskonformität des Betriebs. Der bereits dokumentierte IONOS-Prüfstatus wird unverändert beibehalten; vom Nutzer werden hierzu keine weiteren Schritte verlangt.
