import pako from "pako";

/**
 * Compresses and base64 encodes data (using Factorio blueprint format)
 * Format: version_byte + base64(zlib_compress(json))
 * @param {any} data - The data to compress
 * @param {boolean} includeVersionPrefix - Whether to include the '0' version prefix (default: true)
 * @returns {string} - Base64 encoded compressed string with optional version prefix
 */
export function compressToBase64(data, includeVersionPrefix = true) {
  try {
    // Handle null/undefined input
    if (data === null || data === undefined) {
      return null;
    }

    // Convert data to JSON string
    const jsonString = JSON.stringify(data);

    // Compress using zlib (same as Factorio blueprints)
    const compressed = pako.deflate(jsonString, { level: 9, windowBits: 15 });

    // Convert to base64 (standard format for Factorio blueprints)
    const base64 = btoa(String.fromCharCode.apply(null, compressed));

    // Add version prefix (using '0' like Factorio) if requested
    if (includeVersionPrefix) {
      return "0" + base64;
    } else {
      return base64;
    }
  } catch (error) {
    console.error("Error compressing data:", error);
    return null;
  }
}

/**
 * Decompresses base64 encoded data (Factorio blueprint format)
 * @param {string} compressedString - Base64 encoded string (with or without version prefix)
 * @returns {any} - Decompressed data object
 */
export function decompressFromBase64(compressedString) {
  try {
    // Handle null/undefined/empty input
    if (!compressedString || typeof compressedString !== "string") {
      return null;
    }

    let base64String = compressedString;

    // Check if the string starts with a version prefix (digit followed by base64)
    // If so, remove the first character
    if (/^[0-9]/.test(compressedString)) {
      base64String = compressedString.slice(1);
    }

    // Decode from base64
    const binaryString = atob(base64String);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Decompress using inflate (zlib format)
    const jsonString = pako.inflate(bytes, { to: "string", windowBits: 15 });

    // Parse JSON
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Error decompressing data:", error);
    return null;
  }
}

/**
 * Compresses data to a URL-safe base64 string
 * @param {any} data - The data to compress (object, array, etc.)
 * @returns {string|null} - Compressed URL-safe base64 string or null if compression fails
 */
export function compressUrlData(data) {
  // Validate input exists and is not null/undefined
  if (data === null || data === undefined) {
    return null;
  }

  // For arrays, filter empty arrays
  if (Array.isArray(data) && data.length === 0) {
    return null;
  }

  // Don't include version prefix for URL data since we have version in URL
  const base64String = compressToBase64(data, false);
  if (!base64String) {
    return null;
  }
  // Make URL-safe by replacing characters that get URL encoded
  return base64String.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/**
 * Safely decompresses data from URL-safe base64 storage
 * @param {string} compressedString - Compressed URL-safe base64 string
 * @returns {any|null} - Decompressed data or null if decompression fails
 */
export function decompressUrlData(compressedString) {
  if (!compressedString || typeof compressedString !== "string") {
    return null;
  }

  // Convert URL-safe base64 back to regular base64
  let regularBase64 = compressedString.replace(/-/g, "+").replace(/_/g, "/");

  // URL data doesn't use version prefix, just add padding if needed
  const paddingLength = (4 - (regularBase64.length % 4)) % 4;
  regularBase64 = regularBase64 + "=".repeat(paddingLength);

  const decompressed = decompressFromBase64(regularBase64);

  // Return the decompressed data (could be object, array, etc.)
  return decompressed;
}

// Backward compatibility exports with original validation behavior and version prefixes
export function compressRecipes(recipes) {
  // Validate input is an object (not null, not an array, not a primitive) - original behavior
  if (!recipes || typeof recipes !== "object" || Array.isArray(recipes)) {
    return null;
  }

  // Use compressToBase64 with version prefix for backward compatibility
  const base64String = compressToBase64(recipes, true);
  if (!base64String) {
    return null;
  }
  // Make URL-safe by replacing characters that get URL encoded
  return base64String.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export function decompressRecipes(compressedString) {
  if (!compressedString || typeof compressedString !== "string") {
    return null;
  }

  // Convert URL-safe base64 back to regular base64
  let regularBase64 = compressedString.replace(/-/g, "+").replace(/_/g, "/");

  // Handle version prefix first (before padding) - for backward compatibility
  if (/^[0-9]/.test(regularBase64)) {
    const base64WithoutVersion = regularBase64.slice(1);
    // Add back padding if needed (only if length is not divisible by 4)
    const paddingLength = (4 - (base64WithoutVersion.length % 4)) % 4;
    const paddedBase64WithoutVersion =
      base64WithoutVersion + "=".repeat(paddingLength);
    regularBase64 = regularBase64[0] + paddedBase64WithoutVersion;
  } else {
    // No version prefix, just add padding if needed
    const paddingLength = (4 - (regularBase64.length % 4)) % 4;
    regularBase64 = regularBase64 + "=".repeat(paddingLength);
  }

  const result = decompressFromBase64(regularBase64);
  // Validate that the decompressed data looks like recipes - original behavior
  if (result && typeof result === "object" && !Array.isArray(result)) {
    return result;
  }
  return null;
}

export function compressGoals(goals) {
  // Use compressToBase64 with version prefix for backward compatibility
  const base64String = compressToBase64(goals, true);
  if (!base64String) {
    return null;
  }
  // Make URL-safe by replacing characters that get URL encoded
  return base64String.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export function decompressGoals(compressedString) {
  if (!compressedString || typeof compressedString !== "string") {
    return null;
  }

  // Convert URL-safe base64 back to regular base64
  let regularBase64 = compressedString.replace(/-/g, "+").replace(/_/g, "/");

  // Handle version prefix first (before padding) - for backward compatibility
  if (/^[0-9]/.test(regularBase64)) {
    const base64WithoutVersion = regularBase64.slice(1);
    // Add back padding if needed (only if length is not divisible by 4)
    const paddingLength = (4 - (base64WithoutVersion.length % 4)) % 4;
    const paddedBase64WithoutVersion =
      base64WithoutVersion + "=".repeat(paddingLength);
    regularBase64 = regularBase64[0] + paddedBase64WithoutVersion;
  } else {
    // No version prefix, just add padding if needed
    const paddingLength = (4 - (regularBase64.length % 4)) % 4;
    regularBase64 = regularBase64 + "=".repeat(paddingLength);
  }

  return decompressFromBase64(regularBase64);
}
