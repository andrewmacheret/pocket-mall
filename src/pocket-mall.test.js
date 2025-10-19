import {
  processMachineName,
  loadRecipes,
  buildDependencyTree,
  calculateProductionRequirements,
  calculateBaseIngredients,
  buildConstantFilters,
  buildDeciderConditions,
  processProductionGoals,
  extractRecipeItems,
} from "./pocket-mall";
import blueprintTemplate from "./sample-blueprint.json";

// Mock TextEncoder for test environment
global.TextEncoder =
  global.TextEncoder ||
  class TextEncoder {
    encode(input) {
      const uint8Array = new Uint8Array(input.length);
      for (let i = 0; i < input.length; i++) {
        uint8Array[i] = input.charCodeAt(i);
      }
      return uint8Array;
    }
  };

// Mock btoa for test environment if needed
global.btoa =
  global.btoa ||
  function (str) {
    return Buffer.from(str, "binary").toString("base64");
  };

// Mock recipe data for testing
const mockRecipeData = {
  nodes: [
    {
      recipe: {
        name: "car",
        in: { "engine-unit": "8", "iron-plate": "20", "steel-plate": "5" },
        out: { car: "1" },
        producers: ["assembling-machine-2"],
      },
    },
    {
      recipe: {
        name: "engine-unit",
        in: { "steel-plate": "1", "iron-gear-wheel": "1", pipe: "2" },
        out: { "engine-unit": "1" },
        producers: ["assembling-machine-2"],
      },
    },
    {
      recipe: {
        name: "iron-gear-wheel",
        in: { "iron-plate": "2" },
        out: { "iron-gear-wheel": "1" },
        producers: ["assembling-machine-2"],
      },
    },
  ],
};

