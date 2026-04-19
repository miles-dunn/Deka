import type { Metadata } from "next";
import { IBM_Plex_Mono, Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../hooks/useAuth";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body"
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display"
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["500"]
});

export const metadata: Metadata = {
  title: "Deka",
  description: "Premium real-time AI voice translation for natural conversations across language barriers."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${spaceGrotesk.variable} ${ibmPlexMono.variable}`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
