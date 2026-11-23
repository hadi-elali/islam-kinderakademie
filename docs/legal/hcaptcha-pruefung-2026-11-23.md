# hCaptcha: Browserprüfung und Bewertung der Einbindung

Stand: 23. November 2026. Untersucht wurden die bisherige öffentliche Website und der lokal erzeugte neue Produktions-Export. Keine Registrierung, Anmeldung, Passwort-E-Mail oder Kontolöschung wurde ausgelöst. Es wurden keine privaten Browserprofile genutzt.

## Vollständiger Prüfablauf der bisherigen Website

Am 15. November wurden Startseite, Registrierung und Passwortwiederherstellung in frischen Browserkontexten zunächst passiv beobachtet. Die Startseite lud kein hCaptcha. Registrierung und Passwortwiederherstellung stellten bereits ohne Eingabe hCaptcha-Verbindungen her und setzten `__cf_bm`.

Anschließend wurde auf der öffentlichen Registrierungsseite auch die Sicherheitsabfrage interaktiv bis zum Abschluss beobachtet. Das Vorhandensein des Ergebnisfelds wurde nur als boolescher Wert erfasst (`challengeCompleted: true`). Der Prüftoken wurde nicht gespeichert; das Kontoformular wurde nicht abgesendet. Damit ist die frühere Beschränkung auf passive Seitenaufrufe behoben. Es wird keine programmatische Lösung visueller CAPTCHA-Aufgaben behauptet.

Nach Abschluss wurden folgende Cookies beobachtet:

| Name | Domain | Beobachtete Laufzeit |
| --- | --- | --- |
| `__cf_bm` | `.hcaptcha.com` | ungefähr 30 Minuten |
| `__cflb` | `api2.hcaptcha.com` und `api.hcaptcha.com` | ungefähr 30 Minuten |
| `hmt_id` | `api.hcaptcha.com` | 30 Tage |

Der Abruf umfasste SDK, Widget-, Sprach- und Aufgabenressourcen sowie `checksiteconfig`, `getcaptcha` und `checkcaptcha`. Bei der abschließenden Prüfanforderung wurden unter anderem Felder für Antworten, Bewegungsinformationen, Seitendomain und Sitekey beobachtet. Opaque beziehungsweise verschlüsselte Nutzlasten wurden nicht entschlüsselt und ihre Inhalte nicht als bekannt ausgegeben. Der Anbieter beschreibt weitere mögliche Geräte-/Interaktionsdaten und die Nutzung nicht zugeordneten Aufgabenmaterials für maschinelles Lernen. Daraus wird keine beobachtete Übertragung konkreter Kontoformularinhalte abgeleitet.

Die gespeicherten Messdaten enthalten Cookie-Namen und Attribute, Anfrageherkunft, bereinigte Pfade und Feldnamen. Cookie-Werte, URL-Parameterwerte und Challenge-Tokens in Pfaden wurden entfernt. Der kurzzeitige `lswt-…`-Speichertest auf der Akademiedomain lässt sich dem installierten Supabase-Auth-Client zuordnen; daraus wird keine dauerhaft gespeicherte hCaptcha-Kennung konstruiert.

## Rechtliche Bewertung und getroffene Entscheidung

