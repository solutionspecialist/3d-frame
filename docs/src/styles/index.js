import artDeco from "./artDeco.js";
/** Every style: { id, name, minBorder, params[], resolve(g, sp), validate(g, sp), outline(M, g, sp), relief(M, g, sp, O) }. */
export const STYLES = [artDeco];
export const byId = id => STYLES.find(s => s.id === id) || STYLES[0];
