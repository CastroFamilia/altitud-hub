/* Reportes layout: passes through to root layout (auth + sidebar) for /reportes index.
   The /reportes/[id] route has its OWN layout that strips auth for public access. */
export default function ReportesLayout({ children }) {
  return children;
}
