/* ==========================================================================
   Tabs — Single Source of Truth
   --------------------------------------------------------------------------
   Used by Navbar (tab buttons) and OnboardingTour (data-driven tour steps).
   Adding/removing a tab here keeps both in sync automatically.
   ========================================================================== */

import { LayoutGrid, Swords, PlusCircle, Compass, History } from '../lib/icons';

export const TABS = [
  {
    id: 'studio',
    icon: LayoutGrid,
    label: 'Studio',
    tour: 'Ask anything, spin, and decide in the studio.',
  },
  {
    id: 'tournament',
    icon: Swords,
    label: 'Tournament',
    tour: 'Run 1v1 bracket eliminations until a champion is crowned.',
  },
  {
    id: 'builder',
    icon: PlusCircle,
    label: 'Custom Builder',
    tour: 'Build custom weighted decision wheels.',
  },
  {
    id: 'discover',
    icon: Compass,
    label: 'Discover',
    tour: 'Load curated decision templates into the studio.',
  },
  {
    id: 'history',
    icon: History,
    label: 'History',
    tour: 'Review your past decisions and re-open them.',
  },
];
