import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Provider } from "./provider";
import { ToastProvider } from "@/components/ui/toast";
import { Toaster } from "@/components/ui/toaster";
import { BugsnagErrorBoundaryWrapper } from "@/components/bugsnag-error-boundary";
import { RealTimeNotificationProvider } from "@/components/providers/RealTimeNotificationProvider";
import { UserProfileProvider } from "@/components/providers/UserProfileProvider";
import { MessageProvider } from "@/components/providers/MessageProvider";
import { SavedJobsProvider } from "@/components/providers/SavedJobsProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Ampertalent - Where Flexible Talent Meets Opportunity",
  description: "The trusted platform connecting talented remote professionals with family-friendly employers. Find vetted remote job opportunities that work around your schedule and family commitments.",
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/icon.png', type: 'image/png' },
    ],
    apple: '/apple-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={inter.className} suppressHydrationWarning>
          <BugsnagErrorBoundaryWrapper>
            <Provider>
              <UserProfileProvider>
                <MessageProvider>
                  <SavedJobsProvider>
                    <ToastProvider>
                      <RealTimeNotificationProvider>
                        {children}
                        <Toaster />
                      </RealTimeNotificationProvider>
                    </ToastProvider>
                  </SavedJobsProvider>
                </MessageProvider>
              </UserProfileProvider>
            </Provider>
          </BugsnagErrorBoundaryWrapper>
        </body>
      </html>
    </ClerkProvider>
  );
}
