import { numeric } from "./client";
export const CHECKLIST = [
  "Drinking water",
  "Food suited to your needs",
  "Hygiene supplies",
  "Weather protection",
  "A way to contact help",
];

// Daily needs used for the "how long it lasts" estimate. Three meals a day;
// a child counts as about two-thirds of an adult meal; about one gallon
// (3.8 liters) of water per person per day, which is what Ready.gov says to
// store for drinking and basic hygiene.
export const DAILY = { meals: 3, childShare: 0.7, liters: 3.8 };

// Typical prices at a discount grocery or dollar store. They are estimates
// for planning; every line in the plan says to check the shelf price.
export const BUYS = {
  water: {
    need: "more water",
    label: "Water",
    what: "Gallon jug of drinking water",
    unit: "gallon",
    price: 1.5,
    where: "grocery store",
  },
  food: {
    need: "more food",
    label: "Food",
    what: "Shelf-stable meals: canned soup, beans, tuna or peanut butter",
    unit: "meal",
    price: 2,
    where: "grocery store",
  },
  socks: {
    need: "socks",
    label: "Clothes",
    what: "Pair of socks",
    unit: "pair",
    price: 3,
    where: "dollar store",
  },
  warm: {
    need: "a warm layer",
    label: "Clothes",
    what: "Warm layer, such as a hoodie or sweater",
    unit: "layer",
    price: 8,
    where: "thrift store",
  },
  rain: {
    need: "a rain poncho",
    label: "Rain gear",
    what: "Rain poncho",
    unit: "poncho",
    price: 3,
    where: "dollar store",
  },
  hygiene: {
    need: "hygiene basics",
    label: "Hygiene",
    what: "Hygiene basics: soap, toothbrush, toothpaste, wipes",
    unit: "kit",
    price: 6,
    where: "dollar store",
  },
};

// Words that sort a typed item into a kind of supply. Anything else is
// "misc" and still shows in the list.
const KINDS = [
  ["water", /\b(water|juice|gatorade|electrolyte)\b/i],
  [
    "hygiene",
    /\b(soap|toothpaste|toothbrush|wipes?|shampoo|deodorant|pads?|tampons?|sanitizer|razor)\b/i,
  ],
  [
    "clothing",
    /\b(socks?|shirts?|pants|jacket|coat|hoodie|sweater|gloves?|hat|shoes?|boots?|poncho|underwear)\b/i,
  ],
  ["shelter", /\b(blankets?|sleeping bag|tent|tarp|pillow)\b/i],
  [
    "food",
    /\b(food|rice|beans?|soup|canned|cans?|bread|peanut butter|tuna|pasta|cereal|oats|noodles?|granola|crackers?|fruit|snacks?|meals?|mre)\b/i,
  ],
];
export function kindOf(name) {
  return KINDS.find(([, words]) => words.test(name))?.[0] ?? "misc";
}

// Typed items are "name, quantity" with an optional third number for how much
// each one provides: meals for food, or liters for water. Nothing is saved.
export function planInventory(lines) {
  if (typeof lines !== "string" || !lines.trim() || lines.length > 10000)
    throw new Error("Enter at least one item (up to 10,000 characters).");
  const rows = lines.split("\n").filter((line) => line.trim());
  if (rows.length > 100) throw new Error("Enter no more than 100 items.");
  const items = rows.map((line) => {
    const parts = line.split(",").map((p) => p.trim());
    if (![2, 3].includes(parts.length) || !parts[0] || parts[0].length > 100)
      throw new Error(
        "Use one line per item: name, how many, and if you like, meals or liters in each.",
      );
    const quantity = numeric(parts[1], "How many", {
      min: 1,
      max: 10000,
      integer: true,
    });
    const each =
      parts.length === 3
        ? numeric(parts[2], "Meals or liters in each", { max: 1000 })
        : 0;
    const category = kindOf(parts[0]);
    const water = category === "water";
    return {
      name: parts[0],
      quantity,
      category,
      meals: water ? 0 : quantity * each,
      liters: water ? quantity * each : 0,
    };
  });
  return {
    items,
    summary: "Your list, using only the amounts you typed.",
  };
}

