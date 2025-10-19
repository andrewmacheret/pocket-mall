import React, { useState, useEffect, useRef } from "react";
import "./App.css";
import {
  processProductionGoalsWithRecipes,
  extractRecipeItems,
  loadRecipes,
} from "./pocket-mall";
import { updateURL, loadFromURL } from "./url-state";
import blueprintTemplate from "./sample-blueprint.json";
import logo from "./logo.svg";

function App() {
  const [recipes, setRecipes] = useState(null);
  const [goals, setGoals] = useState([{ item: "", machine: "", amount: "1" }]);
  const [results, setResults] = useState(null);
  const [isBuilding, setIsBuilding] = useState(false);
  const [fileError, setFileError] = useState(null);
  const [buildError, setBuildError] = useState(null);
  const [showInstructions, setShowInstructions] = useState(true);
  const [hasUrlGoals, setHasUrlGoals] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Ref for auto-scrolling to results
  const resultsRef = useRef(null);

  // Get available machines for a specific item
  const getAvailableMachinesForItem = (item) => {
    if (!recipes || !item || !recipes[item]) {
      return [];
    }

    const recipeData = recipes[item];
    // recipeData is in format [machineTypes, inputs]
    return recipeData[0];
  };

  // URL State Management - using external module

  // Load state from URL on component mount
  useEffect(() => {
    const urlState = loadFromURL();

    // Always apply the showInstructions state from URL
    setShowInstructions(urlState.showInstructions);

    if (urlState.goals.length > 0) {
      setGoals(urlState.goals);
      setHasUrlGoals(true);
    }
    if (urlState.recipes) {
      setRecipes(urlState.recipes);
    }
    // Allow URL updates after initial load is complete
    setTimeout(() => setIsInitialLoad(false), 100);
  }, []);

  // Update URL when state changes
  useEffect(() => {
    if (!isInitialLoad) {
      updateURL({ goals, recipes, results, showInstructions });
    }
  }, [showInstructions, goals, results, recipes, isInitialLoad]);

  // Auto-scroll to results when they become visible
  useEffect(() => {
    if (results && resultsRef.current) {
      // Use a small delay to ensure the DOM has updated
      setTimeout(() => {
        resultsRef.current.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    }
  }, [results]);

  const handleFileChange = async (event) => {
    const selectedFile = event.target.files[0];
    // Clear results, recipes, and errors when file changes
    setResults(null);
    setRecipes(null);
    setFileError(null);

    if (selectedFile) {
      try {
        // Read and parse the file
        const fileText = await selectedFile.text();
        const recipeData = JSON.parse(fileText);

        // Load and parse recipes
        const loadedRecipes = loadRecipes(recipeData);
        setRecipes(loadedRecipes);

        // If we had URL goals, keep them; otherwise create goals for ALL recipes
        if (!hasUrlGoals) {
          const endProducts = extractRecipeItems(loadedRecipes);
          const allRecipeItems = Object.keys(loadedRecipes);

          // Helper function to get available machines using loadedRecipes instead of state
          const getAvailableMachinesForLoadedItem = (item) => {
            if (!loadedRecipes || !item || !loadedRecipes[item]) {
              return [];
            }
            return loadedRecipes[item][0];
          };

          const newGoals = allRecipeItems
            .filter((item) => {
              // Only include items that have inputs (actual recipes, not raw materials)
              const recipeData = loadedRecipes[item];
              if (
                !recipeData ||
                !Array.isArray(recipeData) ||
                recipeData.length < 2
              ) {
                return false;
              }
              const [, inputs] = recipeData;
              return (
                inputs &&
                Object.keys(inputs).length > 0 &&
                getAvailableMachinesForLoadedItem(item).length > 0
              );
            })
            .map((item) => {
              const isEndProduct = endProducts.includes(item);
              const availableMachines = getAvailableMachinesForLoadedItem(item);

              return {
                item,
                machine:
                  availableMachines.length > 0 ? availableMachines[0] : "",
                amount: isEndProduct ? "1" : "0",
              };
            });

          // Sort goals: end products first (amount "1"), then intermediates (amount "0")
          newGoals.sort((a, b) => {
            if (a.amount !== b.amount) {
              return b.amount.localeCompare(a.amount); // "1" before "0"
            }
            return a.item.localeCompare(b.item); // Alphabetical within same amount
          });

          setGoals(newGoals);
        }

        // Clear the URL goals flag since we now have recipes loaded
        setHasUrlGoals(false);
      } catch (error) {
        console.error("Error processing recipe file:", error);
        setFileError(error.message);
        // Reset state on error
        setRecipes(null);
        setGoals([{ item: "", machine: "", amount: "1" }]);
      }
    } else {
      // Clear error when no file is selected
      setFileError(null);
    }
  };

  const handleGoalChange = (index, field, value) => {
    const newGoals = [...goals];
    newGoals[index][field] = value;

    setGoals(newGoals);
    // Clear results and build errors when goals change
    setResults(null);
    setBuildError(null);
  };

  const handleBuild = async () => {
    setIsBuilding(true);
    setBuildError(null); // Clear any previous build errors

    try {
      // Convert goals to the format expected by the logic
      const productionGoals = goals
        .filter(
          (goal) =>
            goal.item &&
            goal.amount !== "" &&
            goal.amount !== null &&
            goal.amount !== undefined
        )
        .map((goal) => [goal.item, goal.machine, parseInt(goal.amount, 10)]);

      if (productionGoals.length === 0) {
        throw new Error("No valid production goals specified");
      }

      // Process using the loaded recipes
      const results = await processProductionGoalsWithRecipes(
        recipes,
        productionGoals,
        blueprintTemplate
      );

      setResults(results);
    } catch (error) {
      console.error("Build failed:", error);
      setBuildError(error.message);
      setResults([]);
    } finally {
      setIsBuilding(false);
    }
  };

  return (
    <div className="App">
      <div className="container">
        <div className="header">
          <a href="/">
            <img src={logo} alt="Pocket Mall Logo" className="logo" />
          </a>
          <h1>Build a Pocket Mall</h1>
        </div>

        <div className="subtitle">
          Generate Factorio blueprints for ultra-compact auto malls using only{" "}
          <strong>two combinators</strong> per machine.
        </div>

        {showInstructions && (
          <div className="section instructions-section">
            <h2>
              <div>
                How to Get a Recipe File from{" "}
                <a
                  href="https://factoriolab.github.io/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Factorio Lab
                </a>
              </div>
              <button
                className="hide-instructions-btn"
                onClick={() => setShowInstructions(false)}
                title="Hide instructions"
              >
                ×
              </button>
            </h2>
            <ol>
              <li>Optionally, set the location to only Nauvis</li>
              <li>
                Choose the item(s) you want to auto build (don't worry about the
                amounts yet)
              </li>
              <li>
                Click any items you want to exclude from being auto-built so
                they have the{" "}
                <span className="svg-icon invisible-icon"> icon</span>
              </li>
              <li>
                Click the [ <span className="svg-icon flow-icon"> Flow</span> ]
                tab
              </li>
              <li>
                Click the [
                <span className="svg-icon download-icon">
                  {" "}
                  Download as JSON
                </span>{" "}
                ] button
              </li>
            </ol>

            <h4>Example Factorio Lab Setups:</h4>
            <ul>
              <li>
                <a
                  href="https://factoriolab.github.io/spa/list?o=car&iex=H*B5*B7*CB~CD*CF&mpr=1&loc=B&v=11"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Car builder
                </a>
              </li>
              <li>
                <a
                  href="https://factoriolab.github.io/spa/list?o=rail&o=train-stop&o=rail-signal&o=rail-chain-signal&o=locomotive&o=cargo-wagon&o=fluid-wagon&iex=H*6*B5*B7*CB~CD*CF&mpr=1&loc=B&v=11"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Train mall
                </a>
              </li>
              <li>
                <a
                  href="https://factoriolab.github.io/spa/list?z=eJwVzLsKAkEUA9C.SXG7KdQqzZ1ZUcFGFx-1iK6oEQux2m9f0hwCIRE7iGuIW4g7iHuIPcQTxDPEvJmHeRt3eTBHMxjvcwOxQmwQOz-1u1OP4frnKuaRs8hF1Bxri7rE6.NlwVMXJn4sZQLc8Sda&v=11"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Early game mall
                </a>
              </li>
            </ul>

            <p>
              <strong>Note:</strong> Currently, the builder only supports
              recipes with a single output, and also only with solid inputs.
              Also, it does not take into account production bonuses.
            </p>
          </div>
        )}

        <div className="section">
          <h2>
            <div>
              Recipe File from{" "}
              <a
                href="https://factoriolab.github.io/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Factorio Lab
              </a>
            </div>
            <button
              className={`help-button ${showInstructions ? "disabled" : ""}`}
              onClick={() => setShowInstructions(!showInstructions)}
              disabled={showInstructions}
              aria-label="Toggle instructions"
            >
              ?
            </button>
          </h2>
          <input
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="file-input"
          />
          {fileError && (
            <div className="error-container">
              <h3 className="error-header">Error:</h3>
              <div className="error-message">{fileError}</div>
            </div>
          )}
        </div>

        {(recipes || hasUrlGoals) && (
          <div className="section">
            <h2>Production Goals</h2>
            {goals.map((goal, index) => (
              <div key={index} className="goal-row">
                <input
                  type="text"
                  value={goal.item}
                  readOnly
                  className="item-input readonly"
                />
                <select
                  value={goal.machine}
                  onChange={(e) =>
                    handleGoalChange(index, "machine", e.target.value)
                  }
                  className="machine-input"
                  disabled={!goal.item}
                >
                  {getAvailableMachinesForItem(goal.item).map((machine) => (
                    <option key={machine} value={machine}>
                      {machine}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  placeholder="Amount"
                  min="0"
                  value={goal.amount}
                  onChange={(e) =>
                    handleGoalChange(index, "amount", e.target.value)
                  }
                  className="amount-input"
                />
              </div>
            ))}
            <div className="goal-actions">
              {recipes && (
                <button
                  onClick={async () => {
                    try {
                      if (recipes) {
                        // Use the already loaded recipes to reset goals for ALL recipes
                        const endProducts = extractRecipeItems(recipes);
                        const allRecipeItems = Object.keys(recipes);

                        const newGoals = allRecipeItems
                          .filter((item) => {
                            // Only include items that have inputs (actual recipes, not raw materials)
                            const recipeData = recipes[item];
                            if (
                              !recipeData ||
                              !Array.isArray(recipeData) ||
                              recipeData.length < 2
                            ) {
                              return false;
                            }
                            const [, inputs] = recipeData;
                            return (
                              inputs &&
                              Object.keys(inputs).length > 0 &&
                              getAvailableMachinesForItem(item).length > 0
                            );
                          })
                          .map((item) => {
                            const isEndProduct = endProducts.includes(item);
                            const availableMachines =
                              getAvailableMachinesForItem(item);

                            return {
                              item,
                              machine:
                                availableMachines.length > 0
                                  ? availableMachines[0]
                                  : "",
                              amount: isEndProduct ? "1" : "0",
                            };
                          });

                        setGoals(newGoals);
                        setResults(null);
                      }
                    } catch (error) {
                      console.error("Error resetting goals:", error);
                      // Fallback to empty goal if reset fails
                      setGoals([{ item: "", machine: "", amount: "1" }]);
                      setResults(null);
                    }
                  }}
                  className="reset-button"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        )}

        <div className="section">
          <button
            onClick={handleBuild}
            className="build-button"
            disabled={
              isBuilding ||
              !recipes ||
              goals.some((goal) => !goal.item || !goal.machine)
            }
          >
            {isBuilding ? "Building..." : "Build"}
          </button>
          {buildError && (
            <div className="error-container">
              <h3 className="error-header">❌ Build error:</h3>
              <div className="error-message">{buildError}</div>
            </div>
          )}
        </div>

        {results && (
          <div className="section" ref={resultsRef}>
            <h2>Blueprints</h2>
            <div className="results-container">
              {results.length === 0 ? (
                <p className="no-results">
                  No results generated. Check your inputs and try again.
                </p>
              ) : (
                results.map((result, index) => (
                  <div key={index} className="result-box">
                    <h3 className="machine-type">
                      Machine Type: {result.machineType}
                    </h3>

                    {/* Show production requirements summary */}
                    <div className="requirements-summary">
                      <h4>Produces:</h4>
                      <ul>
                        {Object.entries(result.requirements).map(
                          ([item, req]) => (
                            <li key={item} className="produces-item">
                              <div className="produces-item-content">
                                <span className="produces-output">
                                  <span className="item-number">
                                    {req.output}
                                  </span>{" "}
                                  <span className="item-name">{item}</span>
                                </span>
                                {Object.keys(req.inputs).length > 0 && (
                                  <>
                                    <span className="produces-separator"></span>
                                    <span className="produces-inputs">
                                      {Object.entries(req.inputs)
                                        .map(([input, amount]) => (
                                          <span key={input}>
                                            <span className="item-number">
                                              {amount}
                                            </span>{" "}
                                            <span className="item-name">
                                              {input}
                                            </span>
                                          </span>
                                        ))
                                        .reduce(
                                          (prev, curr, index) =>
                                            index === 0
                                              ? [curr]
                                              : [...prev, ", ", curr],
                                          []
                                        )}
                                    </span>
                                  </>
                                )}
                              </div>
                            </li>
                          )
                        )}
                      </ul>
                    </div>

                    {/* Show base ingredient requirements */}
                    <div className="requirements-summary">
                      <h4>Requires:</h4>
                      <ul>
                        {Object.entries(result.baseIngredients || {}).map(
                          ([ingredient, amount]) => (
                            <li key={ingredient} className="requires-item">
                              <div className="requires-item-content">
                                <span className="requires-output">
                                  <span className="item-number">{amount}</span>{" "}
                                  <span className="item-name">
                                    {ingredient}
                                  </span>
                                </span>
                              </div>
                            </li>
                          )
                        )}
                      </ul>
                    </div>

                    <div className="blueprint-container">
                      <textarea
                        className="blueprint-text"
                        value={result.blueprintString}
                        readOnly
                        rows={3}
                        onClick={(e) => e.target.select()}
                      />
                      <button
                        className="copy-button"
                        onClick={() => {
                          navigator.clipboard.writeText(result.blueprintString);
                          // Could add a toast notification here
                        }}
                      >
                        📋 Copy Blueprint
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
