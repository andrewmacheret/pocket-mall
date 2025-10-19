// Mock pako at the top level
jest.mock("pako", () => ({
  deflate: jest.fn(),
  inflate: jest.fn(),
}));

import {
  compressToBase64,
  decompressFromBase64,
  compressUrlData,
  decompressUrlData,
  // Backward compatibility aliases
  compressRecipes,
  decompressRecipes,
  compressGoals,
  decompressGoals,
} from "./compression";
import pako from "pako";

// Mock console methods to suppress error logs in tests
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

describe("Compression Utilities", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("compressToBase64", () => {
    test("compresses and encodes data correctly", () => {
      const testData = { test: "value" };
      const mockCompressed = new Uint8Array([1, 2, 3]); // Mock compressed data

      pako.deflate.mockReturnValue(mockCompressed);

      const result = compressToBase64(testData);

      expect(pako.deflate).toHaveBeenCalledWith(JSON.stringify(testData), {
        level: 9,
        windowBits: 15,
      });
      expect(result).toMatch(/^0/); // Should start with version prefix
      expect(typeof result).toBe("string");
    });

    test("handles null input gracefully", () => {
      const result = compressToBase64(null);
      expect(result).toBeNull();
      expect(pako.deflate).not.toHaveBeenCalled();
    });

    test("handles undefined input gracefully", () => {
      const result = compressToBase64(undefined);
      expect(result).toBeNull();
      expect(pako.deflate).not.toHaveBeenCalled();
    });

    test("handles compression errors gracefully", () => {
      pako.deflate.mockImplementation(() => {
        throw new Error("Compression failed");
      });

      const result = compressToBase64({ test: "value" });
      expect(result).toBeNull();
    });

    test("includes version prefix by default", () => {
      const testData = { test: "value" };
      const mockCompressed = new Uint8Array([1, 2, 3]);

      pako.deflate.mockReturnValue(mockCompressed);

      const result = compressToBase64(testData);

      expect(result).toMatch(/^0/); // Should start with version prefix
    });

    test("excludes version prefix when includeVersionPrefix is false", () => {
      const testData = { test: "value" };
      const mockCompressed = new Uint8Array([1, 2, 3]);

      pako.deflate.mockReturnValue(mockCompressed);

      const result = compressToBase64(testData, false);

      expect(result).not.toMatch(/^0/); // Should NOT start with version prefix
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });

    test("includes version prefix when includeVersionPrefix is true", () => {
      const testData = { test: "value" };
      const mockCompressed = new Uint8Array([1, 2, 3]);

      pako.deflate.mockReturnValue(mockCompressed);

      const result = compressToBase64(testData, true);

      expect(result).toMatch(/^0/); // Should start with version prefix
    });

    test("uses compression by default", () => {
      const testData = { test: "value" };
      const mockCompressed = new Uint8Array([1, 2, 3]);

      pako.deflate.mockReturnValue(mockCompressed);

      compressToBase64(testData);

      expect(pako.deflate).toHaveBeenCalledWith(JSON.stringify(testData), {
        level: 9,
        windowBits: 15,
      });
    });
  });

  describe("decompressFromBase64", () => {
    test("decompresses valid compressed string", () => {
      const originalData = { test: "value" };
      const mockDecompressed = JSON.stringify(originalData);

      pako.inflate.mockReturnValue(mockDecompressed);

      // Mock a valid compressed string (version prefix + base64)
      const compressedString = "0dGVzdA=="; // Mock base64

      const result = decompressFromBase64(compressedString);

      expect(pako.inflate).toHaveBeenCalledWith(expect.any(Uint8Array), {
        to: "string",
        windowBits: 15,
      });
      expect(result).toEqual(originalData);
    });

    test("handles invalid base64 string gracefully", () => {
      const result = decompressFromBase64("0invalid-base64!");
      expect(result).toBeNull();
    });

    test("handles empty string gracefully", () => {
      const result = decompressFromBase64("");
      expect(result).toBeNull();
    });

    test("handles null input gracefully", () => {
      const result = decompressFromBase64(null);
      expect(result).toBeNull();
    });

    test("handles decompression errors gracefully", () => {
      pako.inflate.mockImplementation(() => {
        throw new Error("Decompression failed");
      });

      const result = decompressFromBase64("0dGVzdA==");
      expect(result).toBeNull();
    });

    test("handles strings with version prefix", () => {
      const originalData = { test: "value" };
      const mockDecompressed = JSON.stringify(originalData);

      pako.inflate.mockReturnValue(mockDecompressed);

      const result = decompressFromBase64("0dGVzdA==");

      expect(result).toEqual(originalData);
    });

    test("handles strings without version prefix", () => {
      const originalData = { test: "value" };
      const mockDecompressed = JSON.stringify(originalData);

      pako.inflate.mockReturnValue(mockDecompressed);

      const result = decompressFromBase64("dGVzdA==");

      expect(result).toEqual(originalData);
    });

    test("auto-detects version prefix correctly", () => {
      const originalData = { blueprint: { test: "data" } };
      const mockDecompressed = JSON.stringify(originalData);

      pako.inflate.mockReturnValue(mockDecompressed);

      // Test with different version prefixes
      expect(decompressFromBase64("0dGVzdA==")).toEqual(originalData);
      expect(decompressFromBase64("1dGVzdA==")).toEqual(originalData);
      expect(decompressFromBase64("9dGVzdA==")).toEqual(originalData);
    });

    test("round-trip works for both formats", () => {
      const originalData = {
        recipes: { "iron-plate": [["furnace"], { "iron-ore": 1 }] },
      };
      const mockCompressed = new Uint8Array([1, 2, 3]);
      const mockDecompressed = JSON.stringify(originalData);

      pako.deflate.mockReturnValue(mockCompressed);
      pako.inflate.mockReturnValue(mockDecompressed);

      // Test with version prefix
      const compressedWithPrefix = compressToBase64(originalData, true);
      expect(compressedWithPrefix).toMatch(/^0/);
      expect(decompressFromBase64(compressedWithPrefix)).toEqual(originalData);

      // Test without version prefix
      const compressedWithoutPrefix = compressToBase64(originalData, false);
      expect(compressedWithoutPrefix).not.toMatch(/^0/);
      expect(decompressFromBase64(compressedWithoutPrefix)).toEqual(
        originalData
      );
    });

    test("uses decompression by default", () => {
      const originalData = { test: "value" };
      const mockDecompressed = JSON.stringify(originalData);

      pako.inflate.mockReturnValue(mockDecompressed);

      decompressFromBase64("0dGVzdA==");

      expect(pako.inflate).toHaveBeenCalledWith(expect.any(Uint8Array), {
        to: "string",
        windowBits: 15,
      });
    });
  });

  describe("compressRecipes", () => {
    test("round-trip compression and decompression works", () => {
      const mockRecipeData = {
        "iron-plate": [["furnace"], { "iron-ore": 1 }],
        "steel-plate": [["furnace"], { "iron-plate": 5 }],
        "advanced-circuit": [
          ["assembling-machine-1", "assembling-machine-2"],
          { "copper-cable": 4, "electronic-circuit": 2, "plastic-bar": 2 },
        ],
      };

      // Mock compression
      const mockCompressed = new Uint8Array([1, 2, 3]);
      pako.deflate.mockReturnValue(mockCompressed);

      const compressed = compressRecipes(mockRecipeData);
      expect(compressed).toMatch(/^0/);

      // Mock decompression
      pako.inflate.mockReturnValue(JSON.stringify(mockRecipeData));

      const decompressed = decompressRecipes(compressed);
      expect(decompressed).toEqual(mockRecipeData);
    });

    test("validates decompressed data is an object", () => {
      pako.inflate.mockReturnValue('"not an object"');

      const result = decompressRecipes("0dGVzdA==");
      expect(result).toBeNull(); // Should return null for non-object data
    });

    test("handles null recipes input", () => {
      const result = compressRecipes(null);
      expect(result).toBeNull();
    });

    test("handles non-object recipes input", () => {
      const result = compressRecipes("not an object");
      expect(result).toBeNull();
    });

    test("includes version prefix by default", () => {
      const mockRecipeData = { "iron-plate": [["furnace"], { "iron-ore": 1 }] };
      const mockCompressed = new Uint8Array([1, 2, 3]);

      pako.deflate.mockReturnValue(mockCompressed);

      const result = compressRecipes(mockRecipeData);

      expect(result).toMatch(/^0/); // Should start with version prefix
    });

    test("includes version prefix when includeVersionPrefix is true", () => {
      const mockRecipeData = { "iron-plate": [["furnace"], { "iron-ore": 1 }] };
      const mockCompressed = new Uint8Array([1, 2, 3]);

      pako.deflate.mockReturnValue(mockCompressed);

      const result = compressRecipes(mockRecipeData);

      expect(result).toMatch(/^0/); // Should start with version prefix
    });

    test("uses compression by default", () => {
      const mockRecipeData = { "iron-plate": [["furnace"], { "iron-ore": 1 }] };
      const mockCompressed = new Uint8Array([1, 2, 3]);

      pako.deflate.mockReturnValue(mockCompressed);

      compressRecipes(mockRecipeData);

      expect(pako.deflate).toHaveBeenCalled();
    });

    test("generates URL-safe base64 output", () => {
      const mockRecipeData = { "iron-plate": [["furnace"], { "iron-ore": 1 }] };
      const mockCompressed = new Uint8Array([1, 2, 3]);

      pako.deflate.mockReturnValue(mockCompressed);
      // Mock btoa to return a string with characters that need URL-safe encoding
      const originalBtoa = global.btoa;
      global.btoa = jest.fn().mockReturnValue("AQID+/="); // Contains +, /, =

      const result = compressRecipes(mockRecipeData);

      // Should not contain +, /, or = characters
      expect(result).not.toMatch(/[+/=]/);
      expect(result).toBe("0AQID-_"); // Should be URL-safe (version prefix + URL-safe base64)

      global.btoa = originalBtoa;
    });
  });

  describe("decompressRecipes", () => {
    test("handles invalid input gracefully", () => {
      const result = decompressRecipes("invalid");
      expect(result).toBeNull();
    });

    test("handles empty string input", () => {
      const result = decompressRecipes("");
      expect(result).toBeNull();
    });

    test("handles decompression failure gracefully", () => {
      pako.inflate.mockImplementation(() => {
        throw new Error("Decompression failed");
      });

      const result = decompressRecipes("0dGVzdA==");
      expect(result).toBeNull();
    });

    test("decompresses URL-safe base64 strings", () => {
      const originalData = { "iron-plate": [["furnace"], { "iron-ore": 1 }] };
      pako.inflate.mockReturnValue(JSON.stringify(originalData));

      // Mock URL-safe base64 string (- instead of +, _ instead of /, no =)
      const urlSafeBase64 = "0AQID-_";

      const result = decompressRecipes(urlSafeBase64);

      expect(result).toEqual(originalData);
      // Verify that atob was called with properly converted base64
      expect(pako.inflate).toHaveBeenCalled();
    });
  });

  describe("Factorio blueprint format compatibility", () => {
    test("uses correct version prefix", () => {
      const testData = { blueprint: { version: 123 } };
      const mockCompressed = new Uint8Array([1, 2, 3]);

      pako.deflate.mockReturnValue(mockCompressed);

      const compressed = compressToBase64(testData);
      expect(compressed).toMatch(/^0/); // Should start with '0' like Factorio
    });

    test("decompression removes version prefix correctly", () => {
      const originalData = { blueprint: { version: 123 } };

      pako.inflate.mockReturnValue(JSON.stringify(originalData));

      // Create a proper mock compressed string that looks like real base64
      const mockBytes = new Uint8Array([1, 2, 3, 4, 5]);
      const mockBase64 = btoa(String.fromCharCode.apply(null, mockBytes));
      const compressed = "0" + mockBase64;
      const decompressed = decompressFromBase64(compressed);

      expect(decompressed).toEqual(originalData);
    });

    test("handles different version prefixes", () => {
      const testData = { test: "value" };

      pako.inflate.mockReturnValue(JSON.stringify(testData));

      // Create a proper mock compressed string that looks like real base64
      const mockBytes = new Uint8Array([10, 20, 30, 40]);
      const mockBase64 = btoa(String.fromCharCode.apply(null, mockBytes));
      const compressedWithDifferentVersion = "1" + mockBase64;
      const decompressed = decompressFromBase64(compressedWithDifferentVersion);

      expect(decompressed).toEqual(testData);
    });
  });
});

