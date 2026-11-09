import { useState } from "react";
import { findPrograms } from "../utils/programs";
export const TOPICS = {
  food: "Food",
  youngFamily: "Pregnancy or a child under five",
  housing: "Housing or shelter",
  veteran: "Veterans support",
  disability: "Disability support",
  children: "Family support",
  health: "Health coverage",
  utilities: "Utility bills",
  senior: "Older adult services",
};
export default function EligibilityForm() {
  const [selected, setSelected] = useState({}),
    [results, setResults] = useState(null);
  return (
    <>
      <h1>Benefits finder</h1>
      <p>
        Choose the support you want to explore. These answers stay on your
        device in this tab and are never sent to a server.
      </p>
      <p>
        This tool does not decide eligibility or estimate benefit amounts. Only
        the agency can determine whether you qualify.
      </p>
      <form
        className="panel"
        onSubmit={(e) => {
          e.preventDefault();
          setResults(findPrograms(selected));
        }}
      >
        <fieldset>
          <legend>What would you like help with?</legend>
          {Object.entries(TOPICS).map(([key, label]) => (
            <label className="check" key={key}>
              <input
                type="checkbox"
                checked={!!selected[key]}
                onChange={(e) => {
                  setSelected({ ...selected, [key]: e.target.checked });
                  setResults(null);
                }}
              />
              {label}
            </label>
          ))}
        </fieldset>
        <button>Find programs</button>
        <button
          type="button"
          onClick={() => {
            setSelected({});
            setResults(null);
          }}
        >
          Clear answers
        </button>
      </form>
      {results && (
        <section className="panel" aria-label="Matching programs">
          {results.length > 0 && (
            <div className="notice" aria-label="Next step">
              <h3>First: call 211</h3>
              <p>
                Dial 211 any time. It is free and confidential, and a person
                answers 24 hours a day. If you are hard of hearing, dial 711 and
                ask for 211.
              </p>
              <p>
                You could say: “I am looking for help with{" "}
                {Object.keys(selected)
                  .filter((key) => selected[key] && TOPICS[key])
                  .map((key) => TOPICS[key].toLowerCase())
                  .join(", ") || "these programs"}
                . Can you check {results.map((p) => p.name).join(", ")}?”
              </p>
            </div>
          )}
          <h2>
            {results.length > 0
              ? "Then: programs to explore"
              : "Programs to explore"}
          </h2>
          {results.length ? (
            <ul>
              {results.map((p) => (
                <li key={p.name}>
                  <a href={p.url} target="_blank" rel="noopener noreferrer">
                    {p.name}
                  </a>
                  <p>{p.description}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p>Select a topic to get relevant program links.</p>
          )}
          <p>
            Opening a link takes you to the agency’s website, which has its own
            privacy practices. Most programs will ask for a photo ID and proof
            of income; 211 can tell you exactly what each one needs.
          </p>
        </section>
      )}
      <p>
        For local help, call 211 or visit{" "}
        <a
          href="https://211sandiego.org/"
          target="_blank"
          rel="noopener noreferrer"
        >
          211 San Diego
        </a>
        . For an emergency in the U.S., call 911.
      </p>
    </>
  );
}
