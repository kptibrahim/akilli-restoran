export default function SlugLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1 flex flex-col w-full max-w-[430px] mx-auto relative">
      {children}
    </div>
  );
}
