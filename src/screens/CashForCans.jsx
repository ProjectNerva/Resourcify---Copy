import { useState } from "react";
import UploadForm from "../components/UploadForm";
import MapSection from "./MapSection";
import { MATERIALS, recyclingTotal } from "../utils/recycling";
import { money } from "../utils/client";

// Most people bring one or two kinds of material, so the calculator starts
// with aluminum cans and lets them add others from a list instead of showing
// fourteen empty boxes at once.
const STARTING = ["aluminum"];
const COUNTED = ["aluminum", "plastic", "glass", "steel"];

export default function CashForCans({ capabilities = {}, active = false }) {
  const [shown, setShown] = useState(STARTING),
    [counts, setCounts] = useState({}),
    [rates, setRates] = useState({}),
    [result, setResult] = useState(null),
    [error, setError] = useState("");
  const inOrder = (keys) =>
    Object.keys(MATERIALS).filter((key) => keys.includes(key));
  const remaining = Object.keys(MATERIALS).filter(
    (key) => !shown.includes(key),
  );
  function add(key) {
    setShown(inOrder([...shown, key]));
    setResult(null);
  }
  function remove(key) {
    setShown(shown.filter((k) => k !== key));
    const { [key]: _count, ...otherCounts } = counts;
    const { [key]: _rate, ...otherRates } = rates;
    setCounts(otherCounts);
    setRates(otherRates);
    setResult(null);
  }
  function calculate(e) {
    e.preventDefault();
    setResult(null);
    setError("");
    try {
      setResult(recyclingTotal(counts, rates));
    } catch (e) {
      setError(e.message);
    }
  }
  return (
    <>
      <h1>Cash for Cans</h1>
      <p>
        Count recyclables and estimate value using rates you confirm with a
        center. Rates, accepted materials and container eligibility vary.
      </p>
      <UploadForm
        recycling
        enabled={capabilities.analysis}
        onAnalysisComplete={(data) => {
          setCounts({ ...counts, ...data.counts });
          setShown(
            inOrder([
              ...shown,
              ...Object.keys(data.counts).filter((k) => data.counts[k] > 0),
            ]),
          );
          setResult(null);
        }}
      />
      <form
        className="panel"
        aria-label="Recycling calculator"
        onSubmit={calculate}
      >
        <h2>Calculate with confirmed rates</h2>
        <p>
          Enter a rate per container, or per pound for bulk materials. A blank
          rate is unknown, not zero. Do not add a deposit refund to a quote that
          already includes it.
        </p>
        {shown.map((key) => (
          <fieldset className="material" key={key}>
            <legend>{MATERIALS[key]}</legend>
            <div className="field-row">
              <label>
                {MATERIALS[key]} quantity
                <input
                  type="number"
                  min="0"
                  max="10000"
                  step={COUNTED.includes(key) ? "1" : "0.01"}
                  value={counts[key] ?? ""}
                  onChange={(e) => {
                    setCounts({ ...counts, [key]: e.target.value });
                    setResult(null);
                  }}
                />
              </label>
              <label>
                {MATERIALS[key]} rate in USD
                <input
                  type="number"
                  min="0"
                  max="10000"
                  step="0.01"
                  value={rates[key] ?? ""}
                  onChange={(e) => {
                    setRates({ ...rates, [key]: e.target.value });
                    setResult(null);
                  }}
                />
              </label>
            </div>
            <button
              type="button"
              className="link-button"
              onClick={() => remove(key)}
            >
              Remove {MATERIALS[key].toLowerCase()}
            </button>
          </fieldset>
        ))}
        {remaining.length > 0 && (
          <label>
            Add a material
            <select value="" onChange={(e) => add(e.target.value)}>
              <option value="" disabled>
                Choose one…
              </option>
              {remaining.map((key) => (
                <option key={key} value={key}>
                  {MATERIALS[key]}
                </option>
              ))}
            </select>
          </label>
        )}
        <button>Calculate value</button>
        <button
          type="button"
          onClick={() => {
            setShown(STARTING);
            setCounts({});
            setRates({});
            setResult(null);
            setError("");
          }}
        >
          Clear calculator
        </button>
        {error && <p role="alert">{error}</p>}
        {result && (
          <section aria-label="Recycling estimate">
            <h3>Estimated total: {money(result.total)}</h3>
            <ul>
              {result.rows.map((row) => (
                <li key={row.material}>
                  {row.material}: {row.quantity} × {money(row.rate)} ={" "}
                  {money(row.value)}
                </li>
              ))}
            </ul>
            <p>
              Based only on the rates you entered. This is not a center quote.
            </p>
          </section>
        )}
      </form>
      <MapSection
        recycling
        embedded
        active={active}
        capabilities={capabilities}
      />
    </>
  );
}