describe("Pocket Mall Logic", () => {
  test("processMachineName function works correctly", () => {
    // The regex extracts the last alphabetic sequence
    expect(processMachineName("assembling-machine-1")).toBe(
      "assembling-machine"
    );
    expect(processMachineName("assembling-machine-2")).toBe(
      "assembling-machine"
    );
    expect(processMachineName("assembling-machine-3")).toBe(
      "assembling-machine"
    );
    expect(processMachineName("assembling-machine-2(2)")).toBe(
      "assembling-machine"
    );
    expect(processMachineName("biochamber")).toBe("biochamber");
    expect(processMachineName("chemical-plant")).toBe("chemical-plant");
    expect(processMachineName("centrifuge")).toBe("centrifuge");
    expect(processMachineName("chemical-plant")).toBe("chemical-plant");
    expect(processMachineName("cryogenic-plant")).toBe("cryogenic-plant");
    expect(processMachineName("electromagnetic-plant")).toBe(
      "electromagnetic-plant"
    );
    expect(processMachineName("foundry")).toBe("foundry");
    expect(processMachineName("oil-refinery")).toBe("oil-refinery");

    expect(processMachineName("captive-biter-spawner")).toBe(null);
    expect(processMachineName("crusher")).toBe(null);
  });

  test("loadRecipes function parses recipe data correctly", () => {
    const recipes = loadRecipes(mockRecipeData);

    // Should have recipes keyed by output item
    expect(recipes["car"]).toBeDefined();
    expect(recipes["engine-unit"]).toBeDefined();
    expect(recipes["iron-gear-wheel"]).toBeDefined();

    // Check car recipe structure - loadRecipes returns [machine, inputs]
    const carRecipe = recipes["car"];
    expect(Array.isArray(carRecipe)).toBe(true);
    expect(carRecipe[0].length).toBe(1);
    expect(carRecipe[0][0]).toBe("assembling-machine"); // machine type
    expect(carRecipe[1]).toEqual({
      "engine-unit": 8,
      "iron-plate": 20,
      "steel-plate": 5,
    }); // inputs

    // Check engine-unit recipe
    const engineRecipe = recipes["engine-unit"];
    expect(engineRecipe[0].length).toBe(1);
    expect(engineRecipe[0][0]).toBe("assembling-machine"); // machine type
    expect(engineRecipe[1]).toEqual({
      "steel-plate": 1,
      "iron-gear-wheel": 1,
      pipe: 2,
    });
  });

  test("buildDependencyTree creates correct dependency structure", () => {
    const recipes = loadRecipes(mockRecipeData);

    // Build dependency tree for car (requiring 1 car)
    const carDependencyTree = buildDependencyTree(recipes, "car", 1);

    // Should return an array of dependencies
    expect(Array.isArray(carDependencyTree)).toBe(true);
    expect(carDependencyTree.length).toBeGreaterThan(0);

    // Build dependency tree for engine-unit
    const engineDependencyTree = buildDependencyTree(recipes, "engine-unit", 1);
    expect(Array.isArray(engineDependencyTree)).toBe(true);
    expect(engineDependencyTree.length).toBeGreaterThan(0);
  });

  test("calculateProductionRequirements works correctly", () => {
    const recipes = loadRecipes(mockRecipeData);

    // Build dependency tree for car - this returns [itemName, amount, dependencies]
    const carDependencyTree = buildDependencyTree(recipes, "car", 1);

    // The function expects an array of dependency trees
    const dependencyTrees = [carDependencyTree];

    const requirements = calculateProductionRequirements(dependencyTrees);

    // Should return a requirements object
    expect(typeof requirements).toBe("object");
    expect(requirements).toBeDefined();
  });

  test("buildConstantFilters generates correct filters", () => {
    const recipes = loadRecipes(mockRecipeData);

    // Build dependency trees and calculate requirements
    const carDependencyTree = buildDependencyTree(recipes, "car", 2);
    const dependencyTrees = [carDependencyTree];
    const requirements = calculateProductionRequirements(dependencyTrees);

    const filters = buildConstantFilters(requirements);

    // Should return an array of filters
    expect(Array.isArray(filters)).toBe(true);
    expect(filters.length).toBeGreaterThan(0);

    // Filters should have the expected structure
    if (filters.length > 0) {
      expect(filters[0]).toHaveProperty("name");
      expect(filters[0]).toHaveProperty("count");
      expect(filters[0]).toHaveProperty("comparator");
      expect(filters[0]).toHaveProperty("index");
    }
  });

  test("buildDeciderConditions generates conditions", () => {
    const recipes = loadRecipes(mockRecipeData);

    // Build dependency trees and calculate requirements
    const carDependencyTree = buildDependencyTree(recipes, "car", 1);
    const dependencyTrees = [carDependencyTree];
    const requirements = calculateProductionRequirements(dependencyTrees);

    const conditions = buildDeciderConditions(requirements);

    // Should return an array of conditions
    expect(Array.isArray(conditions)).toBe(true);
    expect(conditions.length).toBeGreaterThan(0);

    // Conditions should have the expected structure
    if (conditions.length > 0) {
      expect(conditions[0]).toHaveProperty("first_signal");
    }
  });

  test("full integration test with processProductionGoals", async () => {
    const productionGoals = [["car", 1]];

    const result = await processProductionGoals(
      mockRecipeData,
      productionGoals,
      blueprintTemplate
    );

    // Should return a result (may be string or object)
    expect(result).toBeDefined();
    expect(result).not.toBeNull();

    // If it's a string, should be valid base64
    if (typeof result === "string") {
      expect(result.length).toBeGreaterThan(0);
      expect(() => {
        atob(result);
      }).not.toThrow();
    }
  });

  test("error handling for invalid recipe data", () => {
    const invalidRecipeData = {
      nodes: [
        {
          // Missing recipe property
          invalid: true,
        },
        {
          recipe: {
            // Missing required properties
            name: "incomplete",
          },
        },
      ],
    };

    expect(() => {
      loadRecipes(invalidRecipeData);
    }).not.toThrow(); // Should handle gracefully

    const recipes = loadRecipes(invalidRecipeData);
    expect(Object.keys(recipes)).toHaveLength(0); // Should return empty object
  });

  test("error handling for recipes with multiple outputs", () => {
    const multiOutputRecipeData = {
      nodes: [
        {
          recipe: {
            name: "advanced-oil-processing",
            in: { "crude-oil": "100", water: "50" },
            out: {
              "heavy-oil": "25",
              "light-oil": "45",
              "petroleum-gas": "55",
            },
            producers: ["oil-refinery"],
          },
        },
      ],
    };

    // Should throw an error for recipes with multiple outputs
    expect(() => {
      loadRecipes(multiOutputRecipeData);
    }).toThrow(/Cannot support recipe.*with multiple outputs/);
  });

  test("extractRecipeItems extracts only end products (not used as ingredients)", () => {
    const recipes = loadRecipes(mockRecipeData);
    const recipeItems = extractRecipeItems(recipes);

    // Should include items that are outputs but not inputs
    expect(recipeItems).toContain("car"); // Output of car recipe, not used as input elsewhere
    // Should not include items that are used as inputs in other recipes
    expect(recipeItems).not.toContain("engine-unit"); // Used as input in car recipe
    expect(recipeItems).not.toContain("iron-gear-wheel"); // Used as input in engine-unit recipe
  });

  test("extractRecipeItems handles invalid data", () => {
    const invalidRecipes = null;
    const recipeItems = extractRecipeItems(invalidRecipes);
    expect(recipeItems).toEqual([]);

    const emptyRecipes = {};
    const emptyItems = extractRecipeItems(emptyRecipes);
    expect(emptyItems).toEqual([]);
  });

  test("extractRecipeItems correctly identifies end products vs intermediate products", () => {
    // Create a more complex recipe set for better testing
    const complexRecipeData = {
      nodes: [
        {
          recipe: {
            name: "final-product-1",
            in: { "intermediate-1": "2", "raw-material": "3" },
            out: { "final-product-1": "1" },
            producers: ["assembling-machine-2"],
          },
        },
        {
          recipe: {
            name: "final-product-2",
            in: { "intermediate-2": "1", "raw-material": "5" },
            out: { "final-product-2": "1" },
            producers: ["assembling-machine-2"],
          },
        },
        {
          recipe: {
            name: "intermediate-1",
            in: { "raw-material": "2" },
            out: { "intermediate-1": "1" },
            producers: ["assembling-machine-2"],
          },
        },
        {
          recipe: {
            name: "intermediate-2",
            in: { "raw-material": "4" },
            out: { "intermediate-2": "1" },
            producers: ["assembling-machine-2"],
          },
        },
      ],
    };

    const complexRecipes = loadRecipes(complexRecipeData);
    const endProducts = extractRecipeItems(complexRecipes);

    // Should only include final products (not used as ingredients)
    expect(endProducts).toEqual(["final-product-1", "final-product-2"]);
    expect(endProducts).not.toContain("intermediate-1");
    expect(endProducts).not.toContain("intermediate-2");
    expect(endProducts).not.toContain("raw-material");
  });

  test("calculateBaseIngredients should correctly identify and sum base ingredients", () => {
    const recipes = loadRecipes(mockRecipeData);

    // Build dependency trees for some cars
    const dependencyTrees = [
      buildDependencyTree(recipes, "car", 2), // 2 cars
    ];

    const baseIngredients = calculateBaseIngredients(dependencyTrees);

    // For 2 cars, we should need:
    // Each car needs: 8 engine-unit + 20 iron-plate + 5 steel-plate
    // Each engine-unit needs: 1 steel-plate + 1 iron-gear-wheel + 2 pipe
    // Each iron-gear-wheel needs: 2 iron-plate
    // Note: steel-plate and pipe don't have recipes, so they're base ingredients

    // So for 2 cars:
    // Direct iron-plate: 2 * 20 = 40
    // From iron-gear-wheels (via engine-units): 2 * 8 * 1 * 2 = 32 iron-plate
    // Direct steel-plate: 2 * 5 = 10 steel-plate
    // From engine-units: 2 * 8 * 1 = 16 steel-plate
    // From pipes: 2 * 8 * 2 = 32 pipe

    expect(baseIngredients).toHaveProperty("iron-plate");
    expect(baseIngredients["iron-plate"]).toBe(72); // 40 + 32

    expect(baseIngredients).toHaveProperty("steel-plate");
    expect(baseIngredients["steel-plate"]).toBe(26); // 10 + 16

    expect(baseIngredients).toHaveProperty("pipe");
    expect(baseIngredients["pipe"]).toBe(32); // 2 * 8 * 2

    // Should not include intermediate products that have recipes
    expect(baseIngredients).not.toHaveProperty("car");
    expect(baseIngredients).not.toHaveProperty("engine-unit");
    expect(baseIngredients).not.toHaveProperty("iron-gear-wheel");
  });
});
