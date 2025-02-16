export default function Header() {
  return (
    <header className="fixed top-0 z-10 flex h-18 w-full border-b bg-white shadow-xs">
      <nav className="flex h-full w-full items-center justify-between gap-4 px-8 sm:px-16">
        <img src="/vite.svg" alt="Vite" className="size-10" />
      </nav>
    </header>
  );
}
