Supabase-Egress-Analyse vom 14. November 2026

Fortgeschrieben am 15. November 2026; live geprüfte Befunde siehe Abschnitt 8, PDF-Austausch und Release-Prüfung siehe Abschnitt 9.

Analysierter Ausgangsstand: Commit `ffc142b`, Branch `erweiterung7`. Nach ausdrücklicher Freigabe wurde die geprüfte kleinere PDF produktiv zugeordnet. Die Webänderungen sind für die Veröffentlichung über den bestehenden OVH-Workflow geprüft. Die bereits vorhandene Änderung an `src/app/impressum.tsx` gehört nicht zu dieser Arbeit und wird nicht mit veröffentlicht.

Bestätigte unnötige Datenübertragungen wurden behoben. Welcher Dienst die gemeldeten 6,664 GB verursacht hat und ob die Monatsprognose jetzt unter 3 GB liegt, ist ohne dienstbezogene Verbrauchsdaten noch offen.

**1. Ausgangswerte und Aussagegrenzen**

Für 14.10.–14.11.2026 wurden 6,664 GB uncached Egress, 2,122 GB Cached Egress, 59 MB Storage, 32 MB Datenbank, 80 MAU und 102 Function-Aufrufe übermittelt. Der Projektanteil am uncached Organisationsverbrauch beträgt 6,664 / 6,854 = rund 97,2 %. Zum Ziel von 3 GB wäre eine Reduktion um mindestens 55 % erforderlich.

Der später eingefügte Dashboardtext enthält eine andere Ansicht: 5,494 GB uncached, 1,782 GB cached, 53 MAU und 66 Function-Aufrufe. Er nennt im Kopf 14.11.–14.12.2026, zeigt aber Tagesachsen von Oktober bis November. Diese Zahlen werden deshalb weder mit den ursprünglichen Monatszahlen verrechnet noch als bereits gemessene Einsparung verwendet. Realtime-Verbindungen und Realtime-Nachrichten sind dort ausdrücklich null.

