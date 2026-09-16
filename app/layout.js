import "./globals.css";
import AppShell from "@/components/layout/AppShell";

export const metadata = {
  title: "Meta Manager",
  description: "BigCommerce Metadata Manager",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

