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
