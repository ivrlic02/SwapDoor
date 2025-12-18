export default function UserMenuLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <section >
      
      <main>
        {children}
      </main>
    </section>
  );
}