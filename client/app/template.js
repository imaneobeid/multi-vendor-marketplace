// Re-mounts on every page change, so each page fades in softly
export default function Template({ children }) {
  return <div className="page-in">{children}</div>;
}