Uncached und cached werden getrennt betrachtet; das Free-Kontingent beträgt laut aktueller Dokumentation jeweils 5 GB. Die Tagesaufschlüsselung nach Diensten enthält cached Traffic bereits. Cached Egress darf deshalb nicht noch einmal zu dieser Dienstaufschlüsselung addiert werden. Die Kontingente gelten für die Organisation. [Supabase: Egress-Verbrauch](https://supabase.com/docs/guides/platform/manage-your-usage/egress)

Die belegte Speichermenge ist kein monatlicher Traffic-Grenzwert: Ein 5-MB-PDF, das 80 Personen in vier Wochen jeweils viermal pro Woche abrufen, ergibt rechnerisch 6,4 GB. Das ist ein Rechenbeispiel, keine Messung dieses Projekts. Auch eine kleine Datenbank kann durch häufige Wiederholungen viel Egress erzeugen.

**2. Vollständige Bestandsaufnahme der Supabase-Zugriffspfade**

| Bereich / Fundstelle | Verhalten vor der Optimierung | Bewertung |
| --- | --- | --- |
| `src/lib/supabase.ts` | Ein gemeinsamer Client; Auth-Sitzung und Token-Erneuerung | Sinnvoll, unverändert. Kein Realtime-Abonnement. |
| `src/context/auth-context.tsx`, Auth-Seiten, `src/app/account.tsx` | Profilreparatur-RPC, gezielte Profil-/Rollenabfragen; Anmeldung, Registrierung, Passwort-Reset/-Änderung und Löschung | Keine belegte Endlosschleife. Gleichartige Auth-Ereignisse desselben Kontos lösen bereits keinen neuen Profilladevorgang aus. Native AppState-Ereignisse steuern nur den Auth-Refresh. |
| `src/lib/academy-api.ts`: `loadAcademyData`, bisher `selectTable` | Bei jedem vollständigen Laden 26 Tabellen mit `select('*')`, zusätzlich Dozentenkontakt-RPC und ggf. Portraitsignierung | Belegte Redundanz. Live gemessene Summe der Zeilen-JSON-Größen: 357.070 Bytes vor RLS-Filterung, HTTP-Framing und Kompression; siehe Abschnitt 8. |
| `src/context/academy-data-context.tsx`: `execute` | Nach praktisch jeder erfolgreichen Schreibaktion derselbe vollständige Abruf | Belegte Redundanz. Auch ein Quizversuch lud Unterrichtsinhalte, Medienmetadaten, Mitteilungen usw. erneut. |
| `src/app/quiz/[lessonId].tsx`, `quiz-bearbeiten.tsx`, `lektionen.tsx`, `lektion-neu.tsx`, CRUD-Seiten | Die Schreibaktionen verwenden überwiegend `execute` | Verstärken den vorherigen Befund. Sammelfreigaben wurden bereits innerhalb eines einzelnen `execute` gebündelt. |
| `src/app/lektion/[id].tsx`: PDF-Effekt | Erste ausgewählte PDF wird eingebettet. Effekt hängt am gesamten `selectedPdfAsset`-Objekt. Ein Komplettabruf liefert neue Objekte und startet die Signierung erneut. „PDF separat öffnen“ signiert zusätzlich erneut. | Erneute Signieraufrufe belegt. Neue URL-Tokens können erneute Dateiübertragungen auslösen; das tatsächliche Downloadvolumen muss gemessen werden. |
| `academy-api.ts`: `getMediaSignedUrl`, `withStaffPortraitUrls`; `staff-portrait.tsx`, `teaching-contacts.tsx` | Keine gemeinsame URL-Wiederverwendung; Portraits bei Komplettabrufen und Kontenabfragen neu signiert | Belegte fehlende Wiederverwendung. Portraits werden mit 48–72 CSS-Pixeln angezeigt; live liegen zwei PNGs mit 2.173.712 und 1.249.894 Bytes sowie ein JPEG mit 42.037 Bytes vor. |
| `src/app/medien.tsx`, `src/app/lektion-neu.tsx` | Dateien werden ausdrücklich geöffnet; Mediathek zeigt Symbole statt automatischer Downloads aller Medien | Kein Beleg für pauschales Vorladen aller Dateien. Mehrfaches Öffnen erzeugte allerdings neue signierte URLs. |
| `src/app/konten.tsx` | Konten-RPC beim Mounten und expliziten Neuladen; enthaltene Portraits separat neu signiert | Kein Polling. Umfang hängt von der Kontenzahl ab. |
| `src/components/dashboards/admin-dashboard.tsx` | Zwei zusätzliche Zahlungsabfragen beim Mounten und manuellen Aktualisieren, mit expliziten Spalten | Kein Polling. Zahlungsverlauf wird vollständig geladen; spätere Pagination bei wachsendem Umfang sinnvoll. |
| Lernfortschritt und Abgaben in `academy-api.ts` | Gezielte ID-Abfragen, Zählung mit `head: true`, einzelne Upserts und Auswertungs-RPCs | Kein Beleg für große einzelne Antworten. Große historische Versuchsdaten wurden trotzdem über den globalen Abruf übertragen. |
| `supabase/functions/password-login` | Ein Auth-Token-Aufruf, Rückgabe der Sitzungstokens mit `no-store` | Kein Medienproxy und kein belegter GB-Treiber. |
| `supabase/functions/delete-account` | Auth-Prüfung und Kontolöschung nach ausdrücklicher Aktion | Kein wiederkehrender Hintergrunddownload. |
| `supabase/functions/send-message-email` | Gezielte Nachrichtenabfrage, Empfänger-RPC, Versandprotokoll und kleine Brevo-Hinweise; bestehende Versanddeduplizierung | Serverseitiger Traffic vorhanden, aber kein Beleg für dominierenden Egress. |
| `src/app/_layout.tsx`, öffentliche Seiten, Web-Export, Deployment-Workflow | Statische Expo-Web-App bei OVH. Fachliche Reads laufen in Client-Effekten nach Anmeldung. | Keine serverseitige Supabase-Abfrageschleife beim Web-Rendering gefunden. Statische JS-/Bilddateien werden von OVH ausgeliefert. |
| YouTube-Komponenten und Zoom-/Replay-Verweise | YouTube-Einbettung und ausdrücklich geöffnete externe Links | YouTube-Videobytes laufen über YouTube. Ob ein eingetragener Replay-Link stattdessen auf Supabase zeigt, lässt sich erst anhand der gespeicherten URLs bzw. Logs feststellen. |

Alle direkten Supabase-Imports, Storage-Signierungen, Function-Aufrufe, `fetch`-Stellen, Effekte, Listener und Timer wurden erfasst. Die `fetch(asset.uri)`-Stellen der Uploadformulare lesen ausgewählte lokale Dateien; sie laden nicht automatisch die Supabase-Mediathek herunter. Normale Navigation verwendet bereits den gemeinsamen Datenkontext und lädt nicht bei jedem Seitenwechsel alle Tabellen neu. Im Anwendungscode wurde kein Supabase-Polling und keine Request-Endlosschleife gefunden.

**3. Wahrscheinlich größter Verursacher**

Die stärkste Arbeitshypothese sind wiederholte private Storage-Downloads, insbesondere eine live nachgewiesene PDF mit 41.838.341 Bytes in einer freigegebenen Lektion und große Portraits. Dafür sprechen Dateigrößen, die vorhandenen automatischen PDF-/Portrait-Anzeigen und die wiederholte Signierung. Der Datenbank-Komplettabruf ist zusätzlich eine sicher belegte Redundanz, seine gesamte unkomprimierte Zeilen-JSON-Größe liegt im aktuellen Bestand aber nur bei rund 357 KB. Die tatsächlichen monatlichen Abrufzahlen beider Dienste sind noch nicht gemessen.

Eine verlässliche Prozentaufteilung ist aus den Gesamtwerten allein nicht ableitbar. Aus der Cached-Summe folgt keine belastbare Dienstaufteilung der 6,664 GB uncached Egress. Realtime ist für die eingefügte Ansicht durch die Nullwerte ausgeschlossen; Auth und die drei kleinen Function-Abläufe erscheinen anhand des Codes weniger wahrscheinlich als Hauptursache.

URL-Signierung und Dateiübertragung sind verschiedene Requests: Ein kleiner Signieraufruf verursacht nicht selbst einen vollständigen PDF-Download. Relevant ist die folgende Änderung der Ressourcen-URL im Reader oder Bild. Supabase beschreibt unterschiedliche signierte Tokens als getrennte Cache-Schlüssel. Smart CDN ist erst ab Pro enthalten und wurde nicht als kostenlose Lösung eingeführt. Die Wiederverwendung einer identischen URL hilft auch dem Browser, soweit dessen Cache und Dateiantwort dies erlauben; eine Cache-Trefferquote wird damit nicht garantiert. [Supabase: CDN und signierte URLs](https://supabase.com/docs/guides/storage/cdn/smart-cdn)

**4. Konkret umgesetzte Änderungen**

- Der Datenloader unterstützt gezielte Datengruppen. 25 Schreibaktionen geben nun die betroffenen Gruppen an. Quizabgabe: nur `quizAttempts` und `lessonProgress`; Quizfreigabe: nur `quizzes`; Medienänderungen: Medienmetadaten und bei Bedarf PDF-Zuordnungen; Mitteilungen: Nachrichten und Lesebestätigungen; Abzeichenlöschung: Definitionen und Verleihungen. Quizbearbeitung berücksichtigt auch die serverseitige Löschung alter Versuche und Lektionsfortschritte. Fundstellen: `academy-api.ts`, `academy-sources.ts`, `academy-data-context.tsx` und die betroffenen Aufrufstellen.
- Berechtigungsänderungen, Kinder-/Gruppenzuordnungen, komplexe Löschkaskaden, Curriculumänderungen und das Speichern einer Lektion behalten den vollständigen Refresh. Die explizite Gesamtaktualisierung bleibt erhalten.
- Gleichzeitige Aktualisierungen werden vereinigt und nacheinander ausgeführt. Eine während eines laufenden Reads abgeschlossene Änderung erhält einen nachfolgenden Read. Fehler blockieren spätere Aktualisierungen nicht. Fundstelle: `src/lib/refresh-queue.ts`.
- Zusätzlich werden Quiz-Antwortmöglichkeiten erst beim Öffnen eines Quiz geladen, Lösungsschlüssel erst im Quiz-Editor. Fragenanzahlen bleiben ohne diesen Abruf verfügbar. Der erste bedarfsgesteuerte Abruf aktualisiert die zugehörigen Quiz-/Fragedaten mit, damit Antwortmöglichkeiten und Frage-IDs zusammenpassen. Wiederholte Seitenbesuche verwenden den bestehenden kontobezogenen Datenzustand; explizite Gesamtaktualisierungen laden auch bereits angeforderte Quizdaten neu. Bei Ladefehlern bleiben Fehleranzeige und Wiederholung möglich. Der Editor initialisiert sein Formular erst nach Eintreffen der vorhandenen Optionen und Lösungen. Fundstellen: `academy-data-loader.ts`, `academy-sources.ts`, `academy-data-context.tsx` und die beiden Quizseiten.
- Private URLs und laufende Signieraufrufe werden je angemeldetem Datenkontext wiederverwendet. PDF-/Medien-URLs gelten weiterhin zehn Minuten, Portrait-URLs weiterhin eine Stunde; Wiederverwendung endet jeweils 30 Sekunden früher. Kontenansicht und Dozentenkontakte teilen denselben kontobezogenen URL-Speicher. Es werden höchstens 200 URLs gehalten. Fundstelle: `src/lib/signed-url-cache.ts`.
- Vollständiger Refresh, Abmeldung, Kontowechsel und Rollenwechsel verwerfen diesen Speicher. Alte asynchrone Ladevorgänge können den abgelösten Datenkontext nicht neu befüllen. Es gibt keinen gemeinsamen Speicher zwischen Konten und keine neue Speicherung privater Daten in LocalStorage, IndexedDB oder Service Workern. Bereits ausgestellte signierte URLs behalten ihre bisherige begrenzte Gültigkeit; RLS wird bei der Signierung geprüft. Sofortiger nachträglicher Widerruf bereits ausgestellter URLs wird hierdurch nicht eingeführt.
- Die globalen Tabellenabfragen verwenden explizite Spalten. Das von keiner aktuellen Ansicht verwendete JSON-Feld `lesson_steps.content` wird nicht mehr übertragen. Die sichtbaren Titel älterer Abgaben bleiben erhalten. Die ungenutzte Gesamthistorie `quiz_attempt_answers` wird nicht mehr vorausgeladen; das sichtbare Ergebnis wird weiterhin über den vorhandenen Auswertungs-RPC geladen. Familien fragen die für sie ohnehin RLS-gesperrten Lösungsschlüssel nicht mehr ab. Einzelzeilen-CRUD mit `select('*')` bleibt dort bestehen, wo die gespeicherte Zeile gebraucht wird.
- Der Web-PDF-Reader verwendet natives `loading="lazy"`. Der Browser darf außerhalb des Sichtbereichs liegende Reader später laden; Verhalten und Vorladeabstand sind browserspezifisch.
- Neue Web-Portraituploads werden lokal auf höchstens 512 Pixel Kantenlänge verkleinert und nur bei kleinerem Ergebnis als WebP mit Qualität 0,85 gespeichert. Transparenz bleibt erhalten. WebP-Dateien und animierte PNGs werden unverändert übernommen; fehlende Browserfunktionen oder Dekodierfehler fallen auf das Original zurück. Native Uploads und bestehende Dateien bleiben unverändert. Fundstellen: `prepare-staff-portrait.web.ts`, `prepare-staff-portrait.ts`, `uploadStaffPortrait`.

Datenbankschema, RLS, Bucket-Sichtbarkeit, URL-Gültigkeitszeiten, Uploadgrößenlimits, Edge Functions und UI-Design wurden nicht verändert. Für den geprüften PDF-Austausch wurden ausschließlich Dateipfad und Dateigröße des vorhandenen Medien-Datensatzes aktualisiert; siehe Abschnitt 9. Keine neue App-Abhängigkeit und kein kostenpflichtiger Dienst wurden eingeführt. Bestehende Expo-/Tooling-Pakete erhielten kompatible Sicherheits- und SDK-57-Patchupdates.

**5. Prüfung und gemessene Ergebnisse**

| Prüfung | Ergebnis / Reichweite |
| --- | --- |
| `node --test scripts/egress.test.mjs` mit Node 24.19.0 | 14 Regressionstests bestanden: URL-Ablauf, Parallelzugriffe, Kontotrennung, Fehlerwiederholung, verworfene laufende Signierungen, Refresh-Reihenfolge, bedarfsgesteuertes Laden und zugehörige Quizdaten, gezielte Abfragen, Lehrerfilter, gemeinsame Portraitsignierung und datensparsame HAR-Ausgabe. |
| `tsc --noEmit` | Bestanden. |
| `npm run lint` | Bestanden. |
| `npm run export:web` | Bestanden, 27 statische Routen erzeugt. |
| Chrome mit lokalem Produktionsbuild und vollständig abgefangenen Supabase-Anfragen | Elternübersicht → Kinderbereich → Lektion/PDF → Quizabgabe → Rückkehr zur PDF erfolgreich. Nach Quizabgabe genau zwei Tabellen-Reads statt der bisherigen 26. PDF behält ihre URL, keine zusätzliche Signierung. |
| Kontowechsel im Browser | Zweites synthetisches Konto erhält seine eigenen Kinderdaten; die Daten des ersten Kontos verschwinden. Derselbe Dateipfad wird für das zweite Konto erneut signiert. |
| Quizdaten und bestehender Quiz-Editor im Browser | Keine Optionenabfrage auf der Elternübersicht; Nachladen beim ersten Quizaufruf. Im Editor werden Optionen und verzögert eintreffende Lösungsschlüssel korrekt übernommen. Beim Speichern bleiben die vorhandenen Antworttexte, die gewählte richtige Lösung und deren Erklärung erhalten. |
| Smartphone-Breite 390 px | Kein horizontaler Überlauf in der geprüften Lektionsansicht. |
| Web-Portraitverkleinerung im echten Browser | Künstliche PNG-Testdatei: 3.359.229 Bytes → 32.510 Bytes, WebP mit 512 × 372 Pixeln. Ungültige Bilddatei bleibt unverändert. Keine Aussage über die Originalbilder in Produktion. |
| `git diff --check` für die eigenen Änderungen | Bestanden. Der bereits vorher vorhandene Impressums-Diff enthält separat eine Leerraumwarnung und wurde nicht verändert. |

Der Chrome-Test verwendet ausschließlich synthetische Sitzungen und Antworten. Er prüft den echten kompilierten Client, aber keine produktiven RLS-Entscheidungen oder Supabase-Abrechnungsbytes. Nach der Anmeldung wurde der CLI-Zugriff erfolgreich verifiziert; produktive Dateigrößen und aggregierte Zeilen-JSON-Größen wurden lesend geprüft, siehe Abschnitt 8. Eine authentifizierte Browsermessung tatsächlicher HTTP-Übertragungen sowie native Laufzeittests auf iOS/Android stehen weiter aus.

Die Verringerung von 26 auf zwei Tabellen-Reads nach einer Quizabgabe entspricht rund 92 % weniger Tabellen-Requests für diesen konkreten Vorgang. Daraus folgt keine pauschale Einsparung von 92 % beim monatlichen Egress. Erstaufrufe, große bestehende PDFs, lange Sitzungen, andere Browser-Tabs und fremde Downloads bleiben relevant.

**6. Noch benötigte Daten zur eindeutigen Ursachenbestimmung**

1. In Supabase Usage genau das Projekt und den Zeitraum 14.10.–14.11.2026 auswählen; zusätzlich den aktuellen Abrechnungszeitraum separat betrachten. Benötigt werden die Tages-/Summenwerte nach Database, Storage, Auth, Edge Functions, Realtime, Pooler und ggf. Log Drains sowie die separat ausgewiesenen Cached-Werte. Im Egress-Tagesdiagramm zeigt das Überfahren eines Datums die Dienstaufschlüsselung. Falls cached pro Dienst nicht verfügbar ist, die vorhandene Gesamtsumme mitliefern.
2. Im Logs Explorer die häufigsten REST-/RPC-/Storage-Pfade, Aufrufzahlen, Tage mit Spitzen sowie 200-/206-/304-Status ermitteln. Für Storage genügen Bucket, Dateigröße und Anzahl Abrufe; persönliche Ordnernamen und Tokens weglassen. 206-Antworten sind PDF-Teilabrufe und dürfen nicht jeweils als komplette Datei gezählt werden. Gateway-Logs enthalten laut Dokumentation derzeit keine verlässlichen Antwortbytes; solche Werte werden nicht vorausgesetzt. Für Datenbankabfragen helfen zusätzlich Query Performance: Aufrufzahl und durchschnittliche Ergebniszeilen. [Supabase: Egress untersuchen](https://supabase.com/docs/guides/platform/manage-your-usage/egress)
3. Bereits selbst geprüft: Größenverteilung der vorhandenen Dateien je Bucket (`academy-media`, `staff-portraits`), Anzahl, Summe und größte Dateien sowie PDF-Lektionszuordnungen. Keine weiteren Inventardaten vom Nutzer erforderlich; die noch fehlenden Informationen betreffen Übertragungen und historische Verbrauchswerte.
4. Eine lokale Browseraufnahme eines typischen Ablaufs vor bzw. nach Veröffentlichung: Anmeldung, Eltern-/Kinderwechsel, dieselbe Lektion zweimal öffnen, Quiz abgeben, PDF separat öffnen. DevTools → Network: „Preserve log“ aktivieren, „Disable cache“ für die realistische Cache-Messung **ausgeschaltet** lassen. Als HAR lokal speichern. HAR-Dateien können Sitzungstokens und private Inhalte enthalten und sollen nicht unbereinigt geteilt oder eingecheckt werden.

Für den nächsten Diagnoseschritt genügt zunächst der Tooltip eines stark belasteten Tages aus dem Egress-Diagramm: Datum sowie Storage-, Database- und Auth-/sonstige Werte. Für die endgültige Monatszuordnung wird weiterhin die vollständige Aufteilung benötigt. Das Storage-Inventar wurde inzwischen selbst über die angemeldete CLI mit den getrennten SELECT-Dateien aus Abschnitt 8 geprüft. Das zusätzliche optionale Skript `supabase/diagnostics/egress-storage.sql` bietet eine Inventaransicht ohne Dateipfade, wurde aber selbst nicht produktiv ausgeführt. Keines dieser Inventare misst Downloadverbrauch.

Das hinzugefügte Werkzeug wertet die HAR ausschließlich lokal aus:

```bash
node scripts/analyze-supabase-har.mjs /lokaler/pfad/aufnahme.har
```

Es gruppiert Database/REST, RPCs, Storage-Downloads, Auth und Functions. Ausgegeben werden Request-Anzahlen, Teilantworten, Fehler, dekodierte Bytes, komprimierte Bodybytes und Transferbytes, soweit die HAR diese liefert. Objektpfade, Querystrings, Tokens, Header und Response-Inhalte werden nicht ausgegeben. Fehlende Größen bleiben als unbekannt erkennbar. Dekodierte JSON-Größe, übertragene Browserbytes und abrechenbarer Supabase-Egress sind unterschiedliche Messgrößen. Durch Summieren aller Seitenaufrufe eines einzelnen Testkontos lässt sich kein Organisations-Monatswert beweisen.

**7. Dauerhaft unter dem Limit bleiben**

Nach Veröffentlichung mindestens sieben Tage täglich die uncached Tageswerte je Dienst vergleichen, bei ähnlicher Aktivität. Für weniger als 3 GB in einem 31-Tage-Zeitraum sind im Mittel höchstens rund 97 MB pro Tag zulässig; 90 MB pro Tag bietet etwas Reserve. Den übrigen Organisationsverbrauch und das separate Cached-Kontingent mitbeobachten. Die Einschränkungsankündigung ab 05.12.2026 bleibt zu beachten; bereits übertragene Bytes lassen sich durch Codeänderungen nicht rückwirkend entfernen.

Die nachgewiesene 41,84-MB-PDF wurde nach der anschließenden ausdrücklichen Freigabe geprüft und durch eine 13,46-MB-Kopie unter neuem privaten Objektpfad ersetzt; Abschnitt 9 enthält die Nachweise und Rückfallmöglichkeit. Vorhandene große Portraits können bei Bedarf einmal über die optimierte Uploadfunktion neu hochgeladen werden; diese wurden nicht verändert. Geschützte Unterrichtsdateien bleiben privat. Videos nach Möglichkeit über die vorhandene YouTube-Funktion anbieten, wenn das für den konkreten Inhalt zulässig und gewünscht ist; bestehende Dateien werden nicht automatisch verschoben oder gelöscht.

Wenn Database dominiert: anhand der gemessenen größten Antworten weiteres routebezogenes Nachladen und echte Pagination für Versuchshistorie, Abgaben, Nachrichten und Zahlungen ergänzen. Die übrigen initial geladenen Tabellen werden weiterhin mit allen sichtbaren Datensätzen abgerufen; das bleibt ein Skalierungsproblem. Keine pauschalen `limit()`-Kürzungen einbauen: Sie könnten sichtbare Inhalte oder historische Ergebnisse unterschlagen. Zusätzlich prüfen, ob die PostgREST-Zeilenobergrenze bereits erreicht wird. Das ist ohne aktuelle Zeilenzahlen nicht feststellbar.

Erst wenn die Dienstaufschlüsselung und ein mehrtägiger Verlauf nach Veröffentlichung vorliegen, kann die Ursache abschließend zugeordnet und das Ziel von weniger als 3 GB belastbar bewertet werden.

**8. Live-Prüfung nach erfolgreicher CLI-Anmeldung**

Die Anmeldung und Erreichbarkeit des lokal verknüpften Projekts wurden außerhalb der Sandbox bestätigt; Projektstatus: `ACTIVE_HEALTHY`. Innerhalb der Sandbox konnte die CLI die gespeicherte Anmeldung nicht zuverlässig lesen. Es ist keine erneute Anmeldung des Nutzers erforderlich.

Ausgeführt wurden ausschließlich SELECT-Abfragen über die CLI in `supabase/diagnostics/egress-live-summary.sql` und `supabase/diagnostics/egress-payload-summary.sql`. Sie geben technische Kennungen und Aggregate aus, keine Kinderdaten, Dateipfade, Inhalte oder Zugangsdaten. Die erste Inventarmessung stammt vom 14.11.2026, 22:45 UTC / 23:45 MEZ.

| Live-Befund | Wert |
| --- | ---: |
| PDFs im Bucket `academy-media` | 8 Dateien / 56.957.065 Bytes |
| Größte PDF | 41.838.341 Bytes / 41,84 MB |
| Zuordnung der größten PDF | `media_assets.id = 8`, `lesson_id = 3` |
| Zugriffsvoraussetzungen dieser Lektion | veröffentlicht, manuell freigegeben, veröffentlichte Lernreise, aktives Akademiejahr; individuelle Familien-RLS bleibt erforderlich |
| PNG-Portraits | 2 Dateien / 3.423.606 Bytes insgesamt |
| Größtes PNG-Portrait | 2.173.712 Bytes |
| Zweites PNG-Portrait | 1.249.894 Bytes |
| JPEG-Portrait | 42.037 Bytes |
| Gesamtes Storage-Inventar | 60.422.708 Bytes / 60,42 MB |
| Aktuelle Datenbankgröße laut `pg_database_size` | 17.116.307 Bytes |
| Summe der Zeilen-JSON-Größen der ursprünglichen 26 globalen Tabellen | 357.070 Bytes |

MB sind hier dezimal gerechnet. Das aktuelle Inventar ist keine nachträgliche Messung des Bestands während des gesamten vorherigen Abrechnungszeitraums. Unterschiedliche Messzeitpunkte und Größenbegriffe erklären, weshalb aktuelle Werte nicht direkt den ursprünglich übermittelten Maximal-/Verbrauchswerten entsprechen müssen.

Alle acht PDFs sind aktuell an veröffentlichte, freigegebene Lektionen in einem aktiven Akademiejahr gebunden; die größte Datei ist kein unzugeordnetes Upload-Überbleibsel. Sie macht rund 73,5 % der gespeicherten PDF-Bytes aus.

Die JSON-Messung summiert `octet_length(row_to_json(row)::text)` über alle aktuellen Zeilen der jeweiligen Tabellen. Sie umfasst die Daten aller Konten und Rollen vor RLS-Filterung, enthält keine HTTP-Header und Arraysyntax und misst weder komprimierte Übertragungsbytes noch tatsächlich abgerechneten Egress. Familien erhalten durch RLS typischerweise deutlich weniger Daten. Die Zähler aus `pg_stat_user_tables` enthalten zudem interne RLS-/Funktionszugriffe und sind keine HTTP-Request-Zähler; ihr Statistikzeitraum ist nicht verlässlich auf den Abrechnungsmonat begrenzt.

Rechenbeispiel: 160 vollständige Übertragungen der großen PDF ergeben 6.694.134.560 Bytes bzw. rund 6,69 GB. Das liegt in der Größenordnung des gemeldeten uncached Verbrauchs und erklärt die hohe Priorität dieser Datei. Die Zahl 160 wurde nicht aus Logs ermittelt. Cache-Hits, PDF-Teilabrufe, Zugriffsberechtigungen und tatsächliche Besuchszahlen können den realen Anteil erheblich verändern.

Die historische Egress-Dienstaufteilung und tatsächlichen PDF-Abrufzahlen wurden über die bisher verfügbaren Diagnosezugriffe nicht ausgelesen. Eine Behauptung, die 41,84-MB-PDF erkläre den gesamten Monatsverbrauch, wäre deshalb weiterhin nicht belegt. Die Inventarwerte dieses Abschnitts beziehen sich auf den Zustand vor dem folgenden PDF-Austausch.

**9. Freigegebener PDF-Austausch und Release-Prüfung am 15.11.2026**

Die größte PDF wurde offline als Kopie optimiert. Von 319 Bildobjekten wurden 38 große, zuvor Flate-komprimierte RGB-Bildströme als JPEG mit Qualität 95 und 4:4:4 gespeichert. Pixelabmessungen, vorhandene Farbprofile und separate verlustfreie Transparenzmasken blieben erhalten. Es handelt sich um eine verlustbehaftete Bildkompression; identische Bildbytes werden nicht behauptet. Die PDF wurde zusätzlich linearisiert. Das wiederverwendbare Offline-Werkzeug liegt in `scripts/optimize-lesson-pdf.py`; seine Python-Bibliotheken wurden nur temporär außerhalb der App installiert.

| PDF-Prüfung | Ergebnis |
| --- | --- |
| Originalgröße | 41.838.341 Bytes |
| Optimierte aktive Datei | 13.459.005 Bytes |
| Ersparnis je vollständigem Dateitransfer | 28.379.336 Bytes / 67,83 % |
| Seiten und Lesezeichen | 10 Seiten, 26 Lesezeichen erhalten |
| Strukturvergleich | Seitengröße, Rotation, extrahierbare Texte, Links, Annotationen, Formularwerte und eingebettete Dateien unverändert |
| Darstellungsvergleich aller Seiten bei 144 DPI | Größte mittlere Farbkanalabweichung 0,44111 auf einer Skala 0–255; kein verglichener Farbkanal wich um mehr als 20 ab |
| Sichtprüfung | Alle zehn Seiten als Gegenüberstellung und die Seite mit der größten Abweichung zusätzlich in hoher Auflösung geprüft; Inhalte lesbar, keine sichtbare Layoutänderung |
| Original SHA-256 | `346c76c925bd14d236f98d1e97d8a5ed251af32ec0cbfe2869fe5eddce8981f9` |
| Aktive Datei SHA-256 | `0a8ca133dee90e4a97b5250a0ff8e494b40cc515f19f0b4256ba4c7efbc91a23` |

Die Kopie wurde mit `application/pdf` in denselben weiterhin privaten Bucket hochgeladen. Ein erneuter vollständiger Download bestätigte die Prüfsumme vor der Umstellung. Anschließend wurden mit einer gegen zwischenzeitliche Änderungen abgesicherten Aktualisierung nur `media_assets.storage_path` und `size_bytes` für ID 8 geändert. ID, Titel, Dateiname, Eigentümer, Altersgruppe und Zuordnung zu Lektion 3 blieben erhalten. Die abschließende SELECT-Prüfung bestätigt Dateigröße, Verknüpfung und privaten Bucket. Tabellen oder Sicherheitsregeln wurden nicht geändert.

Das Originalobjekt wurde im privaten Bucket bewusst nicht gelöscht. Die neue Datei belegt vorübergehend zusätzlich 13,46 MB Storage, weit unter dem bisherigen Free-Speicherlimit. Original-PDF, Metadaten, Prüfreport, Austauschbeleg und ein bedingtes `rollback.sql` liegen lokal unter `/private/tmp/ika-egress-pdf-2026-11-15/` mit eingeschränkten Dateirechten. Temporäre lokale Dateien sind keine dauerhafte Sicherung; das erhaltene Originalobjekt in Supabase ermöglicht weiterhin die Rückkehr. Bereits geöffnete Sitzungen können bis zum erneuten Laden noch den alten Dateipfad verwenden.

Nach den kompatiblen Expo-57-Updates wurden alle 14 Egress-Tests, TypeScript, Lint, der Web-Export mit 27 Routen und die Browserprüfung erneut erfolgreich durchgeführt. Expo Doctor meldet 21/21 bestandene Prüfungen. Der Browserablauf bestätigt weiterhin gezielte Quiz-Refreshes, stabile PDF-URLs, verzögertes Laden der Quizdaten, Erhalt bestehender Quizlösungen, getrennte Kontodaten und die Portraitverkleinerung.

Der bestehende Produktionsworkflow veröffentlicht bei Push auf `erweiterung7` nach OVH. Er führt nun auch die 14 Egress-Regressionstests aus. Eine kleine `release.json` im Export enthält ausschließlich den Git-Commit und ermöglicht die öffentliche Prüfung des tatsächlich ausgelieferten Builds ohne GitHub-Zugangsdaten. Die Live-Auslieferung wird nach dem Push separat kontrolliert.

Release-Abhängigkeiten: Expo `57.0.33`, Router `57.0.31`, React Native `0.86.3`; Metro bleibt `0.84.5`. Kompatible Updates beseitigten die kritischen und mehrere hohe Audit-Befunde, unter anderem in `shell-quote`, `node-forge`, `@xmldom/xmldom` und `js-yaml`. `image-size` und der alte UUID-7-Pfad sind nicht mehr installiert. Der erneute `npm audit --omit=dev` enthält sechs Folgeeinträge aus zwei verbleibenden Paketursachen: drei hohe Einträge für den vorhandenen Router-Decoder und drei moderate Einträge für Minimatch. Ein bestandener Build ist kein Nachweis vollständiger Schwachstellenfreiheit.

- `expo-router -> query-string@7.1.3 -> decode-uri-component@0.2.2`: [GHSA-vcc3-ghjq-m6fr](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr) und [GHSA-qr28-fpjm-wq7f](https://github.com/advisories/GHSA-qr28-fpjm-wq7f). Fehlerhaft codierte Eingaben können den Decoder blockieren. Der vorhandene Router verwendet ihn auch im Browser; dies ist kein ausschließliches Build-Problem. Die Produktion ist eine statische Website und betreibt keinen öffentlichen Node-Requesthandler, dennoch bleibt ein möglicher Stillstand des betroffenen Browser-Tabs. Der gepatchte Decoder 0.5.1 ist ESM, der vorhandene Query-String-Code erwartet eine CommonJS-Funktion. Ein einfaches Override wäre inkompatibel. npm schlägt Router 58 vor; dieser SDK-Wechsel wurde nicht ungeprüft vorgenommen. Verantwortlich für die gesonderte Aktualisierung: Repositoryinhaber `hadi-elali`; Neubewertung spätestens 22.11.2026 oder sofort bei einem kompatiblen Expo-57-Fix.
- `expo -> @expo/fingerprint -> minimatch@10.2.6` sowie das TypeScript-ESLint-Tooling: [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249). Betrifft Dateimuster im Build/Tooling; kein öffentlicher Server verarbeitet hier fremde Glob-Muster. Verbleibt bis zu einem kompatiblen Paketfix; kein pauschaler Major-Override oder Expo-Downgrade. Verantwortlich: Repositoryinhaber `hadi-elali`; Neubewertung spätestens 22.11.2026 oder bei einem Upstream-Update. Keine fremden Pull Requests mit Produktions-Secrets bauen.

Rechenbeispiel bei unverändert 160 vollständigen PDF-Übertragungen: rund 2,15 statt 6,69 GB für diese Datei. Die tatsächliche Häufigkeit und der Anteil am Monatsverbrauch sind weiterhin unbekannt. Ein Monatswert unter 3 GB kann erst anhand der Dienstaufschlüsselung und der Verbrauchsentwicklung nach Veröffentlichung bestätigt werden.