export const numericBudget = (value) =>
  numeric(value, "Money you can spend", { max: 100000 });

export function household(adults, children) {
  const people = {
    adults: numeric(adults, "Adults", { max: 20, integer: true }),
    children: numeric(children, "Children", { max: 20, integer: true }),
  };
  if (!people.adults && !people.children)
    throw new Error("Count at least one person.");
  return people;
}

// Days of food and water for a household, from the meals and liters each
// item provides. Only a rough guide; heat, illness, pregnancy and hard work
// all raise real needs.
export function estimateDuration(items, { adults, children }) {
  const meals = items.reduce((sum, item) => sum + (item.meals || 0), 0),
    liters = items.reduce((sum, item) => sum + (item.liters || 0), 0);
  return {
    meals,
    liters,
    foodDays: meals / ((adults + DAILY.childShare * children) * DAILY.meals),
    waterDays: liters / ((adults + children) * DAILY.liters),
  };
}

export function describeDays(days, none) {
  if (!days) return none;
  if (days < 1) return "Less than a day";
  const whole = Math.floor(days);
  return `About ${whole} day${whole === 1 ? "" : "s"}`;
}

// Splits a budget across what is missing, most urgent first, so a small
// budget goes to a day of water and food before anything else and never all
// to one thing. Weather moves warm layers and rain gear up when it matters.
//
// Tiers, in order: water and food for 1 day; socks if no clothing is listed;
// a warm layer on cold nights; a poncho when rain is likely; water and food
// up to 3 days; hygiene basics if none are listed. Whatever is left is kept.
export function budgetPlan({ items, people, budget, weather = null }) {
  const cents = Math.round(numeric(budget, "Budget") * 100);
  const drinkers = people.adults + people.children,
    eaters = people.adults + DAILY.childShare * people.children;
  const hot = weather?.high >= 85,
    cold = weather?.low < 55,
    wet = weather?.rainChance >= 40;
  const have = (kind) => items.some((item) => item.category === kind);
  const { meals, liters } = estimateDuration(items, people);
  const gallonsPerDay = drinkers * (hot ? 1.5 : 1);
  const haveGallons = liters / DAILY.liters;
  // The small allowance keeps float noise (11.4 / 3.8 = 2.9999...) from
  // buying a whole extra gallon or meal.
  const short = (need) => Math.max(0, Math.ceil(need - 1e-9));
  const waterFor = (days) => short(days * gallonsPerDay - haveGallons);
  const foodFor = (days) => short(days * eaters * DAILY.meals - meals);
  const tiers = [
    ["water", waterFor(1)],
    ["food", foodFor(1)],
    ["socks", have("clothing") ? 0 : drinkers],
    ["warm", cold && !have("shelter") ? drinkers : 0],
    ["rain", wet ? drinkers : 0],
    ["water", waterFor(3) - waterFor(1)],
    ["food", foodFor(3) - foodFor(1)],
    ["hygiene", have("hygiene") ? 0 : 1],
  ];
  let left = cents;
  const bought = {},
    missing = new Set();
  for (const [key, want] of tiers) {
    if (want <= 0) continue;
    const price = Math.round(BUYS[key].price * 100),
      afford = Math.min(want, Math.floor(left / price));
    if (afford < want) missing.add(key);
    if (!afford) continue;
    bought[key] = (bought[key] || 0) + afford;
    left -= afford * price;
  }
  const lines = Object.entries(bought).map(([key, quantity]) => ({
    key,
    ...BUYS[key],
    quantity,
    total: (quantity * Math.round(BUYS[key].price * 100)) / 100,
  }));
  return {
    lines,
    spent: (cents - left) / 100,
    left: left / 100,
    // Plain names for what the budget could not stretch to.
    uncovered: [...missing].map((key) => BUYS[key].need),
    weather: { hot, cold, wet },
  };
}

// Places searches for "where to get it": a free option first, then the kinds
// of store the plan points to.
export function storesFor(plan) {
  const kinds = ["food pantry", ...plan.lines.map((line) => line.where)];
  return [...new Set(kinds)];
}
