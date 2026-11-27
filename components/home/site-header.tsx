"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { Button } from "@/components/ui/button";

import { BrandMark } from "./brand-mark";
import { ArrowRightIcon, ChevronDownIcon } from "./icons";
import {
  currentPage,
  destinationHref,
  functionalityPages,
  headerCta,
  sectionHref,
  type MarketingSection,
} from "./navigation";
import { container, primaryButtonSmall } from "./styles";

type SiteHeaderProps = {
  /** Read once by the marketing layout; the header only decides where links go. */
  isSignedIn: boolean;
};

export function SiteHeader({ isSignedIn }: SiteHeaderProps) {
  const pathname = usePathname();
  const activePage = currentPage(pathname);
  const cta = headerCta(pathname);

  // Only one desktop dropdown and one mobile panel can be open at a time.
  const [openId, setOpenId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const headerRef = useRef<HTMLElement>(null);
  const triggerRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const linkRefs = useRef<Record<string, (HTMLAnchorElement | null)[]>>({});

  useEffect(() => {
    if (!openId && !mobileOpen) return;

    function closeOnOutsideClick(event: PointerEvent) {
      if (!headerRef.current?.contains(event.target as Node)) {
        setOpenId(null);
        setMobileOpen(false);
        setMobileExpanded(null);
      }
    }

    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [openId, mobileOpen]);

  function close(id: string, restoreFocus = false) {
    setOpenId(null);
    if (restoreFocus) triggerRefs.current[id]?.focus();
  }

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>, id: string) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpenId(id);
      // Focus after the menu is in the DOM.
      requestAnimationFrame(() => linkRefs.current[id]?.[0]?.focus());
    } else if (event.key === "Escape" && openId === id) {
      event.preventDefault();
      close(id);
    }
  }

  function onLinkKeyDown(
    event: KeyboardEvent<HTMLAnchorElement>,
    id: string,
    index: number,
    links: readonly MarketingSection[],
  ) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const next =
        (index + (event.key === "ArrowDown" ? 1 : -1) + links.length) % links.length;
      linkRefs.current[id]?.[next]?.focus();
    } else if (event.key === "Escape") {
      event.preventDefault();
      close(id, true);
    } else if (event.key === "Tab") {
      close(id);
    }
  }

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-40 border-b border-border-default bg-surface-tint/95 font-sans backdrop-blur"
    >
      <div className={`${container} flex min-h-20 items-center justify-between gap-4 py-2`}>
        <BrandMark />

        <nav aria-label="Navegación principal" className="hidden items-center gap-1 lg:flex">
          {functionalityPages.map((page) => {
            const isOpen = openId === page.id;
            const isCurrent = activePage?.id === page.id;

            return (
              <div key={page.id} className="relative">
                <Button variant="ghost" size="md"
                  type="button"
                  ref={(node) => {
                    triggerRefs.current[page.id] = node;
                  }}
                  aria-expanded={isOpen}
                  aria-controls={`nav-${page.id}`}
                  aria-haspopup="true"
                  onClick={() => setOpenId(isOpen ? null : page.id)}
                  onKeyDown={(event) => onTriggerKeyDown(event, page.id)}
                  className={`inline-flex! min-h-11! items-center! gap-1.5! rounded-lg! px-3! text-sm! font-medium! transition-colors! focus-visible:outline-2! focus-visible:outline-offset-2! focus-visible:outline-focus! ${
                    isCurrent || isOpen
                      ? "bg-action-tonal! text-link! hover:bg-action-tonal!"
                      : "text-fg-muted! hover:bg-surface! hover:text-link!"
                  }`}
                >
                  {page.label}
                  <ChevronDownIcon
                    className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </Button>

                {isOpen ? (
                  <ul
                    id={`nav-${page.id}`}
                    aria-label={page.label}
                    className="absolute left-0 top-full z-50 mt-1 w-64 rounded-xl border border-border-default bg-surface p-2 shadow-xl"
                  >
                    {page.sections.map((section, index) => (
                      <li key={section.label}>
                        <Link
                          href={sectionHref(page, section)}
                          ref={(node) => {
                            linkRefs.current[page.id] = linkRefs.current[page.id] ?? [];
                            linkRefs.current[page.id][index] = node;
                          }}
                          aria-current={isCurrent && index === 0 ? "page" : undefined}
                          onClick={() => close(page.id)}
                          onKeyDown={(event) =>
                            onLinkKeyDown(event, page.id, index, page.sections)
                          }
                          className="block rounded-lg px-3 py-2 text-sm text-fg transition-colors hover:bg-action-tonal hover:text-link focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                        >
                          {section.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href={isSignedIn ? "/inicio" : "/login"}
            className="hidden min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-fg transition-colors hover:bg-surface hover:text-link focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus md:inline-flex"
          >
            {isSignedIn ? "Ir a mi negocio" : "Iniciar sesión"}
          </Link>
          <Link
            href={destinationHref(cta.destination, isSignedIn)}
            className={`${primaryButtonSmall} hidden sm:inline-flex`}
          >
            <span className="hidden lg:inline">{cta.label}</span>
            <span className="lg:hidden">Empezar</span>
            <ArrowRightIcon className="h-4 w-4" />
          </Link>

          <Button variant="ghost" size="md"
            type="button"
            aria-expanded={mobileOpen}
            aria-controls="mobile-navegacion"
            onClick={() => {
              setMobileOpen(!mobileOpen);
              setOpenId(null);
            }}
            className="inline-flex min-h-11! items-center! gap-2! rounded-lg! border! border-border-default! bg-surface! px-3! text-sm! font-semibold! text-fg! focus-visible:outline-2! focus-visible:outline-offset-2! focus-visible:outline-focus! lg:hidden!"
          >
            Menú
            <ChevronDownIcon className={`h-4 w-4 transition-transform ${mobileOpen ? "rotate-180" : ""}`} />
          </Button>
        </div>
      </div>

      {mobileOpen ? (
        <nav
          id="mobile-navegacion"
          aria-label="Navegación de secciones"
          className="border-t border-border-default bg-surface px-6 py-4 lg:hidden"
        >
          <ul className="space-y-2">
            {functionalityPages.map((page) => {
              const expanded = mobileExpanded === page.id;
              const isCurrent = activePage?.id === page.id;

              return (
                <li key={page.id} className="rounded-xl border border-border-default">
                  <Button variant="ghost" size="md"
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={`mobile-nav-${page.id}`}
                    onClick={() => setMobileExpanded(expanded ? null : page.id)}
                    className={`flex! min-h-12! w-full! items-center! justify-between! gap-3! rounded-xl! px-4! text-left! text-sm! font-semibold! focus-visible:outline-2! focus-visible:outline-offset-2! focus-visible:outline-focus! ${
                      isCurrent
                        ? "bg-action-tonal! text-link! hover:bg-action-tonal!"
                        : "text-fg!"
                    }`}
                  >
                    {page.label}
                    <ChevronDownIcon
                      className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
                    />
                  </Button>
                  {expanded ? (
                    <ul id={`mobile-nav-${page.id}`} className="space-y-1 px-3 pb-3">
                      {page.sections.map((section) => (
                        <li key={section.label}>
                          <Link
                            href={sectionHref(page, section)}
                            aria-current={isCurrent && section.hash === "" ? "page" : undefined}
                            onClick={() => {
                              setMobileOpen(false);
                              setMobileExpanded(null);
                            }}
                            className="block rounded-lg px-3 py-2 text-sm text-fg-muted transition-colors hover:bg-action-tonal hover:text-link focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
                          >
                            {section.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
          <div className="mt-4 flex flex-col gap-2 border-t border-border-default pt-4">
            <Link
              href={isSignedIn ? "/inicio" : "/login"}
              className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold text-fg hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              {isSignedIn ? "Ir a mi negocio" : "Iniciar sesión"}
            </Link>
            <Link href={destinationHref(cta.destination, isSignedIn)} className={primaryButtonSmall}>
              {cta.label}
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </nav>
      ) : null}
    </header>
  );
}
