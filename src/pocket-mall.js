// Pocket Mall Logic

import { compressToBase64 } from "./compression";

/**
 * Extract the machine type from a machine name string.
 */
export function processMachineName(machine) {
  let name = machine.replace(/\s*\(.*\)$/, "").toLowerCase();

  switch (name) {
    case "assembling-machine-1":
    case "assembling-machine-2":
    case "assembling-machine-3":
      return "assembling-machine";
    case "biochamber":
    case "centrifuge":
    case "chemical-plant":
    case "cryogenic-plant":
    case "electromagnetic-plant":
    case "foundry":
    case "oil-refinery":
    case "electric-furnace":
      return name;
    default:
      return null;
  }
}

/**
 * Load recipes from factoriolab_flow JSON data.
 */
export function loadRecipes(data) {
  const recipes = {};

  if (!data || !data.nodes) {
    throw new Error("Invalid recipe data: missing nodes");
  }

  for (const node of data.nodes) {
    if (!node.recipe) continue;

    const recipe = node.recipe;
    if (!recipe.in || !recipe.out) continue;

    const name = recipe.name;
    const inputs = {};
    const outputs = {};

    // Convert string values to integers
    for (const [key, value] of Object.entries(recipe.in)) {
      inputs[key] = parseInt(value, 10);
    }

    for (const [key, value] of Object.entries(recipe.out)) {
      outputs[key] = parseInt(value, 10);
    }

    const producers = recipe.producers || [];
    const machines = [
      ...new Set(
        producers.map((m) => processMachineName(m)).filter((m) => m !== null)
      ),
    ];
    machines.sort();

    if (Object.keys(outputs).length > 1) {
      throw new Error(
        `Cannot support recipe "${name}" with multiple outputs:\n${JSON.stringify(
          recipe.out,
          null,
          2
        )}`
      );
    }

    const output = Object.keys(outputs)[0];
    recipes[output] = [machines, inputs];
  }

  return recipes;
}

/**
 * Build a recursive dependency tree for an item.
 */
export function buildDependencyTree(recipes, itemName, requiredAmount) {
  const seen = new Set();

  function recursive(itemName, requiredAmount) {
    if (seen.has(itemName)) {
      console.warn(
        `Circular dependency detected for item: ${itemName}, ignoring`
      );
      return [itemName, requiredAmount, []];
    }

    const dependencies = [];

    if (recipes[itemName]) {
      const [, recipeInputs] = recipes[itemName];
      for (const [ingredientName, ingredientAmount] of Object.entries(
        recipeInputs
      )) {
        const dependency = recursive(
          ingredientName,
          ingredientAmount * requiredAmount
        );
        dependencies.push(dependency);
      }
    }

    return [itemName, requiredAmount, dependencies];
  }

  return recursive(itemName, requiredAmount);
}

/**
 * Calculate production requirements from dependency trees.
 */
export function calculateProductionRequirements(dependencyTrees) {
  const productionRequirements = {};

  function processNode(node) {
    const [itemName, outputAmount, dependencies] = node;

    if (dependencies.length === 0) {
      return;
    }

    if (!productionRequirements[itemName]) {
      productionRequirements[itemName] = { inputs: {}, output: 0 };
    }

    productionRequirements[itemName].output += outputAmount;

    for (const dependency of dependencies) {
      const [dependencyName, dependencyAmount] = dependency;

      if (!productionRequirements[itemName].inputs[dependencyName]) {
        productionRequirements[itemName].inputs[dependencyName] = 0;
      }

      productionRequirements[itemName].inputs[dependencyName] +=
        dependencyAmount;
      processNode(dependency);
    }
  }

  for (const tree of dependencyTrees) {
    processNode(tree);
  }

  return productionRequirements;
}

/**
 * Build constant combinator filters for Factorio blueprint.
 */
