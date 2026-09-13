# LLM- und Agenten-Kontext: Islam-Kinderakademie

Diese Datei ist die zentrale technische Projektdokumentation für alle Coding-LLMs und Agenten. Vor Änderungen am Projekt vollständig lesen. Sie beschreibt den aktuellen Stand, die beabsichtigte Architektur und verbindliche Sicherheitsregeln.

## 1. Produktziel

Die Islam-Kinderakademie ist eine web-first Lernplattform für islamischen Kinderunterricht. Sie verbindet:

- öffentliche Werbung und Erklärung des Angebots,
- geschützte Familien-, Kinder- und Teambereiche,
- Live-Unterricht über externe Zoom-Links,
- kleine interaktive Lerneinheiten,
- Kinderprofile, Zeitgruppen und Lernfortschritt,
- Mitteilungen, Abgaben, Medien und Abzeichen.

Web ist die wichtigste Plattform. Die gemeinsame React-Native-Codebasis soll zusätzlich auf iOS und Android funktionieren.

Das Projekt ist eine funktionierende Supabase-gestützte Lernplattform. Als fachliche Grundstruktur ist das ausdrücklich gelieferte Akademiekonzept 2026/27 hinterlegt; weitergehende Detailinhalte dürfen nicht ohne Auftrag ergänzt werden.

## 2. Technischer Stack

- Expo `~57.0.16`
- Expo Router `~57.0.16`
- React `19.2.3`
- React Native `0.86.2`
- React Native Web `~0.21.0`
- Node.js `24` empfohlen; Expo 57 und Metro 0.84 benötigen mindestens eine unterstützte Version ab Node `22.13.x`. Node 23 ist nicht unterstützt.
- TypeScript mit aktiviertem Strict Mode
- Supabase für Auth, PostgreSQL und privaten Storage
- `@supabase/supabase-js`
- Expo SecureStore für verschlüsselte native Supabase-Sitzungen; AsyncStorage bleibt nur für die einmalige Migration älterer Sitzungen installiert
- `react-native-url-polyfill`
- `@react-native-community/datetimepicker` für native Datums- und Zeitauswahl

Expo hat sich versionsabhängig stark verändert. Vor Expo- oder Expo-Router-Änderungen immer die exakten Expo-57-Dokumente unter `https://docs.expo.dev/versions/v57.0.0/` prüfen.

## 3. Wichtige Kommandos

Im Projektverzeichnis ausführen:

```bash
npm install
npm run web
npm run ios
npm run android
npm run lint
npx tsc --noEmit
npx expo export --platform web
npx expo-doctor@latest
npm audit --omit=dev
```

### Abhängigkeitssicherheit und Release-Audit

`npm audit` zählt einen einzelnen transitiven Befund für jedes davon abhängige Paket erneut. Die am 25. August 2026 ermittelte Ausgangslage von 20 Einträgen besteht deshalb nicht aus 20 unabhängigen Schwachstellen, sondern aus zwei Ursachen:

- Acht hohe Folgeeinträge entstehen durch `image-size@1.2.1` unter Metro `0.84.4`. Die beiden Advisories `GHSA-w3rx-r6r6-pgpr` und `GHSA-5p2g-fcmc-qvqq` betreffen Endlosschleifen beim Parsen präparierter ICNS-, JXL- oder HEIF-Dateien. Der Pfad gehört zum Build-Tooling und nicht zum ausgelieferten App-Bundle.
- Zwölf moderate Folgeeinträge entstehen durch `uuid@7.0.3` unter `@expo/config-plugins -> xcode@3.0.1`. `GHSA-w5hq-g745-h8pq` betrifft nur `uuid.v3()`, `v5()` und `v6()` mit übergebenem Buffer; das installierte `xcode` verwendet ausschließlich `uuid.v4()`.

Vor dem Release zuerst eine unterstützte Node-Version aktivieren und den hohen Metro-Befund ohne React-Native-Abweichung beseitigen:

```bash
nvm install 24
nvm use 24
export PATH="$NVM_BIN:$PATH"
hash -r
command -v node
command -v npm
node -v
npm install --save-dev --save-exact metro@0.84.5
```

`command -v node` und `command -v npm` müssen beide auf einen Pfad unter `~/.nvm/versions/node/v24.../bin/` zeigen; `node -v` muss eine Version `v24.x` melden. Eine bloße Erfolgsmeldung von `nvm use 24` reicht nicht als Nachweis. Zeigt die Shell weiterhin `/opt/homebrew/bin/node` oder `/opt/homebrew/bin/npm`, laufen npm und npx tatsächlich noch mit der nicht unterstützten Node-Version 23. Bis die PATH-Reihenfolge dauerhaft behoben ist, sind `"$NVM_BIN/npm"` und `"$NVM_BIN/npx"` ausdrücklich zu verwenden. `EBADENGINE`-Warnungen mit `current: node v23.3.0` dürfen in einer Release-Installation nicht akzeptiert werden.

Das explizite Metro-Pinning muss die zusammengehörigen Metro-Pakete von `0.84.4` auf `0.84.5` auflösen und `image-size@1.2.1` aus dem Baum entfernen. Danach immer den tatsächlichen Installationsbaum und die Builds prüfen:

```bash
npm ls metro image-size
npm audit --omit=dev
npx expo-doctor@latest
npx tsc --noEmit
npm run lint
npx expo export --platform web
```

Für Expo- und React-Native-Pakete niemals blind `npm audit fix --force` verwenden. Der Audit-Vorschlag kann Expo auf SDK 46 oder `expo-splash-screen` auf Version 55 zurückstufen. Expo-Abhängigkeiten werden mit `npx expo install --fix` an SDK 57 ausgerichtet. React Native bleibt auf der von Expo 57 validierten Version `0.86.2`, bis `npx expo install --check` einen neueren Patch akzeptiert. Metro-Pakete nicht einzeln per `overrides` mischen, da sie intern auf identische Patchstände gekoppelt sind.

