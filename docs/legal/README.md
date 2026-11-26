# Datenschutzerklärung und Einwilligungen

Aktuelle lokale Fassung: `privacy-2026-11-23.1.md`, Stand 23. November 2026. Die Website zeigt denselben Inhalt aus `src/constants/privacy-policy.json` unter `/datenschutz`. Der öffentliche Download liegt unter `public/legal/`. Die archivierte Fassung `2026-11-15.1` bleibt unverändert.

## Einwilligungen und Rechte

- Bei Registrierung werden Sorgeberechtigung, Kinder-/Lerndaten und freiwillige Originalaufnahmen getrennt behandelt. Bestandskonten ohne Nachweis entscheiden vor dem Laden der Familiendaten. Im Konto sind Änderungen und Widerruf möglich.
- Die serverseitige Historie `privacy_consent_events` ist für Clients ausschließlich mit eigener Leseberechtigung zugänglich. Neue Entscheidungen werden angehängt. Änderbare Auth-Metadaten werden nur beim INSERT eines Auth-Kontos berücksichtigt; spätere Metadatenänderungen erzeugen keine Freigaben.
- Für unveränderte Kinder- und Aufnahmetexte bleibt ein älterer Nachweis gültig. `privacy_purpose_version_is_current` vergleicht die archivierten Zwecktexte einschließlich Sorgeberechtigung. Neue CAPTCHA-Hinweise erzeugen keinen erneuten Zwang zur Elternentscheidung. Ein aktueller Widerruf hat weiterhin Vorrang.
- Lehrkräfte sehen Aufnahmefreigaben nur im zuständigen Altersgruppenbereich. Die Anzeige steuert Zoom nicht automatisch. Teilnahme ohne personenbezogene Originalaufnahme muss tatsächlich ermöglicht werden. Früher ohne erforderliche Einwilligung erstellte Aufnahmen werden nicht rückwirkend erlaubt.
- YouTube wird erst nach eigener Ladeentscheidung eingebunden; der Widerruf entfernt den Player.

## hCaptcha

Web und Native mounten die externe Komponente erst nach „Einwilligen und hCaptcha laden“. Ohne Zustimmung wird `info@bufib.de` für Kontoanlage, Zugangshilfe und Löschung angeboten. Der Verein muss diese Alternative tatsächlich bearbeiten und darf Unterrichtsteilnahme nicht an die CAPTCHA-Zustimmung knüpfen. Die globale Supabase-CAPTCHA-Absicherung bleibt eingeschaltet.

Die Ladeentscheidung steht nur im Arbeitsspeicher der geöffneten Webseite beziehungsweise App. Kein eigener Cookie und kein persistenter Browser-Eintrag wird dafür geschrieben. Vollständiges Neuladen oder App-Neustart erfordert eine neue Zustimmung. Widerruf am Widget, unter `/datenschutz` oder im Konto löscht die Entscheidung; Web lädt das Dokument neu, damit auch das bereits geladene SDK endet. Native entfernt die WebView und verwirft das Prüftoken. Cookies auf Anbieterdomains kann die Akademie nicht selbst entfernen.

Bei erfolgreicher Registrierung wird ein zusätzlicher `hcaptcha`-Nachweis mit exaktem Text, Version und serverseitigem Zeitpunkt archiviert. Er dokumentiert nur die frühere Registrierung und ist niemals eine Ladeberechtigung für spätere Besuche. Manuelle Konten und Konten ohne diese ausdrückliche Entscheidung erhalten keinen erfundenen CAPTCHA-Nachweis. Passwortwiederherstellung erzeugt keinen dauerhaften Kontonachweis.

## Datenbank und Veröffentlichung

Am 15. November 2026 wurde `20261115120000_privacy_consents.sql` remote als angewendet geprüft. Diese Migration und ihr Snapshot dürfen nicht umgeschrieben werden. Für den neuen Stand ist zusätzlich **`20261123120000_hcaptcha_privacy_consent.sql`** lokal vorbereitet und isoliert getestet. Sie wurde durch diese Bearbeitung nicht auf Produktion angewendet.

1. Mit Node 24 im richtigen Projekt `npx supabase migration list --linked` und `npx supabase db push --linked --skip-vault --dry-run` prüfen. Verknüpftes Ziel: `nuylkwxscuqvbckffang`. Nur die erwartete neue Migration darf ausstehen.
2. Nach konkreter Freigabe die neue Migration mit `npx supabase db push --linked --skip-vault` anwenden. Den alten Snapshot nicht erneut erzeugen oder manuell reparieren.
3. Den dazugehörigen Client-Commit zeitnah auf `erweiterung7` pushen. Der OVH-Workflow veröffentlicht ausschließlich committed Code und führt keine Migration aus. Die bereits vorher vorhandene Änderung an `src/app/impressum.tsx` gehört nicht automatisch in diesen Commit.
4. Live: Registrierung und Passwortwiederherstellung vor Zustimmung ohne hCaptcha; nach Zustimmung geladen; Widerruf lädt ohne Einbindung neu. Kontoentscheidungen und Rollenfreigaben kontrollieren. Echte Registrierungen versenden E-Mails und benötigen bewusst gewählte eigene Testdaten.

