/**
 * URL State Management for Pocket Mall
 * Handles encoding and decoding application state to/from URL query parameters
 */

import {
  compressUrlData,
  decompressUrlData,
  decompressRecipes,
  decompressGoals,
} from "./compression";

// URL Format Version - increment when making breaking changes to URL structure
export const URL_VERSION = "1";

/**
 * Updates the browser URL with current application state
 * @param {Object} state - Application state object
 * @param {Array} state.goals - Array of production goals
 * @param {Object} state.recipes - Recipe data object
 * @param {Array} state.results - Build results array
 * @param {boolean} state.showInstructions - Instructions visibility state
 */
export const updateURL = (state) => {
  const { goals, recipes, results, showInstructions } = state;
  const params = new URLSearchParams();

  // Add version parameter for future compatibility
  params.set("v", URL_VERSION);

  // Include instructions state
  if (showInstructions) {
    params.set("i", "1");
  } else {
    params.set("i", "0");
  }

  // Include recipes if they exist
  if (recipes) {
    // Use compression for recipes to reduce URL length
    const compressedRecipes = compressUrlData(recipes);
    if (compressedRecipes) {
      params.set("r", compressedRecipes);
    } else {
      console.warn("Failed to compress recipes for URL");
    }
  }

  // Only include goals if they have content
  if (goals && goals.length > 0) {
    // Filter out goals without required fields for compression
    const validGoals = goals
      .filter((goal) => goal.item && goal.amount)
      .map((goal) => ({
        item: goal.item,
        machine: goal.machine || "",
        amount: goal.amount,
      }));

    if (validGoals.length > 0) {
      // Use compression for goals to reduce URL length
      const compressedGoals = compressUrlData(validGoals);
      if (compressedGoals) {
        params.set("g", compressedGoals);
      } else {
        console.warn("Failed to compress goals for URL");
      }
    }
  }

  if (results && results.length > 0) params.set("res", "1");

  const newURL = params.toString()
    ? `?${params.toString()}`
    : window.location.pathname;
  window.history.replaceState({}, "", newURL);
};

/**
 * Loads application state from URL query parameters
 * @returns {Object} Parsed state object with goals, recipes, showInstructions, and hasUrlGoals flags
 */
export const loadFromURL = () => {
  const params = new URLSearchParams(window.location.search);
  const state = {
    goals: [],
    recipes: null,
    showInstructions: true, // Default to true (instructions shown)
    hasUrlGoals: false,
  };

  // Only parse URL parameters if version matches current version
  if (params.get("v") !== URL_VERSION) {
    return state;
  }

  // Load instructions state - explicitly check for "0" to hide instructions
  if (params.get("i") === "0") {
    state.showInstructions = false;
  }

  // Load goals
  const goalsParam = params.get("g");
  if (goalsParam) {
    try {
      // Decompress goals
      const decompressedGoals = decompressUrlData(goalsParam);
      if (Array.isArray(decompressedGoals) && decompressedGoals.length > 0) {
        state.goals = decompressedGoals;
        state.hasUrlGoals = true;
      } else {
        console.warn("Failed to decompress goals from URL");
      }
    } catch (error) {
      console.warn("Failed to parse goals from URL:", error);
    }
  }

  // Load recipes
  const recipesParam = params.get("r");
  if (recipesParam) {
    try {
      // Decompress recipes
      const decompressedRecipes = decompressUrlData(recipesParam);
      if (
        decompressedRecipes &&
        typeof decompressedRecipes === "object" &&
        !Array.isArray(decompressedRecipes)
      ) {
        state.recipes = decompressedRecipes;
      } else {
        console.warn("Failed to decompress recipes from URL");
      }
    } catch (error) {
      console.warn("Failed to parse recipes from URL:", error);
    }
  }

  return state;
};

/**
 * Clears all URL parameters by navigating to the base path
 */
export const clearURL = () => {
  window.history.replaceState({}, "", window.location.pathname);
};