Für `uuid` gibt es im aktuellen `xcode@3.0.1`-Pfad keinen kompatiblen transitiven Fix. Ein Override auf UUID 11 oder neuer ist ein ungeprüfter Major-Sprung und deshalb nicht zulässig. Solange der Pfad unverändert bleibt, darf der Befund nach erfolgreichem Build dokumentiert akzeptiert werden. Die Freigabedokumentation muss mindestens Advisory, Abhängigkeitspfad, Build-only-Reichweite, nicht verwendete betroffene API, verantwortliche Person und ein Ablaufdatum enthalten. Aktuelle Neubewertung spätestens am 15. September 2026 oder sofort bei einem Expo-/xcode-Update. Fremde Pull Requests dürfen nicht mit Produktions-Secrets bauen und Build-Assets müssen aus vertrauenswürdigen Quellen stammen.

OVHcloud-Produktion:

- Repository: `Bufib/islam-kinderakademie`
- Produktions-URL: `https://www.bufib-kinder.de/`
- Kanonischer Host: `www.bufib-kinder.de`; die Apex-Domain wird per `.htaccess` umgeleitet.
- OVH-Stammordner: `www/`
- Workflow: `.github/workflows/deploy-ovh.yml`
- Deployment-Branch: `erweiterung5` (ein Push auf diesen Branch prüft, baut und veröffentlicht die aktuelle Web-App per SFTP).
- Der Workflow erwartet die Repository-Secrets `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `EXPO_PUBLIC_HCAPTCHA_SITE_KEY`, `OVH_SFTP_HOST`, `OVH_SFTP_USERNAME`, `OVH_SFTP_PASSWORD` und `OVH_SFTP_PORT`.

Supabase:

```bash
npx supabase migration list --linked
npx supabase db push --dry-run
npx supabase db push
npx supabase db lint --linked --schema public --level warning
```

Migrationen niemals nachträglich verändern, wenn sie bereits remote ausgeführt wurden. Neue Datenbankänderungen gehören immer in eine neue Datei unter `supabase/migrations/`.

## 4. Umgebungsvariablen

Die App erwartet eine lokale `.env` mit:

```env
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
EXPO_PUBLIC_HCAPTCHA_SITE_KEY=
EXPO_PUBLIC_HCAPTCHA_BASE_URL=https://www.bufib-kinder.de
```

Vorlage: `.env.example`.

Verbindliche Regeln:

- Nur den Supabase Publishable Key beziehungsweise alten `anon`-Key im Client verwenden.
- Der hCaptcha-Sitekey ist öffentlich und darf im Client stehen. Der hCaptcha-Secret-Key darf ausschließlich unter **Authentication → Attack Protection → CAPTCHA Protection** im Supabase-Dashboard hinterlegt werden. Nur ein separat gestarteter lokaler Supabase-Auth-Dienst verwendet `SUPABASE_AUTH_CAPTCHA_SECRET`; diese Variable gehört nicht in die App-`.env`.
- Niemals `service_role`, Secret Keys, Datenbankpasswörter oder andere Server-Secrets in Expo-Code oder Git speichern.
- `.env` ist absichtlich über `.gitignore` ausgeschlossen.
- Nach Änderungen an `.env` den Expo-Prozess vollständig neu starten.

## 5. Routing und Zugriffsschutz

Der Einstieg liegt in `src/app/_layout.tsx`.

Öffentliche Routen:

- `/` – reine Werbe-Startseite
- `/login` – Anmeldung
- `/register` – Registrierung
- `/passwort-vergessen` – Passwort-Wiederherstellung
- `/impressum` – öffentliches Impressum mit Anbieter-, Kontakt- und Registerangaben
- `/datenschutz` – öffentlicher, ausdrücklich unvollständiger Datenschutzplatzhalter

Geschützte Routen:

- `/dashboard` – rollenabhängige Übersicht
- `/account` – Kontodaten und Abmelden
- `/lernreisen`
- `/kalender`
- `/islam-pass`
- `/kinder`
- `/mitteilungen`
- `/mitteilung/[id]` – vollständige, geschützte Mitteilungsansicht
- `/curriculum`
- `/lektionen`
- `/lektion-neu`
- `/lektion/[id]`
- `/quiz/[lessonId]` – eigenständiges Multiple-Choice-Quiz für das ausgewählte Kind
- `/quiz-bearbeiten` – Quizverwaltung für Lehrkräfte und Admins
- `/gruppen` – Zeitgruppen, Unterrichtszeiten und Admin-Freigaben
- `/medien`
- `/abzeichen`
- `/abgaben`
- `/konten` – ausschließlich Admins

Die geschützten Seiten sind mit verschachtelten `Stack.Protected`-Bereichen aus Expo Router abgesichert. Nicht angemeldete Nutzer dürfen keine Akademieseite erreichen. Zusätzlich sind Kinder-, Eltern- und Teamrouten nach der aktiven UI-Rolle getrennt.

Wichtig: Clientseitige Protected Routes ersetzen niemals Datenbanksicherheit. Jede Supabase-Tabelle benötigt weiterhin RLS.

## 6. Authentifizierung

Zentrale Dateien:

- `src/lib/supabase.ts` – Supabase-Client
- `src/context/auth-context.tsx` – Sitzung, Profil, Rollen und Auth-Aktionen
- `src/app/login.tsx` – Loginformular
- `src/app/register.tsx` – Registrierung
- `src/app/account.tsx` – Accountanzeige und Abmeldung

Unterstützte Abläufe:

- Registrierung mit Anzeigename, E-Mail, Passwort, Zahlungsart und dem Namen des verwendeten Zahlungskontos
- optionale E-Mail-Bestätigung über Supabase
- Anmeldung mit E-Mail und Passwort
- persistente Sitzung im Browser und auf nativen Geräten
- automatische Wiederherstellung der Sitzung beim Appstart
- Abmelden
- Profilname und Passwort ändern
- Account nach erneuter Passwortbestätigung endgültig löschen
- Passwort-Wiederherstellungslink per E-Mail anfordern
- Fallback auf Metadaten des Auth-Nutzers, falls das Profil nicht geladen werden kann

Auf iOS und Android speichert `src/lib/secure-session-storage.native.ts` die Supabase-Sitzung ausschließlich in kleinen, verschlüsselten Expo-SecureStore-Blöcken. Dadurch werden auch Sessions unterstützt, die für einen einzelnen SecureStore-Wert zu groß sind. Eine bestehende Klartext-Sitzung aus AsyncStorage wird beim ersten Lesen übernommen und anschließend dort gelöscht. Neue oder aktualisierte Session-Tokens dürfen nicht auf AsyncStorage zurückfallen. Der Browser verwendet weiterhin den von `supabase-js` vorgesehenen Web-Storage.

Supabase-hCaptcha bleibt als globaler Auth-Schutz aktiviert. Registrierung, Passwort-Reset und die erneute Passwortbestätigung vor der Accountlöschung senden weiterhin ein frisches `captchaToken`. Ein Token wird nach jedem Auth-Aufruf zurückgesetzt und darf nicht wiederverwendet werden. Web verwendet `@hcaptcha/react-hcaptcha`, iOS und Android verwenden `@hcaptcha/react-native-hcaptcha` über die bereits installierte Expo-WebView.

Der normale Login ist ohne Captcha: `auth-context.tsx` ruft die öffentliche Edge Function `password-login` auf und übernimmt die zurückgegebenen User-Tokens mit `supabase.auth.setSession()`. Die Function erlaubt ausschließlich den Passwort-Grant und verwendet den automatisch bereitgestellten `SUPABASE_SERVICE_ROLE_KEY` nur serverseitig für die CAPTCHA-Ausnahme dieses Auth-Aufrufs. Passwortprüfung, E-Mail-Bestätigung, Kontosperren und Supabase-Auth-Ratenlimits bleiben wirksam. Keine Admin-API, freie Ziel-URL oder fremde Request-Header durchreichen; weder Passwörter noch Tokens loggen. Die Function vor Veröffentlichung des geänderten Clients mit `npx supabase functions deploy password-login` bereitstellen. Der globale CAPTCHA-Schutz darf dafür nicht deaktiviert werden.

Neue und geänderte Passwörter benötigen mindestens 12 Zeichen sowie je einen Kleinbuchstaben, Großbuchstaben, eine Zahl und ein Sonderzeichen. Die Regel liegt zentral in `src/utils/password.ts` und muss im gehosteten Supabase-Projekt unter **Authentication → Password security** identisch konfiguriert bleiben. Clientprüfung allein gilt nicht als Sicherheitsgrenze.

Wiederholte Supabase-Auth-Ereignisse für denselben Nutzer, etwa `SIGNED_IN` oder `TOKEN_REFRESHED` beim Fokuswechsel eines Browser-Tabs, dürfen weder das React-Sessionobjekt ersetzen noch das Profil erneut laden. Dadurch darf die geschützte App beim Zurückwechseln nicht neu rendern oder in den globalen Ladebildschirm springen. Änderungen am Nutzer sowie Abmeldung und Kontowechsel werden weiterhin übernommen.

Der globale Ladebildschirm in `src/app/_layout.tsx` ist nur für die initiale Sitzung beziehungsweise das erste noch nicht vorhandene Profil vorgesehen. Eine spätere Profilaktualisierung läuft mit dem bestehenden Profil im Hintergrund und darf die aktuelle Route nicht ausblenden.

Beim Registrieren schreibt die App `display_name`, `payment_method`, `payment_payer_name` und `payment_accepted` in `user_metadata`. Datenbanktrigger erstellen anschließend:

1. einen Datensatz in `profiles`,
2. einen Datensatz in `user_roles` mit der Rolle `parent`,
3. eine aktive `payment_agreements`-Zahlungsvereinbarung mit dem serverseitig festgelegten Monatsbeitrag von 15,00 Euro.

Der Name des Zahlungskontos ist bei neuen Registrierungen verpflichtend und bezeichnet bei PayPal den PayPal-Kontonamen beziehungsweise bei Banküberweisung den Namen des Kontoinhabers. Es werden keine IBAN, Kontonummern oder PayPal-Zugangsdaten erfasst. Nur Admins dürfen Zahlungsvereinbarungen und Monatszahlungen lesen. Vor Einführung des Feldes angelegte Bestandsvereinbarungen können noch keinen Zahlernamen enthalten.

Die Accountlöschung läuft ausschließlich über die Edge Function `delete-account`. Der Client bestätigt davor E-Mail und Passwort erneut; die Function akzeptiert nur eine höchstens zehn Minuten alte Anmeldung und ermittelt die User-ID aus dem serverseitig validierten Bearer-Token. Beim Löschen wird die Zahlungsvereinbarung vom Auth-Nutzer getrennt, der Zahlername anonymisiert und die Vereinbarung beendet. Die Buchungshistorie bleibt bestehen. Das letzte Admin-Konto kann weder über die App noch direkt über die Auth-Administration gelöscht werden.

Supabase verwaltet eigentliche Auth-Nutzer in `auth.users`. Niemals eine eigene Passworttabelle anlegen.

## 7. Rollenmodell

Datenbankrollen:

- `parent`
- `teacher`
- `admin`

UI-Rollen in `src/types/academy.ts`:

- `parent`
- `team`
- `child`

Zuordnung in `src/context/academy-context.tsx`:

- `parent` → Elternbereich
- `teacher` → Teambereich
- `admin` → standardmäßig Administration; über den Bereichsschalter zusätzlich Elternbereich

Neue Konten sind immer Elternkonten. Ein Adminprofil besitzt in `user_roles` sowohl `parent` als auch `admin`; die Adminrolle ersetzt seine Elternrolle nicht. Lehrkraft- und Adminrollen dürfen nur über eine gesicherte Adminfunktion oder direkt im Supabase-Dashboard vergeben werden. Der Bereichsschalter eines Admins ändert keine Datenbankrolle und darf nicht mit einem frei zugänglichen Rollenwechsel verwechselt werden.

Die Kinderansicht wird vom Elternkonto aus über ein konkretes Kinderprofil geöffnet. Es gibt bewusst keinen eigenen Kinder-Login. Beim Verlassen der Kinderansicht wechselt die App zurück in den Elternbereich. Kinder werden fachlich über `children` einem Elternprofil zugeordnet.

## 8. Supabase-Datenmodell

Alle fachlichen Tabellen verwenden:

- `id bigint generated by default as identity primary key`
- `created_at timestamp without time zone not null default now()`

Ausnahme: absolute Live-Terminzeiten verwenden `timestamp with time zone`, damit Zeitzonen korrekt behandelt werden.

### Accounts

#### `profiles`

- `id`
- `auth_user_id` → `auth.users.id`
- `display_name`
- `avatar_url`
- `created_at`

#### `user_roles`

- `id`
- `profile_id` → `profiles.id`
- `role`
- `created_at`

#### `payment_agreements`

Zahlungsvereinbarung eines registrierten Auth-Kontos mit Zahlungsart, `payer_name`, festem Monatsbeitrag, Zustimmung und Status. Der Zahlername dient der manuellen Zuordnung eingehender PayPal- oder Bankzahlungen im Admin-Dashboard.

#### `monthly_payments`

Monatliche Soll- und Zahlungsstatus einer Zahlungsvereinbarung. Zahlungsdaten sind ausschließlich für Admins lesbar.

### Akademiestruktur

#### `age_groups`

Frei verwaltbare Altersgruppen mit Titel, optionalem Altersbereich und Reihenfolge. Admins pflegen sie im Curriculum. Kinder, Lernreisen und Zeitgruppen referenzieren sie über `age_group_id`; fest codierte Altersgruppenwerte dürfen im Frontend nicht wieder eingeführt werden. Die Lerninhalte werden ausschließlich über die Altersgruppe getrennt. Das historische Feld `date_time` wird nicht mehr für neue Zuordnungen verwendet.

#### `academy_years`

Kurs- beziehungsweise Akademiezeiträume mit Start, Ende und Aktivstatus.

#### `learning_journeys`

Lernreisen sind über das verpflichtende Fremdschlüsselfeld `academy_year_id` genau einem Akademiejahr und über `age_group_id` genau einer Altersgruppe zugeordnet. Die Oberfläche muss diese Zuordnung beim Anlegen vorauswählen, beim Bearbeiten änderbar machen und an der Lernreise sichtbar anzeigen. Außerdem enthält die Tabelle Reihenfolge und Veröffentlichungsstatus.

#### `lessons`

Lektionen innerhalb einer Lernreise. Statuswerte:

- `draft`
- `scheduled`
- `published`
- `archived`

`intro_text` enthält den verpflichtenden Einstieg vor der Live-Vorlesung.

`is_released`, `released_at` und `released_by_profile_id` bilden die manuelle Admin-Freigabe ab. Der fachliche Status `published` allein macht eine Lektion für Familien noch nicht sichtbar. Wird die Lektion wieder zu Entwurf, Planung oder Archiv, sperrt die Datenbank sie und das zugehörige Quiz automatisch.

#### `lesson_steps`

Interaktive Schritte einer Lektion. Typen:

- `start`
- `discover`
- `explain`
- `quiz`
- `challenge`

Strukturierte Schrittinhalte liegen im `jsonb`-Feld `content`. Die Tabelle bleibt für ältere interaktive Einheiten erhalten; der aktuelle Hauptablauf verwendet Einstiegstext, Live-Termin und separates Quiz.

#### `lesson_documents`

Ordnet einer Lektion beliebig viele geordnete PDF-Dateien aus `media_assets` zu. Nur Admins dürfen diese Zuordnungen anlegen, verändern oder entfernen. Familien dürfen Metadaten und Storage-Objekt nur lesen, wenn auch die zugehörige veröffentlichte Lektion manuell freigegeben ist und der Elternaccount über ein Kind mit genehmigter passender Zeitgruppe verfügt. Die Oberfläche zeigt die PDF über eine kurzlebige signierte URL direkt in der Lektion als Reader.

### Multiple-Choice-Quizze

#### `lesson_quizzes`

Pro Lektion kann ein Quiz mit Titel, Beschreibung und Bestehensgrenze angelegt werden. `is_published`, `released_at` und `released_by_profile_id` bilden die separate Admin-Freigabe ab. Sie ist möglich, sobald die zugehörige veröffentlichte Lektion freigegeben ist; der Status von Live-Terminen ist dafür keine Voraussetzung.

#### `quiz_questions` und `quiz_options`

Enthalten geordnete Fragen und jeweils mindestens zwei Antwortmöglichkeiten.

#### `quiz_answer_keys`

Enthält die richtige Antwort und eine optionale Erklärung. Familien können diese Tabelle durch RLS nicht lesen.

#### `quiz_attempts` und `quiz_attempt_answers`

Speichern Versuche, ausgewählte Antworten, Prozentwert und Bestanden-Status. Die Auswertung erfolgt atomar über `submit_multiple_choice_quiz()`; bestandene Quizze schließen den Lektionsfortschritt ab.

### Familien und Zeitgruppen

#### `children`

Kinderprofile eines Elternprofils mit verpflichtendem Geburtsdatum und einer Referenz `age_group_id` auf `age_groups`. Historische Profile ohne Geburtsdatum müssen beim nächsten Bearbeiten vervollständigt werden; neue und geänderte Datensätze werden ohne Geburtsdatum von Frontend und Datenbank abgelehnt.

#### `groups`

Zeitgruppen pro Akademiejahr und Altersgruppe mit `schedule_label`, optional einer Lehrkraft zugeordnet. Pro Altersgruppe können mehrere Zeitgruppen existieren. Zeitgruppen besitzen keine eigenen Lerninhalte; alle Zeitgruppen derselben Altersgruppe verwenden dieselben altersgruppenspezifischen Lernreisen und Lektionen.

#### `group_members`

Zeitgruppenwünsche und genehmigte Zuordnungen zwischen Zeitgruppen und Kindern. Statuswerte:

- `pending` – von einem Elternkonto angefragt
- `approved` – durch einen Admin freigeschaltet und tatsächlich zugeordnet
- `rejected` – durch einen Admin abgelehnt
- `cancelled` – durch einen späteren Zeitgruppenwunsch oder Altersgruppenwechsel beendet

Neue Kinder werden zusammen mit einer verpflichtenden Zeitgruppenanfrage über `save_child_with_time_group_request()` gespeichert. Altersgruppe und passende Lernreisen sind sofort sichtbar. Ein Admin kann die angefragte Zeitgruppe über `review_time_group_request()` freischalten oder das Kind mit `admin_assign_child_time_group()` direkt einer anderen passenden aktiven Zeitgruppe zuweisen. Bei jeder neuen Freischaltung erhält das Elternprofil automatisch eine persönliche Mitteilung. Nur genehmigte Zuordnungen geben Zugriff auf Lektionen, Quizze, gruppenspezifische Termine, Zoom-Links und Mitteilungen.

### Live-Unterricht

#### `live_sessions`

Zoom- oder andere Live-Termine pro Lektion und optional pro Zeitgruppe. Enthält:

- `starts_at` und `ends_at` als `timestamp with time zone`
- `meeting_url`
- `replay_url`
- Status `scheduled`, `live`, `completed` oder `cancelled`

Die App erstellt derzeit keine Zoom-Meetings über die Zoom API und bettet keinen Zoom-Client ein. Ein Admin plant das echte Meeting außerhalb der App in Zoom und trägt ausschließlich den Teilnehmerlink im Feld `meeting_url` des Lektionseditors ein. Familien öffnen diesen externen Link aus der geschützten Lektionsansicht. Niemals Host-Key, Zoom-Kontopasswort oder andere Zoom-Secrets im Frontend beziehungsweise in `meeting_url` speichern. Ein im Teilnehmerlink codierter Meeting-Passcode ist davon nicht betroffen.

Die Terminstatus werden im Kalender manuell gepflegt und sind unabhängig von der Quizfreigabe. Eine spätere automatische Meeting-Erstellung benötigt eine serverseitige Zoom-OAuth-/Meetings-API-Integration, beispielsweise über eine geschützte Supabase Edge Function; Zoom-Secrets dürfen dabei nicht in den Expo-Client gelangen.

In der Oberfläche werden Terminzeiten nicht als kombinierter ISO-Text eingegeben. Web verwendet ein Kalenderfeld und native Uhrzeitfelder; iOS und Android verwenden den nativen DateTimePicker. Ein Live-Termin hat ein gemeinsames Datum sowie getrennte Felder für Beginn und Ende. Vor dem Schreiben werden diese lokalen Werte wieder in ISO-Zeitpunkte umgewandelt.

Meeting-URLs dürfen nur für berechtigte Zeitgruppen beziehungsweise Mitarbeitende lesbar sein.

### Fortschritt und Interaktion

#### `child_lesson_progress`

Fortschritt eines Kindes pro Lektion mit Status und Prozentwert.

#### `child_step_progress`

Abgeschlossene einzelne Lernschritte.

#### `submissions`

Abgaben eines Kindes. Typen:

- `confirmation`
- `text`
- `audio`
- `image`

Dateien selbst gehören in Supabase Storage; die Tabelle speichert nur den Pfad. Die aktuelle Lernoberfläche unterstützt Textantworten und Bestätigungen. Audio- und Bildabgaben sind im Schema vorbereitet, aber noch nicht Teil der UI.

#### `badges`

Definition verfügbarer Abzeichen.

#### `child_badges`

Einem Kind verliehene Abzeichen.

### Medien und Kommunikation

#### `media_assets`

Metadaten für Bilder, Audio, Video oder Dokumente. Die eigentlichen Dateien liegen im privaten Storage-Bucket `academy-media`. Allgemeine Medien bleiben für das Akademieteam sichtbar. An `lesson_documents` gebundene PDFs dürfen nur von Admins verändert oder gelöscht werden; berechtigte Familien erhalten ausschließlich Lesezugriff über die Freigaberegeln der Lektion.

#### `messages`

Mitteilungen an alle, an ein bestimmtes Profil oder an eine Zeitgruppe. Beim erstmaligen Wechsel einer Zeitgruppenzuordnung auf `approved` erzeugt die Datenbank automatisch eine veröffentlichte persönliche Mitteilung für das Elternprofil des Kindes.

#### `message_reads`

Personenbezogene Lesebestätigungen für Mitteilungen. Pro Profil und Mitteilung existiert höchstens ein Datensatz. Familien sehen ausschließlich ihre eigenen Lesebestätigungen; eine Bestätigung darf nur für eine Mitteilung angelegt werden, die das Profil durch die Mitteilungs-RLS tatsächlich lesen kann.

#### `message_email_deliveries`

Privates, ausschließlich serverseitig zugängliches Versandprotokoll für Brevo-E-Mail-Hinweise. Pro Mitteilung und Empfängerprofil existiert höchstens ein Datensatz. Die Edge Function `send-message-email` ermittelt Empfänger über eine nur für `service_role` freigegebene Datenbankfunktion, versendet keinen vollständigen Nachrichtentext und verhindert über atomare Versandansprüche doppelte E-Mails. `BREVO_API_KEY`, Absenderdaten und `MESSAGE_EMAIL_WEBHOOK_SECRET` gehören ausschließlich in die Supabase-Function-Secrets.

### Beziehungen

```text
auth.users
  └── profiles
        ├── user_roles
        └── children
              ├── group_members ── groups
              ├── child_lesson_progress
              ├── child_step_progress
              ├── submissions
              └── child_badges ── badges