Der neue Snapshot hat SHA-256 `18a3e8b6cb70c01001233c9810d91c9d62efb9756b37152de40b1cffb886cbdf`. Die alte Fassung behält `7b0f0e54cb5e300cf7e4249121bddf8ad6cad8513fff5cab76dec5d503ddbd7d`.

## Textpflege und Prüfung

`python3 scripts/sync-privacy-documents.py` erzeugt nur UI und öffentliche Kopie der aktuellen Version. Es verändert keine Migration. Eine bereits abweichende öffentliche Kopie wird nicht überschrieben: dafür eine neue Version anlegen.

Nur bei einer neuen Migration mit dem noch unbefüllten Marker `-- PRIVACY_VERSION_SEED` kann `--migration supabase/migrations/NEUE_DATEI.sql` genau einmal den SQL-Snapshot ergänzen. Eine bereits befüllte Migration wird abgewiesen. Archivierte Texte und Einwilligungstexte nicht nachträglich verändern.

Die Tests `privacy_consents.sql`, `teaching_age_groups.sql` und `hcaptcha_privacy.sql` müssen gegen eine isolierte Datenbank mit vollständiger Migrationskette laufen. Sie verwenden Testdaten und rollen ihre Transaktion zurück. Browserprüfungen belegen den beobachteten Ablauf; native Builds sind typgeprüft, aber nicht auf einem echten Gerät gemessen. Die Prüfung der öffentlichen Anbieterbedingungen ist kein authentifizierter Nachweis sämtlicher historischer Kontoverträge. Der Nutzer hat keinerlei Zugriff auf das IONOS-Vertragskonto und kann auch keine Prüfung über eine andere Person veranlassen. Die vorgeschlagene Weitergabe entfällt; hierzu werden von ihm keine weiteren Angaben oder Handlungen verlangt. Der konkrete AVV-Status bleibt eine interne Nachweisgrenze und wird nicht als geprüft ausgegeben. Öffentlicher Datenschutztext und archivierte Fassungen bleiben unverändert.

## Darstellung und Verständlichkeit – 24. November 2026

Die Datenschutzseite verwendet nun `privacy-document.web.tsx` beziehungsweise den nativen Renderer `privacy-document.tsx`. Der Erklärungstext beginnt mit dem Verantwortlichen. Ein verlinktes Inhaltsverzeichnis erschließt alle 21 Abschnitte; die hCaptcha-Einstellung steht im passenden Abschnitt 11 und ist über einen Direktlink erreichbar. Der Widerruf bleibt auch am Widget und im Konto erreichbar. Deutsche Sprachkennzeichnung für die HTML-Ausgabe, ein aussagekräftiger Seitentitel, echte Überschriften, Absätze und Listen sowie Tastaturfokus und sichtbare Linkmarkierung unterstützen den Webzugang. Die öffentliche Datenschutzroute wird schon vor der Sitzungsinitialisierung ausgegeben und ist deshalb auch ohne JavaScript vollständig lesbar. Der Zugriffsschutz geschützter Akademierouten wird dadurch nicht aufgehoben. Der Fließtext verwendet mindestens 16 Pixel beziehungsweise browserrelative Schriftgrößen.

Die scriptfreie Druckansicht unter `public/legal/privacy-2026-11-23.1.html` wird aus demselben kanonischen Text generiert und kann auch ohne laufende App gelesen und gedruckt werden. `scripts/sync-privacy-documents.py` hält sie mit der Markdown-Fassung synchron. Sie enthält keine aktiven Anbieter-Einbindungen. Die Einstellung ist auf der interaktiven Website erreichbar.

Hierbei wurden ausschließlich Darstellung und begleitende Bedienhinweise verändert. Datenschutzerklärung, Einwilligungstexte und bereits archivierte Versionen behalten ihre Hashwerte. Diese Änderung benötigt keine zusätzliche Datenbankmigration und holt unveränderte Einwilligungen nicht erneut ein. Die zuvor vorbereitete Migration vom 23. November bleibt Teil der gesonderten Veröffentlichungsschritte; aus einem Git-Commit wird kein erfolgreicher Datenbank-Livegang abgeleitet.

