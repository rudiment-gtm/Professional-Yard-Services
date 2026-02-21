import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Customer Map | Professional Yard Services',
  description:
    'Internal customer management and mapping tool for Professional Yard Services employees.',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌿</text></svg>',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Prevent indexing since this is an internal tool */}
        <meta name="robots" content="noindex, nofollow" />
      </head>
      <body className="h-full bg-brand-darkest text-brand-text antialiased">
        {children}
      </body>
    </html>
  );
}
