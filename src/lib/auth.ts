import { store, getDefaultSettings } from "./store";

/**
 * Validate a participant PIN. Returns true if valid.
 * If no PINs are configured, always returns true (backward compat).
 */
export async function validateParticipantPin(
  name: string,
  pin: string | undefined
): Promise<boolean> {
  const settings = await store.getSettings();
  if (!settings) return true;

  const pins = settings.participantPins || {};
  // If no PINs set at all, skip auth
  if (Object.keys(pins).length === 0) return true;
  // If this participant has no PIN, allow
  if (!pins[name]) return true;
  return pins[name] === pin;
}

/**
 * Validate admin PIN. Returns true if valid.
 */
export async function validateAdminPin(pin: string | undefined): Promise<boolean> {
  const settings = await store.getSettings() || getDefaultSettings();
  const adminPin = settings.adminPin || "1234";
  return pin === adminPin;
}