export function buildConstantFilters(productionRequirements) {
  const filters = [];
  const itemNames = Object.keys(productionRequirements);

  for (let i = 0; i < itemNames.length; i++) {
    const itemName = itemNames[i];
    const recipeId = (i + 1) * 2 - 1;

    filters.push({
      index: i + 1,
      name: itemName,
      quality: "normal",
      comparator: "=",
      count: recipeId,
    });
  }

  return filters;
}

/**
 * Build decider combinator conditions for Factorio blueprint.
 */
export function buildDeciderConditions(productionRequirements) {
  const conditions = [];
  const items = Object.entries(productionRequirements);

  for (let i = 0; i < items.length; i++) {
    const [outputItem, requirements] = items[i];
    const recipeId = (i + 1) * 2 - 1;

    // Block 1
    conditions.push({
      first_signal: {
        type: "virtual",
        name: "signal-each",
      },
      constant: recipeId,
      comparator: "=",
      first_signal_networks: {
        red: true,
        green: false,
      },
    });

    conditions.push({
      first_signal: {
        type: "virtual",
        name: "signal-no-entry",
      },
      comparator: "=",
      first_signal_networks: {
        red: true,
        green: false,
      },
      compare_type: "and",
    });

    for (const [inputItem, inputAmount] of Object.entries(
      requirements.inputs
    )) {
      conditions.push({
        first_signal: {
          name: inputItem,
        },
        constant: inputAmount,
        comparator: "≥",
        first_signal_networks: {
          red: false,
          green: true,
        },
        compare_type: "and",
      });
    }

    conditions.push({
      first_signal: {
        name: outputItem,
      },
      constant: requirements.output,
      comparator: "<",
      first_signal_networks: {
        red: false,
        green: true,
      },
      compare_type: "and",
    });

    // Block 2
    conditions.push({
      first_signal: {
        type: "virtual",
        name: "signal-each",
      },
      constant: recipeId + 1,
      comparator: "=",
      first_signal_networks: {
        red: true,
        green: false,
      },
    });

    conditions.push({
      first_signal: {
        name: outputItem,
      },
      constant: requirements.output,
      comparator: "<",
      first_signal_networks: {
        red: false,
        green: true,
      },
      compare_type: "and",
    });
  }

  return conditions;
}

/**
 * Encode blueprint data into Factorio blueprint string format.
 * Uses zlib compression for proper Factorio compatibility.
 * @param {Object} blueprintData - The blueprint data to encode
 * @param {boolean} includeVersionPrefix - Whether to include the '0' version prefix (default: true)
 * @returns {string} - Encoded blueprint string
 */
export function encodeFactorioBlueprint(
  blueprintData,
  includeVersionPrefix = true
) {
  const compressed = compressToBase64(blueprintData);

  if (!compressed) {
    throw new Error("Failed to compress blueprint data");
  }

  // For Factorio blueprints, we want the version prefix
  // For URL compression, we might not want it
  if (includeVersionPrefix) {
    return compressed;
  } else {
    // Remove the version prefix (first character)
    return compressed.slice(1);
  }
}

/**
 * Create blueprint data by populating a template with filters and conditions.
 */
function createBlueprint(
  constantCombinatorFilters,
  deciderConditions,
  templateData
) {
  const data = JSON.parse(JSON.stringify(templateData)); // Deep clone

  try {
    data.blueprint.entities[0].control_behavior.sections.sections[0].filters =
      constantCombinatorFilters;
    data.blueprint.entities[1].control_behavior.decider_conditions.conditions =
      deciderConditions;
    return data;
  } catch (error) {
    throw new Error(
      `Blueprint template has unexpected structure: ${error.message}`
    );
  }
}

/**
 * Main function to process production goals and generate blueprints (uses pre-loaded recipes).
 */
