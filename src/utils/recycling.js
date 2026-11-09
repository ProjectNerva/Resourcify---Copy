import { numeric } from "./client";
export const MATERIALS = {
  aluminum: "Aluminum cans",
  plastic: "Plastic bottles",
  glass: "Glass bottles",
  steel: "Steel cans",
  cardboard: "Cardboard (lb)",
  paper: "Paper (lb)",
  copper: "Copper (lb)",
};
export function recyclingTotal(counts, rates) {
  let cents = 0,
    used = 0;
  const rows = [];
  for (const key of Object.keys(MATERIALS)) {
    if (counts[key] === "" || counts[key] === undefined) continue;
    const quantity = numeric(counts[key], MATERIALS[key], {
      min: 0,
      max: 10000,
      integer: ["aluminum", "plastic", "glass", "steel"].includes(key),
    });
    if (!quantity) continue;
    const rate = numeric(rates[key], `${MATERIALS[key]} rate`, { max: 10000 });
    const value = Math.round(quantity * Math.round(rate * 100));
    cents += value;
    used++;
    rows.push({
      material: MATERIALS[key],
      quantity,
      rate: Math.round(rate * 100) / 100,
      value: value / 100,
    });
  }
  if (!used)
    throw new Error(
      "Enter at least one positive quantity and a confirmed rate.",
    );
  return { rows, total: cents / 100 };
}
