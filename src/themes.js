// Named color themes for the SVG renderer. A theme is just a named
// background/foreground pair; `--background`/`--foreground` on the CLI
// always override whichever theme is in effect, so themes are a convenience
// default rather than the only way to set color.
export const THEMES = {
  dark: { background: "#0d1117", foreground: "#c9d1d9" },
  light: { background: "#ffffff", foreground: "#24292f" },
  dracula: { background: "#282a36", foreground: "#f8f8f2" },
  solarized: { background: "#002b36", foreground: "#839496" },
};

export function resolveTheme(name) {
  const theme = THEMES[name];
  if (!theme) {
    const known = Object.keys(THEMES).join(", ");
    throw new Error(`unknown theme "${name}" (known: ${known})`);
  }
  return { ...theme };
}