academy_years
  ├── groups
  └── learning_journeys
        └── lessons
              ├── lesson_steps
              ├── lesson_documents ── media_assets
              ├── live_sessions
              ├── lesson_quizzes
              │     ├── quiz_questions ── quiz_options
              │     └── quiz_attempts ── quiz_attempt_answers
              ├── child_lesson_progress
              └── submissions

age_groups
  ├── children
  ├── groups
  └── learning_journeys
```

## 9. RLS- und Sicherheitsmodell

Die RLS-Regeln liegen in:

- `supabase/migrations/20260814050100_academy_row_level_security.sql`

Grundprinzipien:

- Anonyme Besucher haben keinen Zugriff auf Akademietabellen.
- Eltern sehen und verändern nur ihre eigenen Kinderprofile und deren Fortschritt beziehungsweise Abgaben.
- Eltern sehen sofort die aktiven, veröffentlichten Lernreisen der Altersgruppe; deren Lektionen und Quizze erst bei mindestens einer genehmigten Zeitgruppe des Kindes im passenden aktiven Akademiejahr.
- Eltern sehen Zeitgruppentermine und Mitteilungen nur für freigeschaltete Zeitgruppen.
- Lehrkräfte und Admins gelten als Akademieteam und können fachliche Inhalte verwalten.
- Nur Admins dürfen Rollen verändern.
- Die öffentliche Werbeseite liest keine geschützten Daten.

Zentrale RLS-Helfer:

- `current_profile_id()`
- `has_account_role(role)`
- `is_academy_staff()`
- `owns_child(child_id)`
- `can_access_group(group_id)`
- `can_child_access_lesson(child_id, lesson_id)`
- `can_child_access_lesson_step(child_id, lesson_step_id)`
- `can_child_access_quiz(child_id, quiz_id)`
- `save_child_with_time_group_request(...)`
- `review_time_group_request(group_member_id, decision)`
- `list_admin_accounts()`
- `set_profile_primary_role(profile_id, role)`
- `save_multiple_choice_quiz(...)`
- `submit_multiple_choice_quiz(...)`

RLS niemals zur Behebung eines Clientfehlers deaktivieren. Stattdessen Policy, Rolle und Abfrage gezielt prüfen.

## 10. Supabase-Migrationen

Aktueller relevanter Stand:

- `20260814015644_initial_academy_schema.sql` – historisch bereits leer ausgeführt
- `20260814050000_academy_learning_schema.sql` – Accountabgleich, Tabellen, Beziehungen, Indizes und Funktionen
- `20260814050100_academy_row_level_security.sql` – RLS-Policies und Grants
- `20260814061000_academy_media_storage.sql` – privater Medien-Bucket und Storage-Policies
- `20260814062000_ensure_account_profiles.sql` – Backfill und sichere Reparatur fehlender Auth-Profile
- `20260814063000_example_academy_data.sql` – historischer Beispiel-Seed ohne Auth-Nutzer
- `20260814064000_admin_account_management.sql` – Admin-Kontenübersicht und atomare Rollenwechsel
- `20260814065000_academy_2026_27_curriculum.sql` – entfernt den Beispiel-Seed und legt das echte Curriculum 2026/27 mit vier Lernreisen und 40 Wochen pro Altersgruppe an
- `20260814070000_lesson_live_quizzes.sql` – Einstiegstexte, normalisierte Multiple-Choice-Quizze, Versuche, RLS und serverseitige Auswertung
- `20260815080000_manual_lesson_quiz_release.sql` – getrennte manuelle Admin-Freigaben für Lektion und Quiz
- `20260815100000_dynamic_age_groups.sql` – frei verwaltbare Altersgruppen und Fremdschlüssel für Kinder, Zeitgruppen und Lernreisen
- `20260821090000_payment_payer_names.sql` – Zahlungsvereinbarungen, verpflichtender Zahlername bei neuen Registrierungen und Admin-Leserechte
- `20260821110000_time_group_approval.sql` – mehrere Zeitgruppen je Altersgruppe, verpflichtende Zeitgruppenanfragen, Admin-Freigabe und altersgruppenkonsistente Termine
- `20260821113000_time_group_age_integrity.sql` – schützt Altersgruppe und Akademiejahr verwendeter Zeitgruppen, Lernreisen und Termine vor widersprüchlichen Änderungen
- `20260821114500_time_group_request_serialization.sql` – serialisiert parallele Elternänderungen und Admin-Entscheidungen pro Kind und sperrt Freigaben in inaktiven Akademiejahren
- `20260821121500_approved_time_group_content_access.sql` – Lernreisen bleiben sichtbar, während Lektionen, Quizze, Live-Inhalte und neue Fortschrittsdaten bis zur genehmigten Zeitgruppe gesperrt sind
- `20260821123500_admin_assign_child_time_group.sql` – Admins können Kinder direkt und atomar einer passenden aktiven Zeitgruppe zuweisen oder zwischen solchen Zeitgruppen verschieben
- `20260821125500_admin_parent_accounts.sql` – Adminprofile behalten zusätzlich die Elternrolle und können im getrennten Elternbereich ausschließlich ihre eigenen Kinder verwalten
- `20260821131500_lesson_pdf_documents.sql` – mehrere geschützte PDF-Dokumente pro Lektion, Adminverwaltung und eingebetteter Reader für berechtigte Familien
- `20260823100000_remove_completed_session_quiz_release_requirement.sql` – Quizfreigaben setzen nur noch eine freigegebene veröffentlichte Lektion voraus und sind unabhängig vom Live-Terminstatus
- `20260823103000_require_child_birth_date.sql` – verpflichtendes Geburtsdatum für neue und geänderte Kinderprofile ohne erfundene Backfill-Daten
- `20260823110000_notify_parent_on_time_group_approval.sql` – automatische persönliche Elternmitteilung bei einer neuen Zeitgruppenfreischaltung
- `20260823120000_harden_account_deletion.sql` – sichere Accountlöschung mit Schutz des letzten Admins sowie Anonymisierung und Erhalt der Zahlungshistorie
- `20260823121000_bind_learning_writes_to_lessons.sql` – bindet Quizversuche, Fortschritt und Abgaben an die konkret freigegebene Lektion, Altersgruppe und das Akademiejahr

Alle genannten Migrationen sind auf dem aktuell verknüpften Supabase-Projekt ausgeführt. Remote-Schema-Lint war danach fehlerfrei.

Noch lokal anzuwenden: `20260909120000_message_read_receipts.sql` ergänzt den personenbezogenen Lesestatus für zugängliche Mitteilungen mit eigener RLS. `20260909130000_message_email_delivery.sql` ergänzt das private Brevo-Versandprotokoll und die nur serverseitig aufrufbare Empfängerermittlung.

Weitere Seeds oder fachliche Beispieldaten nur auf ausdrücklichen Auftrag anlegen.

## 11. Aktueller Funktionsstand

Bereits funktional umgesetzt:

- responsive öffentliche Werbe-Startseite
- Registrierung und Login über Supabase
- persistente Sitzung
- E-Mail-Bestätigungsablauf
- Protected Routes nach Anmeldung und UI-Rolle
- rollenabhängiger Eltern-, Kinder- und Teambereich
- Accountansicht, Profilbearbeitung, Passwortänderung, sichere Accountlöschung und Abmelden
- Passwort-Wiederherstellung per Supabase-E-Mail
- vollständiges leeres Datenbankschema mit RLS
- responsive App-Shell für Web und Mobile
- CRUD für Kinderprofile, Akademiejahre, Lernreisen, Lektionen, Zeitgruppen und Live-Termine
- verpflichtendes Geburtsdatum sowie verpflichtende Auswahl einer zur Altersgruppe passenden Zeitgruppe beim Anlegen oder Bearbeiten eines Kindes; nach der Anfrage weist eine Bestätigung auf die noch ausstehende Admin-Freischaltung hin
- mehrere Zeitgruppen teilen die Inhalte ihrer Altersgruppe, während Inhalte verschiedener Altersgruppen getrennt bleiben
- Admins können bei offenen Zeitgruppenanfragen die angefragte Gruppe freischalten, die Anfrage ablehnen oder das Kind direkt einer anderen passenden aktiven Zeitgruppe zuweisen
- Admin-CRUD für frei verwaltbare Altersgruppen im Curriculum
- anklickbare Akademiejahre im Curriculum; beim Einstieg ist kein Jahr vorausgewählt und Lernreisen bleiben verborgen, bis ein Jahr bewusst geöffnet wurde. Danach werden sie nach geöffnetem Jahr und gewählter Altersgruppe gefiltert und direkt dort bearbeitet
- Lektionseditor für Einstiegstext, mehrere Admin-PDFs, geplanten Live-Zoom-Termin und separates Multiple-Choice-Quiz
- kalendergestützte Datumswahl und getrennte Start-/Endzeit für Zoom-Termine auf Web, iOS und Android
- klar sichtbare Admin-Freigabe direkt im Lektionseditor und in der Lektionsübersicht
- Lektionsübersicht bildet die verpflichtende Hierarchie Akademiejahr → Lernreise → Lektion sichtbar ab und sortiert innerhalb der Lernreise nach `lessons.position`; filterbar nach Akademiejahr, Altersgruppe, Lernreise, Status und Suchtext
- Lernreisen sind in der Lektionsübersicht standardmäßig kompakt. Ein Chevron in jeder Lernreise-Kopfzeile blendet alle zugehörigen Lektionen gemeinsam ein oder aus. Innerhalb einer geöffneten Lernreise zeigt jede Lektion zunächst eine kompakte Zusammenfassung; ihr eigener Chevron öffnet Beschreibung, Freigaben sowie Bearbeiten-/Löschen-Aktionen
- Admin-Sammelfreigabe für alle aktuell gefilterten oder alle in einer Lernreise enthaltenen, veröffentlichten und noch gesperrten Lektionen. Entwürfe dürfen dabei nicht automatisch veröffentlicht werden
- Quiz-Editor mit beliebig vielen Fragen und Antwortmöglichkeiten, genau einer richtigen Antwort und einstellbarer Bestehensgrenze
- geschützte Quizseite für Kinder mit serverseitiger Auswertung und Wiederholungsversuchen
- Fortschritt pro Schritt und Lektion
- Textantworten und Challenge-Bestätigungen
- extern erstellte Zoom-Teilnehmerlinks und Replay-Links aus Supabase; keine automatische Zoom-Meeting-Erstellung und kein eingebetteter Zoom-Client
- Mitteilungen an alle, einzelne Profile oder Zeitgruppen
- automatische persönliche Mitteilung an das Elternkonto, sobald ein Kind für eine Zeitgruppe freigeschaltet wurde
- kompakte Mitteilungsübersicht mit Titel/erstem Satz und separater Detailansicht
- blauer Ungelesen-Hinweis in Desktop-, Mobil- und Kopfnavigation sowie hervorgehobene ungelesene Mitteilungen; der Status wird beim Öffnen profilbezogen gespeichert
- transaktionale Brevo-E-Mail-Hinweise bei neu veröffentlichten Mitteilungen über eine mit Shared Secret geschützte Datenbank-Webhook-Function; Empfänger werden für alle Familien, persönliche Profile und genehmigte Zeitgruppen serverseitig dedupliziert
- Abzeichenverwaltung und persönliche Verleihung
- Abgabenübersicht für das Akademieteam
- private Medien-Uploads, signierte Download-Links und Löschung in Supabase Storage
- geschützte PDF-Reader innerhalb freigegebener Lektionen mit mehreren auswählbaren Dokumenten
- datengetriebene Eltern-, Kinder- und Team-Dashboards
- separates Admin-Dashboard mit Systemkennzahlen und Admin-Schnellzugriffen
- durchsuchbare Themen- und Quizverwaltung im Admin-Dashboard mit direktem Einstieg in die Lektionsbearbeitung sowie das Anlegen und Bearbeiten von Multiple-Choice-Fragen
- geschützte Kontenübersicht mit E-Mail-Adressen und Rollenverwaltung
- verpflichtende Zahlungsart und Zahlername bei der Registrierung sowie geschützte Zahlungsübersicht im Admin-Dashboard

Noch nicht umgesetzt beziehungsweise bewusst auf später verschoben:

- ausformulierte Unterrichtsinhalte für die vorhandenen Themen- und Schrittgerüste
- Audio- und Bildabgaben aus Lernschritten
- Push-Benachrichtigungen
- automatische Erstellung oder Änderung von Zoom-Meetings über die Zoom API

## 12. Frontend-Struktur

```text
src/
  app/
    _layout.tsx            Root-Stack und Protected Routes
    index.tsx              öffentliche Werbe-Startseite
    login.tsx              Anmeldung
    register.tsx           Registrierung
    dashboard.tsx          rollenabhängiges Dashboard
    account.tsx            Account und Abmelden
    lektion/[id].tsx       Kinder-Lektion und Interaktionen
    ...                    fachliche Akademieseiten
  components/
    app-shell.tsx          Sidebar, Topbar und Mobilnavigation
    brand-mark.tsx         Markenlogo
    auth/                  gemeinsame Auth-UI
    dashboards/            Eltern-, Kinder- und Teamübersichten
    ui/                    Icons und UI-Primitives
  constants/
    design.ts              Farben, Abstände, Radien und Breakpoints
  context/
    auth-context.tsx       Supabase-Sitzung und Accountprofil
    academy-context.tsx    Zuordnung der Accountrolle und Kinderprofil-Auswahl
    academy-data-context.tsx gemeinsamer Datenzustand und Aktualisierung
  lib/
    supabase.ts            Supabase-Clientkonfiguration
    academy-api.ts         Abfragen, CRUD, Lernfortschritt und Storage
  types/
    academy.ts             fachliche TypeScript-Modelle
    database.ts            Zeilentypen des Supabase-Datenmodells
  utils/
    auth-errors.ts         deutsche Auth-Fehlermeldungen