describe("Compression Utilities", () => {
  const mockRecipeData = {
    "iron-plate": [["furnace"], { "iron-ore": 1 }],
    "steel-plate": [["furnace"], { "iron-plate": 5 }],
    "advanced-circuit": [
      ["assembling-machine-1", "assembling-machine-2"],
      { "electronic-circuit": 2, "plastic-bar": 2, "copper-cable": 4 },
    ],
  };

  describe("compressToBase64", () => {
    test("compresses simple object successfully", () => {
      const simpleData = { test: "value" };
      const result = compressToBase64(simpleData);

      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
      expect(result.charAt(0)).toBe("0"); // Should have version prefix
    });

    test("compresses complex recipe data", () => {
      const result = compressToBase64(mockRecipeData);

      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
      expect(result.charAt(0)).toBe("0");
    });

    test("handles null input gracefully", () => {
      const result = compressToBase64(null);
      expect(result).toBeNull();
    });

    test("handles undefined input gracefully", () => {
      const result = compressToBase64(undefined);
      expect(result).toBeNull();
    });
  });

  describe("decompressFromBase64", () => {
    test("decompresses valid compressed string", () => {
      const originalData = { test: "value" };
      const mockCompressed = new Uint8Array([1, 2, 3]);
      const mockDecompressed = JSON.stringify(originalData);

      pako.deflate.mockReturnValue(mockCompressed);
      pako.inflate.mockReturnValue(mockDecompressed);

      const compressed = compressToBase64(originalData);
      const decompressed = decompressFromBase64(compressed);

      expect(decompressed).toEqual(originalData);
    });

    test("handles invalid base64 string gracefully", () => {
      const result = decompressFromBase64("invalid-base64!@#");
      expect(result).toBeNull();
    });

    test("handles string without version prefix", () => {
      const result = decompressFromBase64("");
      expect(result).toBeNull();
    });

    test("handles null input gracefully", () => {
      const result = decompressFromBase64(null);
      expect(result).toBeNull();
    });
  });

  describe("compressRecipes", () => {
    test("compresses valid recipe object", () => {
      const result = compressRecipes(mockRecipeData);

      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
    });

    test("returns null for invalid input", () => {
      expect(compressRecipes(null)).toBeNull();
      expect(compressRecipes(undefined)).toBeNull();
      expect(compressRecipes("string")).toBeNull();
      expect(compressRecipes(123)).toBeNull();
    });

    test("compresses empty object", () => {
      const result = compressRecipes({});
      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
    });
  });

  describe("decompressRecipes", () => {
    test("round-trip compression and decompression works", () => {
      const mockCompressed = new Uint8Array([1, 2, 3]);
      const mockDecompressed = JSON.stringify(mockRecipeData);

      pako.deflate.mockReturnValue(mockCompressed);
      pako.inflate.mockReturnValue(mockDecompressed);

      const compressed = compressRecipes(mockRecipeData);
      const decompressed = decompressRecipes(compressed);

      expect(decompressed).toEqual(mockRecipeData);
    });

    test("validates decompressed data is an object", () => {
      pako.inflate.mockReturnValue('"not an object"');

      const result = decompressRecipes("0dGVzdA==");
      expect(result).toBeNull(); // Should return null for non-object data
    });

    test("returns null for invalid input", () => {
      expect(decompressRecipes(null)).toBeNull();
      expect(decompressRecipes(undefined)).toBeNull();
      expect(decompressRecipes("")).toBeNull();
      expect(decompressRecipes(123)).toBeNull();
    });

    test("handles compression failure gracefully", () => {
      // Mock pako to throw an error
      const pako = require("pako");
      pako.inflate.mockImplementationOnce(() => {
        throw new Error("Decompression failed");
      });

      const result = decompressRecipes("0validbase64string");
      expect(result).toBeNull();
    });
  });

  describe("Factorio blueprint format compatibility", () => {
    test("compressed string starts with version character", () => {
      const result = compressToBase64({ test: "data" });
      expect(result.charAt(0)).toBe("0");
    });

    test("decompression removes version prefix correctly", () => {
      const originalData = { blueprint: { version: 123 } };
      const mockCompressed = new Uint8Array([1, 2, 3]);
      const mockDecompressed = JSON.stringify(originalData);

      pako.deflate.mockReturnValue(mockCompressed);
      pako.inflate.mockReturnValue(mockDecompressed);

      const compressed = compressToBase64(originalData);
      const decompressed = decompressFromBase64(compressed);

      expect(decompressed).toEqual(originalData);
    });

    test("handles different version prefixes", () => {
      const testData = { test: "value" };

      pako.inflate.mockReturnValue(JSON.stringify(testData));

      // Create a proper mock compressed string that looks like real base64
      const mockBytes = new Uint8Array([15, 25, 35, 45]);
      const mockBase64 = btoa(String.fromCharCode.apply(null, mockBytes));
      const compressedWithDifferentVersion = "1" + mockBase64;
      const decompressed = decompressFromBase64(compressedWithDifferentVersion);

      expect(decompressed).toEqual(testData);
    });
  });

  describe("Error handling", () => {
    test("logs errors when compression fails", () => {
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Mock pako to throw an error
      const pako = require("pako");
      pako.deflate.mockImplementationOnce(() => {
        throw new Error("Compression failed");
      });

      const result = compressToBase64({ test: "data" });

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error compressing data:",
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    test("logs errors when decompression fails", () => {
      const consoleSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = decompressFromBase64("0invalid-data");

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("compressUrlData and decompressUrlData", () => {
    test("compresses and decompresses recipes (backward compatibility)", () => {
      const mockRecipeData = {
        "iron-plate": [["furnace"], { "iron-ore": 1 }],
        "steel-plate": [["furnace"], { "iron-plate": 5 }],
      };

      const mockCompressed = new Uint8Array([1, 2, 3]);
      pako.deflate.mockReturnValue(mockCompressed);
      pako.inflate.mockReturnValue(JSON.stringify(mockRecipeData));

      const compressed = compressUrlData(mockRecipeData);
      expect(compressed).not.toMatch(/^0/); // URL data should not have version prefix
      expect(compressed).not.toMatch(/[+/=]/);

      const decompressed = decompressUrlData(compressed);
      expect(decompressed).toEqual(mockRecipeData);
    });

    test("compresses and decompresses goals array", () => {
      const mockGoalsData = [
        { item: "iron-plate", machine: "furnace", amount: 100 },
        { item: "steel-plate", machine: "", amount: 50 },
      ];

      const mockCompressed = new Uint8Array([4, 5, 6]);
      pako.deflate.mockReturnValue(mockCompressed);
      pako.inflate.mockReturnValue(JSON.stringify(mockGoalsData));

      const compressed = compressUrlData(mockGoalsData);
      expect(compressed).not.toMatch(/^0/); // URL data should not have version prefix
      expect(compressed).not.toMatch(/[+/=]/);

      const decompressed = decompressUrlData(compressed);
      expect(Array.isArray(decompressed)).toBe(true);
      expect(decompressed).toEqual(mockGoalsData);
    });

    test("handles empty arrays", () => {
      const result = compressUrlData([]);
      expect(result).toBeNull();
    });

    test("handles null input", () => {
      const result = compressUrlData(null);
      expect(result).toBeNull();
    });

    test("handles undefined input", () => {
      const result = compressUrlData(undefined);
      expect(result).toBeNull();
    });

    test("compresses different data types", () => {
      const testCases = [
        { data: { key: "value" }, type: "object" },
        { data: [1, 2, 3], type: "array" },
        { data: "string", type: "string" },
        { data: 123, type: "number" },
      ];

      testCases.forEach(({ data, type }) => {
        const mockCompressed = new Uint8Array([7, 8, 9]);
        pako.deflate.mockReturnValue(mockCompressed);
        pako.inflate.mockReturnValue(JSON.stringify(data));

        const compressed = compressUrlData(data);
        expect(compressed).toBeTruthy();
        expect(compressed).not.toMatch(/[+/=]/);

        const decompressed = decompressUrlData(compressed);
        expect(decompressed).toEqual(data);
      });
    });

    test("backward compatibility aliases work correctly", () => {
      const mockData = { "iron-plate": [["furnace"], { "iron-ore": 1 }] };
      const mockCompressed = new Uint8Array([10, 11, 12]);

      pako.deflate.mockReturnValue(mockCompressed);
      pako.inflate.mockReturnValue(JSON.stringify(mockData));

      // Test that the aliases work differently from URL functions (version prefix behavior)
      expect(compressRecipes(mockData)).not.toEqual(compressUrlData(mockData));
      expect(compressGoals([mockData])).not.toEqual(
        compressUrlData([mockData])
      );

      const compressed = compressUrlData(mockData);
      expect(decompressRecipes(compressed)).toEqual(
        decompressUrlData(compressed)
      );
      expect(decompressGoals(compressed)).toEqual(
        decompressUrlData(compressed)
      );
    });
  });
});
