export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function isDismissedWithCooldown(key: string, cooldownMs: number): boolean {
  const raw = localStorage.getItem(key);
  if (!raw) return false;
  const ts = parseInt(raw, 10);
  if (Date.now() - ts > cooldownMs) {
    localStorage.removeItem(key);
    return false;
  }
  return true;
}

export function dismissWithCooldown(key: string): void {
  localStorage.setItem(key, String(Date.now()));
}
