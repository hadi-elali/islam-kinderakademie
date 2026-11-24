import { useRef } from 'react';
import { ScrollView } from 'react-native';

import { LegalPlaceholder } from '@/components/legal-placeholder';
import { PrivacyDocument, PrivacyTitle } from '@/components/privacy-document';
import { PRIVACY_DATE } from '@/constants/privacy';

export default function DatenschutzScreen() {
  const scrollRef = useRef<ScrollView>(null);

  return <LegalPlaceholder
    title="Datenschutzerklärung"
    description={`Informationen zur Verarbeitung Ihrer Daten, zu den eingesetzten Diensten und zu Ihren Rechten. Stand: ${PRIVACY_DATE}.`}
    isPlaceholder={false}
    fields={[]}
    scrollRef={scrollRef}
    documentTitle={<PrivacyTitle />}
    documentContent={<PrivacyDocument scrollRef={scrollRef} />}
  />;
}
