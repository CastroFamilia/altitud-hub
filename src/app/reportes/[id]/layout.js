import '../../globals.css';

/* Standalone layout for /reportes/[id] — public shareable page.
   No sidebar, no auth gate. Anyone with the link can view. */
export default function ReportIdLayout({ children }) {
  return children;
}
