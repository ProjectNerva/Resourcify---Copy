import { useEffect, useRef, useState } from "react";
import UploadForm from "../components/UploadForm";
import ItemList from "../components/ItemList";
import BudgetPlan from "../components/BudgetPlan";
import NearbyStores from "../components/NearbyStores";
import LocationWeather from "../components/LocationWeather";
import {
  CHECKLIST,
  DAILY,
  budgetPlan,
  describeDays,
  estimateDuration,
  household,
  numericBudget,
  planInventory,
  storesFor,
} from "../utils/planning";

const plural = (n, word) => `${n} ${word}${n === 1 ? "" : "s"}`;

function Duration({ items, people }) {
  const { meals, liters, foodDays, waterDays } = estimateDuration(
    items,
    people,
  );
  const who = [
    people.adults && plural(people.adults, "adult"),
    people.children &&
      `${people.children} child${people.children === 1 ? "" : "ren"}`,
  ]
    .filter(Boolean)
    .join(" and ");
  return (
    <section aria-label="How long this lasts">
      <h2>How long this lasts</h2>
      {meals || liters ? (
        <>
          <dl className="totals">
            <div>
              <dt>Food</dt>
              <dd>{describeDays(foodDays, "No food counted")}</dd>
            </div>
            <div>
              <dt>Water</dt>
              <dd>{describeDays(waterDays, "No water counted")}</dd>
            </div>
          </dl>
          <p>
            A rough guess for {who}, from{" "}
            {[
              meals && `about ${plural(Math.round(meals), "meal")}`,
              liters &&
                `about ${plural(Math.round(liters * 10) / 10, "liter")} of water`,
            ]
              .filter(Boolean)
              .join(" and ")}
            , against {DAILY.meals} meals a day each (a child counts as about
            two-thirds of an adult meal) and about 1 gallon, or {DAILY.liters}{" "}
            liters, of water per person per day. Heat, illness, pregnancy and
            hard work all raise real needs.
          </p>
        </>
      ) : (
        <p>
          Nothing here was counted as food or water. For typed items, add a
          third number: meals in each item, or liters in each for water.
        </p>
      )}
    </section>
  );
}

export default function ImageAnalysis({ capabilities = {} }) {
  const [lines, setLines] = useState(""),
    [adults, setAdults] = useState("1"),
    [children, setChildren] = useState("0"),
    [budget, setBudget] = useState("0"),
    [place, setPlace] = useState(null),
    [weather, setWeather] = useState(null),
    [result, setResult] = useState(null),
    [error, setError] = useState("");
  const resultPanel = useRef(null);
  // Results appear below both ways of adding items, so bring them into view.
  useEffect(() => {
    if (result) resultPanel.current?.scrollIntoView?.({ block: "start" });
  }, [result]);
  function plan(e) {
    e.preventDefault();
    setError("");
    setResult(null);
    try {
      setResult(planInventory(lines));
    } catch (e) {
      setError(e.message);
    }
  }
  // Household and budget are read on every render, so changing either
  // updates an existing result straight away.
  let people, spend, plannedBudget, problem;
  try {
    people = household(adults, children);
    spend = numericBudget(budget);
    if (result)
      plannedBudget = budgetPlan({
        items: result.items,
        people,
        budget: spend,
        weather,
      });
  } catch (e) {
    problem = e.message;
  }
  return (
    <>
      <h1>Rationer</h1>
      <p>
        See what you have, how long it may last, how to spend what money you
        have, and where to get it. Nothing here is saved.
      </p>
      <section className="panel" aria-label="About you">
        <h2>About you</h2>
        <div className="field-row">
          <label>
            Adults
            <input
              type="number"
              min="0"
              max="20"
              step="1"
              value={adults}
              onChange={(e) => setAdults(e.target.value)}
            />
          </label>
          <label>
            Children
            <input
              type="number"
              min="0"
              max="20"
              step="1"
              value={children}
              onChange={(e) => setChildren(e.target.value)}
            />
          </label>
        </div>
        <label>
          Money you can spend, in USD
          <input
            type="number"
            min="0"
            max="100000"
            step="0.01"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
          />
        </label>
        <LocationWeather
          capabilities={capabilities}
          place={place}
          onPlace={setPlace}
          weather={weather}
          onWeather={setWeather}
        />
        {problem && <p role="alert">{problem}</p>}
      </section>
      <UploadForm
        enabled={capabilities.analysis}
        onAnalysisComplete={setResult}
      />
      <form className="panel" aria-label="Manual inventory" onSubmit={plan}>
        <h2>Or type what you have</h2>
        <p>
          Works offline. One item per line: name, how many. To see how long it
          lasts, add a third number: meals in each, or liters in each for water.
        </p>
        <p className="example">
          Rice bag, 1, 10
          <br />
          Water jug, 2, 4
          <br />
          Socks, 2
        </p>
        <label>
          Items
          <textarea
            value={lines}
            onChange={(e) => {
              setLines(e.target.value);
              setResult(null);
              setError("");
            }}
            rows="5"
            maxLength="10000"
            required
          />
        </label>
        <button>Build plan</button>
        {error && <p role="alert">{error}</p>}
      </form>
      {result && (
        <div className="panel" ref={resultPanel}>
          <ItemList items={result.items} />
          {result.summary && <p>{result.summary}</p>}
          {result.notice && <p className="settings-hint">{result.notice}</p>}
          {people && <Duration items={result.items} people={people} />}
          {plannedBudget && (
            <BudgetPlan plan={plannedBudget} budget={spend} weather={weather} />
          )}
          {plannedBudget && place && capabilities.places && (
            <NearbyStores place={place} kinds={storesFor(plannedBudget)} />
          )}
          {plannedBudget && !place && capabilities.places && (
            <p>
              Add your location above to see nearby stores and free food
              pantries for this plan.
            </p>
          )}
          <button onClick={() => setResult(null)}>Clear result</button>
        </div>
      )}
      <section className="panel">
        <h2>Also think about</h2>
        <ul>
          {CHECKLIST.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </>
  );
}