```

## 13. Design- und UX-Regeln

- Sprache der Oberfläche ist Deutsch.
- Web-first und responsive entwickeln; native Kompatibilität erhalten.
- Die gemeinsamen Breakpoints liegen in `src/constants/design.ts`: Unter `620 px` gelten kompakte Smartphone-Abstände, unter `1024 px` verwendet die geschützte App die Mobilnavigation und unter `1200 px` werden breite Inhalts-Spalten untereinander angeordnet.
- Keine Bildschirmbreite darf über feste Geräteprofile wie „iPhone 12“ behandelt werden. Layouts müssen fließend von kleinen Smartphones über Tablets bis zu großen Desktopfenstern funktionieren.
- Horizontale Inhaltsbereiche müssen umbrechen oder untereinander wechseln. Karten, Eingaben, Textblöcke und Aktionsleisten erhalten auf schmalen Ansichten `minWidth: 0` beziehungsweise höchstens `100%` Breite; feste Mindestbreiten benötigen immer eine kompakte Überschreibung.
- Bestehende Farbpalette und Komponenten aus `src/constants/design.ts` und `src/components/ui/` wiederverwenden.
- Öffentliche Seiten dürfen die interne App-Shell nicht anzeigen.
- Geschützte Seiten verwenden die gemeinsame App-Shell.
- Leere Bereiche als klare Empty States darstellen, keine erfundenen Kursdaten einfügen.
- Eltern dürfen niemals durch einen Client-Schalter in die Teamrolle wechseln.
- Zoom-Links und Kinderdaten nie auf öffentlichen Routen rendern.

## 14. Vorgehen bei neuen Features

Bei jeder Erweiterung:

1. Prüfen, welcher Nutzer und welche Rolle das Feature verwenden darf.
2. Vorhandene Tabellen und RLS-Policies prüfen.
3. Datenbankänderungen ausschließlich als neue Migration erstellen.
4. Supabase-Abfragen in eine klar abgegrenzte Datenzugriffsschicht auslagern.
5. Lade-, Leer- und Fehlerzustände umsetzen.
6. Keine echten Secrets oder Service-Role-Clients im Frontend verwenden.
7. Web sowie sinnvolle mobile Breakpoints prüfen.
8. TypeScript, Lint und Web-Export ausführen.

Abschlussprüfungen:

```bash
npx tsc --noEmit
npm run lint
npx expo export --platform web
git diff --check
```
