export const defaultLogoPrompt =
  "Modern icon, logo. Flat, colorful. Circular with white background.";

const storageKey = "logoPrompt";

export function getGeneralLogoPrompt() {
  const result = localStorage.getItem(storageKey);
  return result || defaultLogoPrompt;
}

export function setGeneralLogoPrompt(value) {
  localStorage.setItem(storageKey, value);
}
