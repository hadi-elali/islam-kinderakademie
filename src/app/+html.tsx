import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

// The academy's public and signed-in pages are written in German.
export default function RootHtml({ children }: PropsWithChildren) {
  return <html lang="de">
    <head>
      <meta charSet="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <ScrollViewStyleReset />
    </head>
    <body>{children}</body>
  </html>;
}