export function processProductionGoalsWithRecipes(
  loadedRecipes,
  productionGoals,
  blueprintTemplate
) {
  try {
    // Build dependency trees using pre-loaded recipes
    const dependencyTrees = productionGoals.map(([itemName, machine, amount]) =>
      buildDependencyTree(loadedRecipes, itemName, parseInt(amount, 10))
    );

    // Calculate production requirements
    const productionRequirements =
      calculateProductionRequirements(dependencyTrees);

    // Calculate base ingredient requirements
    const baseIngredients = calculateBaseIngredients(dependencyTrees);

    // Create mapping from item names to their chosen machines
    const itemMachineMap = {};
    productionGoals.forEach(([itemName, machine, amount]) => {
      itemMachineMap[itemName] = machine;
    });

    // Group requirements by machine type
    const requirementsByMachine = {};
    for (const [itemName, requirements] of Object.entries(
      productionRequirements
    )) {
      // Use the chosen machine for this item, or fall back to first available
      const [machineTypes] = loadedRecipes[itemName];
      const chosenMachine = itemMachineMap[itemName];
      const machineType =
        chosenMachine && machineTypes.includes(chosenMachine)
          ? chosenMachine
          : machineTypes[0];

      if (!requirementsByMachine[machineType]) {
        requirementsByMachine[machineType] = {};
      }

      requirementsByMachine[machineType][itemName] = requirements;
    }

    // Generate blueprints for each machine type
    const results = [];
    for (const [machineType, machineRequirements] of Object.entries(
      requirementsByMachine
    )) {
      const constantCombinatorFilters =
        buildConstantFilters(machineRequirements);
      const deciderConditions = buildDeciderConditions(machineRequirements);

      const blueprint = createBlueprint(
        constantCombinatorFilters,
        deciderConditions,
        blueprintTemplate
      );

      const blueprintString = encodeFactorioBlueprint(blueprint);

      results.push({
        machineType,
        blueprintString,
        requirements: machineRequirements,
        baseIngredients,
      });
    }

    return results;
  } catch (error) {
    throw new Error(`Failed to process production goals: ${error.message}`);
  }
}

/**
 * Main function to process production goals and generate blueprints (legacy - loads recipes from raw data).
 */
export function processProductionGoals(
  recipeData,
  productionGoals,
  blueprintTemplate
) {
  try {
    // Load recipes and delegate to the new function
    const recipes = loadRecipes(recipeData);
    return processProductionGoalsWithRecipes(
      recipes,
      productionGoals,
      blueprintTemplate
    );
  } catch (error) {
    throw new Error(`Failed to process production goals: ${error.message}`);
  }
}

/**
 * Calculate base ingredient requirements from dependency trees.
 * Base ingredients are items that have no recipe dependencies (raw materials).
 */
export function calculateBaseIngredients(dependencyTrees) {
  const baseIngredients = {};

  function processNode(node) {
    const [itemName, requiredAmount, dependencies] = node;

    if (dependencies.length === 0) {
      // This is a base ingredient (no dependencies)
      if (!baseIngredients[itemName]) {
        baseIngredients[itemName] = 0;
      }
      baseIngredients[itemName] += requiredAmount;
    } else {
      // Process all dependencies recursively
      for (const dependency of dependencies) {
        processNode(dependency);
      }
    }
  }

  // Process all dependency trees
  for (const tree of dependencyTrees) {
    processNode(tree);
  }

  return baseIngredients;
}

/**
 * Extract only end-product items from loaded recipes (outputs that are not used as inputs).
 */
export function extractRecipeItems(loadedRecipes) {
  if (!loadedRecipes || typeof loadedRecipes !== "object") {
    return [];
  }

  const allOutputs = new Set();
  const allInputs = new Set();

  // Collect all outputs (keys of loadedRecipes) and inputs (values in recipe inputs)
  for (const [outputItem, [, recipeInputs]] of Object.entries(loadedRecipes)) {
    // This item is an output
    allOutputs.add(outputItem);

    // These items are inputs for this recipe
    Object.keys(recipeInputs).forEach((inputItem) => allInputs.add(inputItem));
  }

  // Find outputs that are NOT used as inputs (end products)
  const endProducts = Array.from(allOutputs).filter(
    (item) => !allInputs.has(item)
  );

  // Return sorted array
  return endProducts.sort();
}
