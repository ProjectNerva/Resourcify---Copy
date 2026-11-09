import { money } from "../utils/client";

// How to spend the budget, most urgent need first. Built from fixed typical
// prices in the browser, so it works offline and never waits on a model.
export default function BudgetPlan({ plan, budget, weather }) {
  const notes = [
    plan.weather.cold &&
      `Tonight's low is about ${weather.low}°F, so a warm layer is on the list.`,
    plan.weather.wet &&
      `Rain is likely today (${weather.rainChance}%), so a poncho is on the list.`,
    plan.weather.hot &&
      `It will reach about ${weather.high}°F, so the plan counts extra water.`,
  ].filter(Boolean);
  return (
    <section aria-label="Budget plan">
      <h2>How to spend {money(budget)}</h2>
      {plan.lines.length ? (
        <ul className="plan-lines">
          {plan.lines.map((line) => (
            <li key={line.key}>
              <strong>
                {line.label}: {money(line.total)}
              </strong>
              <span>
                {line.quantity} × {line.what}, about {money(line.price)} per{" "}
                {line.unit} at a {line.where}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p>
          {budget > 0
            ? "You already have the basics this plan covers for 3 days."
            : "With no money to spend, start with free help: the food pantries below, and 211 for everything else."}
        </p>
      )}
      {notes.map((note) => (
        <p key={note}>{note}</p>
      ))}
      <dl className="totals">
        <div>
          <dt>Planned</dt>
          <dd>{money(plan.spent)}</dd>
        </div>
        <div>
          <dt>Kept for bus fare or emergencies</dt>
          <dd>{money(plan.left)}</dd>
        </div>
      </dl>
      {plan.uncovered.length > 0 && (
        <p>
          This budget does not stretch to{" "}
          {plan.uncovered.length > 1
            ? `${plan.uncovered.slice(0, -1).join(", ")} or ${plan.uncovered.at(-1)}`
            : plan.uncovered[0]}
          . Food pantries, outreach teams and 211 often give these out free.
        </p>
      )}
      <p className="settings-hint">
        Prices are typical discount-store prices, not quotes. Check the shelf.
      </p>
    </section>
  );
}