Maßgebliche öffentliche Grundlagen der Gestaltung sind insbesondere [Art. 12 und 13 DSGVO](https://eur-lex.europa.eu/legal-content/DE/TXT/?uri=CELEX:32016R0679) sowie die [Hinweise der Berliner Datenschutzaufsicht zu Cookies und Einwilligungen](https://www.datenschutz-berlin.de/themen/internet/cookies/). Die Darstellung enthält keine pauschale Aussage, dass sämtliche tatsächlichen Betriebsabläufe und Vertragsunterlagen rechtlich geprüft seien. Der bereits dokumentierte IONOS-Prüfstatus bleibt unverändert; hierzu werden keine weiteren Handlungen vom Nutzer verlangt.

Die Abschlussprüfung einschließlich Browserbetrieb ohne JavaScript ist dokumentiert in [Darstellung und Zugänglichkeit](darstellung-2026-11-24.md).

## Kompakte Zustimmungstexte bei Registrierung

Die Registrierung zeigt kurze, zweckbezogene Erklärungen statt sämtlicher Volltexte auf einmal. Verantwortlicher, ausdrückliche Einwilligung einschließlich möglicher Religionsbezüge, die Freiwilligkeit der Aufnahme sowie die Widerrufsmöglichkeit bleiben sichtbar. Unter „Details lesen“ steht die vollständige, unveränderte Erklärung direkt am jeweiligen Auswahlfeld; das Öffnen ist keine Zustimmung und darf keine Checkbox umschalten. Die Volltexte bleiben den archivierten Fassungen aus `src/constants/privacy.ts` zugeordnet. Änderungen an Kurzfassungen dürfen den erläuterten Umfang und die Folgen nicht verändern; ein neuer Zweck erfordert weiterhin eine neue Textversion.

`ConsentDetails` stellt den aufklappbaren Bereich bereit. `ConsentCheckbox` verwendet im Web echte HTML-Checkboxen, damit Tastaturbedienung und Beschriftung zuverlässig funktionieren; Native behält die berührbare Checkbox. Die Beitragszustimmung bleibt von den Datenschutzentscheidungen getrennt. Keine Auswahl ist vorausgewählt. Die hCaptcha-Erklärung ist ebenfalls aufklappbar; das Lesen lädt den Anbieter nicht. Zustimmung und Kontaktalternative bleiben gleichwertig sichtbar. Die unabhängige Datenschutzerklärung und die bereits archivierten Volltexte werden nicht gekürzt oder umgeschrieben; keine zusätzliche Migration ist hierfür erforderlich.

Browservergleich bei 320, 390 und 1440 Pixeln: Der Datenschutz-Auswahlbereich ist um 68 %, 65 % beziehungsweise 63 % kürzer; die gesamte Registrierungsseite um etwa 47 %, 42 % beziehungsweise 39 %. Alle vier vollständigen Erklärungen ließen sich öffnen und schließen, ohne Eingaben oder Entscheidungen zu verlieren. Die freiwillige Aufnahme blieb ungewählt, und hCaptcha blieb bis zur ausdrücklichen Ladeentscheidung gesperrt. Nach Widerruf wurden keine weiteren Anbieteranfragen beobachtet. Nachweis: [Kompakte Registrierung](evidence/registrierung-kompakt-2026-11-24.json).

Die Gestaltung folgt dem vom [EDPB erläuterten mehrstufigen Informationsansatz](https://www.edpb.europa.eu/system/files/documents/files/file1/edpb_guidelines_202005_consent_en.pdf), insbesondere Randnummern 64–72. Die wesentlichen Informationen dürfen dabei nicht ausschließlich in einer versteckten Ebene stehen.

## Gemeinsame Pflichtcheckbox bei Registrierung – 25. November 2026

Ausschließlich auf der Registrierungsseite fasst `combineGuardianConfirmation` die Sorge-/Vertretungsbestätigung und die ausdrückliche Kinder-/Lerndateneinwilligung zu einer sichtbaren Pflichtcheckbox zusammen. Ihr aktivierter Zustand verlangt beide Werte; ein expliziter Klick setzt `guardianConfirmed` und `childDataGranted` gemeinsam auf denselben Wert. Die separate Entscheidung `recordingGranted` wird dabei nicht verändert. Beitragszustimmung und hCaptcha bleiben ebenfalls eigenständig.

Unter dem gemeinsamen Details-Schalter stehen die vollständige Sorgeberechtigungserklärung und die vollständige Kinder-/Lerndatenerklärung unverändert nacheinander. Das Öffnen der Details bestätigt nichts und verändert keine Auswahl. Die sichtbare Kurzfassung benennt Volljährigkeit, Sorge-/Vertretungsberechtigung, den Unterrichtszweck und mögliche Religionsbezüge ausdrücklich.

Die vorhandenen Prüfungen bei Registrierung und im Auth-Aufruf verlangen weiterhin beide Pflichtwerte. Die API und die serverseitige Erfassung bleiben unverändert. Es gibt keine neue Textversion oder Migration und keine Rückdatierung bestehender Entscheidungen. Kontoeinstellungen und Bestandskonten-Abfrage behalten zunächst ihre getrennten Auswahlfelder; die neue gemeinsame Darstellung wird nur bei Registrierung aktiviert.

Geprüft bei 320, 390 und 1440 Pixeln: gemeinsame Auswahl und Abwahl per Tastatur, unabhängige Aufnahmeentscheidung, beide vollständigen Erklärungen in den Details, Erhalt der Eingaben, keine Vorauswahl, kein horizontaler Überlauf und keine hCaptcha-Anfragen durch die Details. [Browsernachweis](evidence/registrierung-gemeinsame-checkbox-2026-11-25.json). TypeScript, Lint und Web-Export sind bestanden. Keine Registrierung oder E-Mail wurde ausgelöst.
