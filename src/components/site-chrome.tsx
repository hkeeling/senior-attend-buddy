import { Link } from "@tanstack/react-router";

/*
 * Howard University masthead and footer, after howard.edu: a Dark Midnight
 * Blue bar with the university name at left and a crimson rule beneath it.
 *
 * The brand guide asks for the official clock tower logo (from the Office of
 * University Communications) at the left of the masthead, linking to
 * howard.edu. Until that file is added, a type-only wordmark stands in and a
 * separate howard.edu link sits in the header, as the guide allows.
 */
export function SiteHeader() {
  return (
    <header className="bg-brand-navy text-white">
      <div className="bg-brand-navy-dark">
        <div className="mx-auto flex max-w-5xl items-center justify-end gap-5 px-5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">
          <a href="https://howard.edu" className="hover:text-white">
            howard.edu
          </a>
          <a href="https://howard.edu/accessibility-statement" className="hover:text-white">
            Accessibility
          </a>
        </div>
      </div>
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-5 py-4">
        <Link to="/" className="flex items-center gap-4">
          <span className="font-display text-xl leading-none tracking-[0.06em] text-white sm:text-2xl">
            HOWARD
            <span className="block text-[0.62em] tracking-[0.32em]">UNIVERSITY</span>
          </span>
          <span className="h-9 w-px bg-white/30" aria-hidden="true" />
          <span className="text-sm font-semibold leading-tight text-white/90">
            Senior Project
            <span className="block text-xs font-normal text-white/70">Attendance</span>
          </span>
        </Link>
      </div>
      <div className="h-1 bg-brand-red" />
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-brand-navy text-white/80">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-5 py-8 text-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <a
            href="https://howard.edu"
            className="font-display text-lg tracking-[0.06em] text-white"
          >
            HOWARD UNIVERSITY
          </a>
          <p className="mt-1 text-xs leading-relaxed">2400 Sixth Street NW, Washington, DC 20059</p>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-1 text-xs font-semibold uppercase tracking-[0.14em]">
          <a href="https://howard.edu" className="hover:text-white">
            Howard
          </a>
          <a href="https://howard.edu/accessibility-statement" className="hover:text-white">
            Web Accessibility Support
          </a>
          <a href="https://howard.edu/privacy" className="hover:text-white">
            Privacy &amp; Security
          </a>
        </nav>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-5xl px-5 py-3 text-[11px] text-white/60">
          © {new Date().getFullYear()} Howard University
        </p>
      </div>
    </footer>
  );
}
