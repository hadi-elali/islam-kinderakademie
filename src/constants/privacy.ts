export const PRIVACY_VERSION = '2026-11-23.1';
export const PRIVACY_DATE = '23. November 2026';

export const CAPTCHA_CONSENT_TEXT =
  'Ich willige ein, dass hCaptcha von Intuition Machines, Inc., USA, für diese geöffnete Seite bzw. App-Sitzung geladen wird. Der Dienst verarbeitet zur Bot-Prüfung IP-Adresse, Browser- und Gerätedaten, Interaktionen und Aufgabenantworten und kann Cookies bis zu 30 Tage speichern oder auslesen. Nach Anbieterangaben können nicht einer Person zugeordnete Aufgabenantworten auch zum Training maschineller Lernverfahren dienen. Eine Verarbeitung in den USA ist möglich. Ich willige ausdrücklich auch in die Verarbeitung dabei möglicherweise erkennbarer religiöser oder weltanschaulicher Informationen durch den Besuch dieser Akademieseite ein (Art. 6 Abs. 1 Buchst. a und Art. 9 Abs. 2 Buchst. a DSGVO sowie § 25 Abs. 1 TDDDG). Ich kann hier, in meinem Konto oder unter Datenschutz jederzeit für die Zukunft widerrufen. Ohne diese Einwilligung kann ich mein Kontoanliegen über info@bufib.de erledigen; die Teilnahme am Unterricht hängt nicht von ihr ab.';

export const GUARDIAN_CONSENT_TEXT =
  'Ich bin volljährig und für die Kinder, die ich diesem Familienkonto zuordne, sorgeberechtigt oder wirksam zur Abgabe dieser Erklärungen bevollmächtigt. Erforderliche weitere Zustimmungen liegen vor; die eigenen Rechte und eine erforderliche eigene Entscheidung des Kindes werden berücksichtigt.';

export const CHILD_DATA_CONSENT_TEXT =
  'Ich willige ausdrücklich ein, dass der Bund für islamische Bildung e. V. für die von mir diesem Familienkonto zugeordneten Kinder Name, Geburtsdatum, Elternzuordnung, Alters- und Unterrichtsgruppe sowie Lernschritte, Quizantworten und Ergebnisse, Textabgaben und Abzeichen zur Unterrichtsorganisation und persönlichen Lernbegleitung verarbeitet. Meine ausdrückliche Einwilligung umfasst auch dabei möglicherweise erkennbare religiöse oder weltanschauliche Überzeugungen (Art. 6 Abs. 1 Buchst. a und Art. 9 Abs. 2 Buchst. a DSGVO). Berechtigte Eltern, zuständige Lehrkräfte und Administratoren sowie die in der Datenschutzerklärung genannten technischen Dienste erhalten die dort beschriebenen Zugriffe. Die Daten werden nur für die dort erläuterten Zwecke und Aufbewahrungszeiträume verarbeitet. Ich kann diese Einwilligung jederzeit in meinem Konto oder über info@bufib.de mit Wirkung für die Zukunft widerrufen. Ohne diese Grundlage können die personenbezogenen Kinder- und Lernfunktionen nicht bereitgestellt werden. Eine Unterrichtsaufnahme ist damit nicht erlaubt.';

export const RECORDING_CONSENT_TEXT =
  'Zusätzlich und freiwillig willige ich ein, dass die von mir diesem Familienkonto zugeordneten Kinder in ursprünglichen Zoom-Aufnahmen ihres gebuchten Unterrichts mit Bild, Stimme, angezeigtem Namen und im Aufnahmebild oder -ton enthaltenen Beiträgen erfasst werden dürfen. Dies dient ausschließlich dem Schnitt einer Wiederholungsfassung ohne identifizierbare Kinderdaten. Ich willige ausdrücklich auch in die Verarbeitung dabei möglicherweise erkennbarer religiöser oder weltanschaulicher Informationen ein (Art. 6 Abs. 1 Buchst. a und Art. 9 Abs. 2 Buchst. a DSGVO). Zugriff auf Originale haben nur die berechtigten Aufnahme- und Bearbeitungspersonen und erforderlichen technischen Dienste. Originale und personenbezogene Bearbeitungskopien werden nach fertigem Schnitt und Kontrolle unverzüglich gelöscht. Bei YouTube wird ausschließlich die bereinigte Fassung ohne erkennbare Kinder als „Nicht gelistet“ bereitgestellt; jeder mit dem Link kann sie ansehen. Diese Fassung wird spätestens mit Ende des zugehörigen Unterrichtsjahres gelöscht. Meine Entscheidung ist unabhängig vom Beitrag und den Kinderprofilen. Bei Ablehnung oder Widerruf muss eine Teilnahme ohne personenbezogene Aufnahme möglich bleiben. Ich kann jederzeit in meinem Konto oder über info@bufib.de für die Zukunft widerrufen; eine Veröffentlichung erkennbarer Kinder ist durch diese Erklärung nicht erlaubt.';

export type PrivacyChoices = {
  guardianConfirmed: boolean;
  childDataGranted: boolean;
  recordingGranted: boolean;
};

export type PrivacyState = {
  policy_version: string;
  child_data_granted: boolean;
  recording_granted: boolean;
  child_data_recorded_at: string | null;
  recording_recorded_at: string | null;
};
