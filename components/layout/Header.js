
import Logo from "./Logo";
import Navigation from "./Navigation";
import ConnectionStatus from "./ConnectionStatus";
import UserMenu from "./UserMenu";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Logo />

        <Navigation />

      </div>
    </header>
  );
}
