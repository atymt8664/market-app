/**
 * P7-PR-10 — Static Language Gate shell lifecycle (first HTML paint → React handoff).
 */

/** Remove static gate once React FirstLaunchLanguageGate mounts. */
export function dismissStaticLanguageGate(): void {
  if (typeof document === "undefined") return;
  const shell = document.getElementById("p7-language-gate-shell");
  if (!shell) return;
  shell.classList.remove("p7-lang-gate-visible");
  shell.remove();
}

/** True when build/index.html injected the static gate and bootstrap made it visible. */
export function isStaticLanguageGateVisible(): boolean {
  if (typeof document === "undefined") return false;
  const shell = document.getElementById("p7-language-gate-shell");
  return !!shell && shell.classList.contains("p7-lang-gate-visible");
}