[§ 25 TDDDG](https://www.gesetze-im-internet.de/ttdsg/__25.html) verlangt für Endgerätespeicherungen/-zugriffe grundsätzlich informierte Einwilligung; die Ausnahme betrifft insbesondere unbedingt erforderliche Vorgänge für den ausdrücklich gewünschten Dienst. Der Sicherheitszweck allein belegt nicht jede einzelne Verarbeitung. Die [Berliner Datenschutzaufsicht](https://www.datenschutz-berlin.de/themen/internet/cookies/) und die [DSK-Orientierungshilfe Digitale Dienste 2024](https://www.datenschutz-berlin.de/fileadmin/user_upload/pdf/publikationen/DSK/orientierungshilfen/2024_DSK-OH_Digitale-Dienste.pdf) erläutern diese enge Ausnahme und die notwendige Betrachtung der tatsächlichen Funktionen.

Die [hCaptcha-Hinweise](https://www.hcaptcha.com/privacy) beschreiben `hmt_id` unter anderem für dienstbezogene Statistiken und Barrierefreiheit. [Cloudflare](https://developers.cloudflare.com/fundamentals/reference/policies-compliances/cloudflare-cookies/) beschreibt Bot-Abwehr und Lastverteilung für die anderen beobachteten Cookies. Die Anbieterklassifikation als erforderlich entscheidet nicht verbindlich über § 25 TDDDG im konkreten Akademieangebot. Umgekehrt beweist eine Laufzeit von 30 Tagen für sich allein keine Rechtswidrigkeit.

**Bewertung für diese Umsetzung:** Für sämtliche beobachteten und beschriebenen Vorgänge ist die unbedingte Erforderlichkeit nicht ausreichend nachgewiesen. Deshalb wird die Einbindung nicht pauschal auf die Ausnahme oder allein auf berechtigte Interessen gestützt. Die neue Fassung holt vor dem Laden eine eigene informierte Zustimmung nach Art. 6 Abs. 1 Buchst. a DSGVO und § 25 Abs. 1 TDDDG ein; mögliche sensible Rückschlüsse auf den Akademiebezug sind ausdrücklich angesprochen. Sie weist auf Datenarten, Zwecke, mögliche USA-Verarbeitung, Cookie-Laufzeiten und Widerruf hin. Eine Ladezustimmung ersetzt keine nach Kapitel V DSGVO erforderliche Übermittlungsgarantie.

Die Ablehnung darf keine Voraussetzung für Unterrichtsteilnahme sein. `info@bufib.de` wird für alternative Kontoanlage, Zugangshilfe und Löschung angeboten. Diese Alternative muss der Verein tatsächlich bearbeiten, mit angemessener Identitätsprüfung und ohne CAPTCHA-Pflicht. Das ist eine Betriebsanforderung, keine durch eine Textzeile automatisch erfüllte Tatsache. Die übrigen Kinder-/Aufnahmeeinwilligungen werden davon getrennt behandelt.

## Technische Anpassung und Prüfung des neuen Exports

- Web und Native mounten hCaptcha erst nach „Einwilligen und hCaptcha laden“. Der globale serverseitige Supabase-CAPTCHA-Schutz bleibt aktiv.
- Die Ladeentscheidung liegt ausschließlich im Arbeitsspeicher. Sie wird nicht in einem eigenen Cookie oder persistenten Browser-Eintrag abgelegt. Nach vollständigem Neuladen beziehungsweise App-Neustart ist neu zu entscheiden.
- Widerruf ist am Widget, auf `/datenschutz` und im Konto erreichbar. Web lädt neu, um das bereits geladene Anbieterskript vollständig zu entladen; Native entfernt die WebView und verwirft das Prüftoken. Auf das notwendige Neuladen und den Verlust nicht abgesendeter Eingaben wird hingewiesen.
- Die Akademie kann Cookies fremder Domains nicht unmittelbar löschen. Browser-/Geräteeinstellungen und Anbieterablaufzeiten sind erläutert.
- Bei erfolgreicher Registrierung wird der ausdrückliche Ladeentscheid mit archiviertem Text und serverseitigem Zeitpunkt als vergangener Vorgang erfasst. Er erlaubt kein automatisches späteres Laden; für manuelle Konten wird kein solcher Nachweis erfunden.

Der neue Produktions-Export wurde am 23. November ohne Formularversand geprüft:

| Ansicht | Breite | hCaptcha vor Zustimmung | Nach Zustimmung | Nach Widerruf/Neuladen |
| --- | --- | --- | --- | --- |
| Registrierung | 390 px | 0 Anfragen | SDK-/Widget-Abrufe | 0 weitere Anfragen, gesperrt |
| Passwortwiederherstellung | 1440 px | 0 Anfragen | SDK-/Widget-Abrufe | 0 weitere Anfragen, neue Zustimmung erforderlich |
| Datenschutz | 390 px | 0 Anfragen | Kein automatisches Laden | Widerruf bei vorheriger Freigabe per interner Navigation erreichbar |

In den untersuchten Ansichten wurde kein horizontaler Überlauf festgestellt. Die neue lokale Messung prüft die Ladesperre und ihren Widerruf; sie führt keine neue Challenge-Lösung oder erfolgreiche Supabase-Registrierung aus. Der abgeschlossene Challenge-Ablauf ist durch die frühere Live-Messung belegt. Die geschützte Kontolöschung verwendet dieselbe Komponente, wurde aber nicht an einem echten Konto ausgeführt. Native ist typgeprüft; eine Messung auf einem echten Mobilgerät ist nicht erfolgt. Beobachtungen aus einzelnen Browserläufen sind keine Garantie für sämtliche späteren Anbietervarianten.

Zusätzlich bestanden: TypeScript, ESLint, Web-Export, 14 vorhandene Egress-Regressionen und 72 SQL-Prüfungen in einer eigens angelegten und anschließend entfernten lokalen Datenbank. Geprüft wurden dabei unter anderem Registrierungshinweise, fehlende Rückdatierung, unveränderter alter Textnachweis, Zwecktext-Kompatibilität sowie Vorrang eines Widerrufs.

## Nachweise und Veröffentlichungsstand

Die neue lokale Datenschutzfassung ist `2026-11-23.1`. Die bereits am 15. November remote bestätigte Fassung `2026-11-15.1` wurde nicht umgeschrieben. Die neue Migration `20261123120000_hcaptcha_privacy_consent.sql` und der passende Client sind noch zu veröffentlichen; in dieser Bearbeitung erfolgte keine Produktionsänderung.

- [Passive Messung vom 15. November](evidence/hcaptcha-browserpruefung-2026-11-15.json)
- [Abgeschlossene interaktive Prüfung vom 15. November](evidence/hcaptcha-interaktiv-2026-11-15.json)
- [Zustimmung und Widerruf am neuen Export vom 23. November](evidence/hcaptcha-einwilligungstest-2026-11-23.json)

Die Bewertung erklärt die gewählte konkrete Einbindung anhand von Gesetz, Aufsichtshinweisen und Messung. Sie ist kein gerichtlicher oder anwaltlicher Freigabenachweis und bestätigt keine unbekannten historischen Anbietervereinbarungen.
