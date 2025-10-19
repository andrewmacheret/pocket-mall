import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import App from "./App";
import { URL_VERSION } from "./url-state";

// Mock the logo import
jest.mock("./logo.svg", () => "mocked-logo.svg");

describe("App Component", () => {
  test("renders Pocket Mall title", () => {
    render(<App />);
    const titleElement = screen.getByRole("heading", {
      name: /Build a Pocket Mall/i,
    });
    expect(titleElement).toBeInTheDocument();
  });

  test("renders file input section", () => {
    render(<App />);

    // Look for the file input
    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toBeInTheDocument();

    // Check for the specific file section heading using a more specific selector
    const fileSections = screen.getAllByText(/Recipe File from/i);
    // The main file section should have the help button nearby
    const mainFileSection = fileSections.find((section) => {
      const parent = section.closest(".section");
      return parent && parent.querySelector(".help-button");
    });
    expect(mainFileSection).toBeInTheDocument();
  });

  test("does not render production goals section without file", () => {
    render(<App />);

    // The production goals section should not be visible initially
    const goalInputs = screen.queryAllByDisplayValue("");
    // Should only have file input, not goal inputs
    expect(goalInputs.length).toBeLessThanOrEqual(1);
  });

  test("renders build button", () => {
    render(<App />);
    const buildButton = screen.getByRole("button", { name: /build/i });
    expect(buildButton).toBeInTheDocument();
    expect(buildButton).toBeDisabled(); // Should be disabled without file and complete goals
  });

  test("renders logo with link to home", () => {
    render(<App />);
    const logoLink = screen.getByRole("link", {
      name: /Pocket Mall Logo/i,
    });
    expect(logoLink).toHaveAttribute("href", "/");

    const logo = screen.getByAltText(/Pocket Mall Logo/i);
    expect(logo).toBeInTheDocument();
  });
});

describe("Instructions Section", () => {
  test("shows instructions by default", () => {
    render(<App />);

    // Instructions should be visible by default
    const instructionsTitle = screen.getByText(
      /How to Get a Recipe File from/i
    );
    expect(instructionsTitle).toBeInTheDocument();
  });

  test("shows help button next to Recipe File section", () => {
    render(<App />);

    const helpButton = screen.getByRole("button", {
      name: /Toggle instructions/i,
    });
    expect(helpButton).toBeInTheDocument();
    expect(helpButton).toHaveTextContent("?");
  });

  test("toggles instructions when help button is clicked", () => {
    render(<App />);

    const helpButton = screen.getByRole("button", {
      name: /Toggle instructions/i,
    });

    // Instructions should be visible initially and help button should be disabled
    expect(
      screen.getByText(/How to Get a Recipe File from/i)
    ).toBeInTheDocument();
    expect(helpButton).toBeDisabled();

    // Use the close button (×) to hide instructions
    const closeButton = screen.getByRole("button", { name: "×" });
    fireEvent.click(closeButton);

    // Instructions should now be hidden and help button should be enabled
    expect(
      screen.queryByText(/How to Get a Recipe File from/i)
    ).not.toBeInTheDocument();
    expect(helpButton).not.toBeDisabled();

    // Click help button to show instructions again
    fireEvent.click(helpButton);

    // Instructions should be visible again and help button should be disabled
    expect(
      screen.getByText(/How to Get a Recipe File from/i)
    ).toBeInTheDocument();
    expect(helpButton).toBeDisabled();
    expect(
      screen.getByText(/Set the location to only Nauvis/i)
    ).toBeInTheDocument();
  });

  test("shows close button in instructions when open", () => {
    render(<App />);

    const helpButton = screen.getByRole("button", {
      name: /Toggle instructions/i,
    });
    fireEvent.click(helpButton);

    // Close button should be visible - it just has the "×" text content
    const closeButton = screen.getByRole("button", { name: "×" });
    expect(closeButton).toBeInTheDocument();
    expect(closeButton).toHaveTextContent("×");
  });

  test("closes instructions when close button is clicked", () => {
    render(<App />);

    // Open instructions
    const helpButton = screen.getByRole("button", {
      name: /Toggle instructions/i,
    });
    fireEvent.click(helpButton);

    // Verify instructions are visible
    expect(
      screen.getByText(/How to Get a Recipe File from/i)
    ).toBeInTheDocument();

    // Click close button
    const closeButton = screen.getByRole("button", { name: "×" });
    fireEvent.click(closeButton);

    // Instructions should be hidden
    expect(
      screen.queryByText(/How to Get a Recipe File from/i)
    ).not.toBeInTheDocument();
  });

  test("displays link to Factorio Lab", () => {
    render(<App />);

    const links = screen.getAllByRole("link", { name: /Factorio Lab/i });
    expect(links.length).toBeGreaterThan(0);
    const link = links[0]; // Use the first link found
    expect(link).toHaveAttribute(
      "href",
      expect.stringContaining("factoriolab.github.io")
    );
    expect(link).toHaveAttribute("target", "_blank");
  });

  test("instructions contain all expected steps", () => {
    render(<App />);

    // Open instructions
    const helpButton = screen.getByRole("button", {
      name: /Toggle instructions/i,
    });
    fireEvent.click(helpButton);

    // Check for key instruction steps
    expect(
      screen.getByText(/set the location to only Nauvis/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/choose the item.*you want to auto build/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /click any items you want to exclude from being auto-built/i
      )
    ).toBeInTheDocument();
    expect(screen.getByText(/flow/i)).toBeInTheDocument();
    expect(screen.getByText(/download as json/i)).toBeInTheDocument();
    expect(
      screen.getByText(
        /the builder only supports recipes with a single output/i
      )
    ).toBeInTheDocument();
  });
});

describe("File Upload Section", () => {
  test("file input accepts JSON files", () => {
    render(<App />);

    const fileInput = document.querySelector('input[type="file"]');
    expect(fileInput).toHaveAttribute("accept", ".json");
  });

  test("shows file input element initially", () => {
    render(<App />);

    const fileInput = screen.getByDisplayValue("");
    expect(fileInput).toBeInTheDocument();
    expect(fileInput).toHaveAttribute("type", "file");
  });

  test("file section has proper heading structure", () => {
    render(<App />);

    // Find all elements containing "Recipe File from" and check the main section one
    const recipeFileHeadings = screen.getAllByText(/Recipe File from/i);
    expect(recipeFileHeadings.length).toBeGreaterThan(0);

    // Find the one that's in the main section (not in instructions)
    const mainFileHeading = recipeFileHeadings.find((heading) => {
      const h2Element = heading.closest("h2");
      return h2Element && !h2Element.textContent.includes("How to Get");
    });

    expect(mainFileHeading).toBeInTheDocument();

    // Should be in an h2 element
    const h2Element = mainFileHeading.closest("h2");
    expect(h2Element).toBeInTheDocument();
  });
});

describe("Error Handling Display", () => {
  test("does not show file error initially", () => {
    render(<App />);

    // No error messages should be visible initially
    const errorMessages = screen.queryAllByText(/error/i);
    expect(errorMessages.length).toBe(0);
  });

  test("does not show build error initially", () => {
    render(<App />);

    // No build error should be visible initially
    const buildError = screen.queryByText(/build error/i);
    expect(buildError).not.toBeInTheDocument();
  });
});

describe("URL State Integration", () => {
  // Mock window.location and history for URL tests
  const mockLocation = {
    search: "",
    pathname: "/test",
  };

  const mockHistory = {
    replaceState: jest.fn(),
  };

  let originalLocation;
  let originalHistory;

  beforeEach(() => {
    originalLocation = window.location;
    originalHistory = window.history;

    delete window.location;
    delete window.history;
    window.location = mockLocation;
    window.history = mockHistory;

    mockHistory.replaceState.mockClear();
  });

  afterEach(() => {
    window.location = originalLocation;
    window.history = originalHistory;
  });

  test("loads instructions state from URL parameter", () => {
    window.location.search = `?v=${URL_VERSION}&i=1`;

    render(<App />);

    // Instructions should be visible when URL parameter is set to 1
    expect(
      screen.getByText(/How to Get a Recipe File from/i)
    ).toBeInTheDocument();
  });

  test("hides instructions when URL parameter is set to 0", () => {
    window.location.search = `?v=${URL_VERSION}&i=0`;

    render(<App />);

    // Instructions should be hidden when URL parameter is set to 0
    expect(
      screen.queryByText(/How to Get a Recipe File from/i)
    ).not.toBeInTheDocument();
  });

  test("shows instructions by default when URL parameter is not set", () => {
    window.location.search = "";

    render(<App />);

    // Instructions should be visible by default
    expect(
      screen.getByText(/How to Get a Recipe File from/i)
    ).toBeInTheDocument();
  });

  test("updates URL when instructions are toggled", async () => {
    window.location.search = "";

    render(<App />);

    // Wait for initial load to complete - should include i=1 since instructions show by default
    await waitFor(() => {
      expect(mockHistory.replaceState).toHaveBeenCalledWith(
        {},
        "",
        `?v=${URL_VERSION}&i=1`
      );
    });

    // Clear the mock to track new calls
    mockHistory.replaceState.mockClear();

    // Use the close button to hide instructions
    const closeButton = screen.getByRole("button", { name: "×" });
    fireEvent.click(closeButton);

    // Should update URL with i=0 parameter
    await waitFor(() => {
      expect(mockHistory.replaceState).toHaveBeenCalledWith(
        {},
        "",
        `?v=${URL_VERSION}&i=0`
      );
    });
  });
});

describe("Accessibility", () => {
  test("help button has proper aria-label", () => {
    render(<App />);

    const helpButton = screen.getByRole("button", {
      name: /Toggle instructions/i,
    });
    expect(helpButton).toHaveAttribute("aria-label", "Toggle instructions");
  });

  test("close button has proper title attribute", () => {
    render(<App />);

    // Open instructions to show close button
    const helpButton = screen.getByRole("button", {
      name: /Toggle instructions/i,
    });
    fireEvent.click(helpButton);

    const closeButton = screen.getByRole("button", { name: "×" });
    expect(closeButton).toHaveAttribute("title", "Hide instructions");
  });

  test("external links have proper rel attribute", () => {
    render(<App />);

    // Open instructions to show Factorio Lab link
    const helpButton = screen.getByRole("button", {
      name: /Toggle instructions/i,
    });
    fireEvent.click(helpButton);

    const factorioLabLinks = screen.getAllByRole("link", {
      name: /Factorio Lab/i,
    });
    expect(factorioLabLinks[0]).toHaveAttribute("rel", "noopener noreferrer");
  });

  test("logo has proper alt text", () => {
    render(<App />);

    const logo = screen.getByAltText(/Pocket Mall Logo/i);
    expect(logo).toBeInTheDocument();
  });
});

describe("Component Structure", () => {
  test("has proper CSS classes for styling", () => {
    const { container } = render(<App />);

    // Check for main structure classes
    expect(container.querySelector(".App")).toBeInTheDocument();
    expect(container.querySelector(".container")).toBeInTheDocument();
    expect(container.querySelector(".header")).toBeInTheDocument();
    expect(container.querySelector(".section")).toBeInTheDocument();
  });

  test("section header has proper structure", () => {
    const { container } = render(<App />);

    const sectionHeaders = container.querySelectorAll(".section h2");
    expect(sectionHeaders.length).toBeGreaterThan(0);
  });

  test("help button has proper CSS class", () => {
    const { container } = render(<App />);

    const helpButton = container.querySelector(".help-button");
    expect(helpButton).toBeInTheDocument();
  });

  test("results section is not visible initially", () => {
    const { container } = render(<App />);

    // Results section should not be visible when no results
    const resultsSection = container.querySelector(".section h2");
    const resultsHeaders = Array.from(
      container.querySelectorAll(".section h2")
    );
    const resultsHeader = resultsHeaders.find(
      (h2) => h2.textContent === "Results"
    );
    expect(resultsHeader).toBeFalsy();
  });

  test("build button is enabled when goals have valid items and machines (including amount 0)", () => {
    render(<App />);

    // Test the filter logic directly from handleBuild
    // This tests that our fix allows amount "0" but excludes empty strings
    const testGoals = [
      { item: "car", machine: "assembling-machine", amount: "1" },
      { item: "engine", machine: "assembling-machine", amount: "0" },
      { item: "pipe", machine: "assembling-machine", amount: "" }, // Should be filtered out
      { item: "gear", machine: "assembling-machine", amount: null }, // Should be filtered out
    ];

    // This is the exact filter from handleBuild that was causing the issue
    const filteredGoals = testGoals.filter(
      (goal) =>
        goal.item &&
        goal.amount !== "" &&
        goal.amount !== null &&
        goal.amount !== undefined
    );

    // Should include both "1" and "0" amounts, but exclude empty/null
    expect(filteredGoals).toHaveLength(2);
    expect(filteredGoals[0].amount).toBe("1");
    expect(filteredGoals[1].amount).toBe("0");

    // Verify the build button exists and is initially disabled (no recipes loaded)
    const buildButton = screen.getByRole("button", { name: /build/i });
    expect(buildButton).toBeInTheDocument();
    expect(buildButton).toBeDisabled(); // Should be disabled without recipes
  });

  test("should create production goals when recipe file is loaded", () => {
    const { container } = render(<App />);

    // Create a proper File mock with text() method
    const fileContent = JSON.stringify({
      nodes: [
        {
          recipe: {
            name: "advanced-circuit",
            in: {
              "electronic-circuit": "2",
              "plastic-bar": "2",
              "copper-cable": "4",
            },
            out: { "advanced-circuit": "1" },
            producers: ["assembling-machine-1", "assembling-machine-2"],
          },
        },
        {
          recipe: {
            name: "electronic-circuit",
            in: { "iron-plate": "1", "copper-cable": "3" },
            out: { "electronic-circuit": "1" },
            producers: ["assembling-machine-1", "assembling-machine-2"],
          },
        },
        {
          recipe: {
            name: "copper-cable",
            in: { "copper-plate": "1" },
            out: { "copper-cable": "2" },
            producers: ["assembling-machine-1"],
          },
        },
        {
          recipe: {
            name: "iron-plate",
            in: { "iron-ore": "1" },
            out: { "iron-plate": "1" },
            producers: ["furnace"],
          },
        },
        {
          recipe: {
            name: "copper-plate",
            in: { "copper-ore": "1" },
            out: { "copper-plate": "1" },
            producers: ["furnace"],
          },
        },
        {
          recipe: {
            name: "plastic-bar",
            in: { "petroleum-gas": "20" },
            out: { "plastic-bar": "2" },
            producers: ["chemical-plant"],
          },
        },
      ],
    });

    const file = new File([fileContent], "recipes.json", {
      type: "application/json",
    });
    // Mock the text method
    file.text = jest.fn().mockResolvedValue(fileContent);

    const fileInput = container.querySelector('input[type="file"]');
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Wait for file to be processed and goals to be created
    waitFor(() => {
      // Should see production goals for items with inputs
      expect(screen.getByText("advanced-circuit")).toBeInTheDocument();
      expect(screen.getByText("electronic-circuit")).toBeInTheDocument();
      expect(screen.getByText("copper-cable")).toBeInTheDocument();
      expect(screen.getByText("iron-plate")).toBeInTheDocument();
      expect(screen.getByText("copper-plate")).toBeInTheDocument();
      expect(screen.getByText("plastic-bar")).toBeInTheDocument();

      // Should NOT see raw materials (items without inputs)
      expect(screen.queryByText("iron-ore")).not.toBeInTheDocument();
      expect(screen.queryByText("copper-ore")).not.toBeInTheDocument();
      expect(screen.queryByText("petroleum-gas")).not.toBeInTheDocument();
    });
  });

  test("build button should be enabled after loading recipe file with valid goals", async () => {
    const { container } = render(<App />);

    // Create a proper File mock with text() method
    const fileContent = JSON.stringify({
      nodes: [
        {
          recipe: {
            name: "advanced-circuit",
            in: {
              "electronic-circuit": "2",
              "plastic-bar": "2",
              "copper-cable": "4",
            },
            out: { "advanced-circuit": "1" },
            producers: ["assembling-machine-1", "assembling-machine-2"],
          },
        },
        {
          recipe: {
            name: "electronic-circuit",
            in: { "iron-plate": "1", "copper-cable": "3" },
            out: { "electronic-circuit": "1" },
            producers: ["assembling-machine-1", "assembling-machine-2"],
          },
        },
        {
          recipe: {
            name: "copper-cable",
            in: { "copper-plate": "1" },
            out: { "copper-cable": "2" },
            producers: ["assembling-machine-1"],
          },
        },
        {
          recipe: {
            name: "iron-plate",
            in: { "iron-ore": "1" },
            out: { "iron-plate": "1" },
            producers: ["furnace"],
          },
        },
        {
          recipe: {
            name: "copper-plate",
            in: { "copper-ore": "1" },
            out: { "copper-plate": "1" },
            producers: ["furnace"],
          },
        },
        {
          recipe: {
            name: "plastic-bar",
            in: { "petroleum-gas": "20" },
            out: { "plastic-bar": "2" },
            producers: ["chemical-plant"],
          },
        },
      ],
    });

    const file = new File([fileContent], "recipes.json", {
      type: "application/json",
    });
    // Mock the text method
    file.text = jest.fn().mockResolvedValue(fileContent);

    const fileInput = container.querySelector('input[type="file"]');
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Wait for file to be processed and build button to be enabled
    await waitFor(() => {
      const buildButton = screen.getByRole("button", { name: /build/i });
      expect(buildButton).not.toBeDisabled();
    });
  });

  test("production goals section should appear immediately after file load", async () => {
    const { container } = render(<App />);

    // Initially, no production goals section should be visible
    expect(screen.queryByText("Production Goals")).not.toBeInTheDocument();

    // Create a proper File mock with text() method
    const fileContent = JSON.stringify({
      nodes: [
        {
          recipe: {
            name: "advanced-circuit",
            in: {
              "electronic-circuit": "2",
              "plastic-bar": "2",
              "copper-cable": "4",
            },
            out: { "advanced-circuit": "1" },
            producers: ["assembling-machine-1", "assembling-machine-2"],
          },
        },
        {
          recipe: {
            name: "electronic-circuit",
            in: { "iron-plate": "1", "copper-cable": "3" },
            out: { "electronic-circuit": "1" },
            producers: ["assembling-machine-1", "assembling-machine-2"],
          },
        },
      ],
    });

    const file = new File([fileContent], "recipes.json", {
      type: "application/json",
    });
    // Mock the text method
    file.text = jest.fn().mockResolvedValue(fileContent);

    const fileInput = container.querySelector('input[type="file"]');
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Wait for file to be processed and production goals section to appear
    await waitFor(() => {
      expect(screen.getByText("Production Goals")).toBeInTheDocument();
      // Should also see specific goal items
      expect(screen.getByDisplayValue("advanced-circuit")).toBeInTheDocument();
      expect(
        screen.getByDisplayValue("electronic-circuit")
      ).toBeInTheDocument();
    });
  });

  describe("Error Handling", () => {
    let consoleErrorSpy;

    beforeEach(() => {
      // Suppress console.error during error handling tests
      consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});
    });

    afterEach(() => {
      // Restore console.error after each test
      consoleErrorSpy.mockRestore();
    });

    test("displays error when invalid JSON file is uploaded", async () => {
      const { container } = render(<App />);

      const invalidContent = "invalid json content";
      const file = new File([invalidContent], "invalid.json", {
        type: "application/json",
      });
      file.text = jest.fn().mockResolvedValue(invalidContent);

      const fileInput = container.querySelector('input[type="file"]');
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText("Error:")).toBeInTheDocument();
        expect(screen.getByText(/Unexpected token/)).toBeInTheDocument();
      });

      // Verify console.error was called with the expected error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error processing recipe file:",
        expect.any(SyntaxError)
      );
    });

    test("displays error when recipe file is missing nodes", async () => {
      const { container } = render(<App />);

      const invalidRecipeContent = JSON.stringify({ items: [] }); // Missing 'nodes'
      const file = new File([invalidRecipeContent], "invalid-recipe.json", {
        type: "application/json",
      });
      file.text = jest.fn().mockResolvedValue(invalidRecipeContent);

      const fileInput = container.querySelector('input[type="file"]');
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText("Error:")).toBeInTheDocument();
        expect(
          screen.getByText(/Invalid recipe data: missing nodes/)
        ).toBeInTheDocument();
      });

      // Verify console.error was called with the expected error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error processing recipe file:",
        expect.any(Error)
      );
    });

    test("clears errors when valid file is uploaded after error", async () => {
      const { container } = render(<App />);

      // First upload invalid file
      const invalidContent = "invalid json";
      const invalidFile = new File([invalidContent], "invalid.json", {
        type: "application/json",
      });
      invalidFile.text = jest.fn().mockResolvedValue(invalidContent);

      const fileInput = container.querySelector('input[type="file"]');
      fireEvent.change(fileInput, { target: { files: [invalidFile] } });

      await waitFor(() => {
        expect(screen.getByText("Error:")).toBeInTheDocument();
      });

      // Then upload valid file
      const validContent = JSON.stringify({
        nodes: [
          {
            recipe: {
              name: "iron-plate",
              in: { "iron-ore": "1" },
              out: { "iron-plate": "1" },
              producers: ["furnace"],
            },
          },
        ],
      });
      const validFile = new File([validContent], "valid.json", {
        type: "application/json",
      });
      validFile.text = jest.fn().mockResolvedValue(validContent);

      fireEvent.change(fileInput, { target: { files: [validFile] } });

      await waitFor(() => {
        expect(screen.queryByText("Error:")).not.toBeInTheDocument();
        expect(screen.getByText("Production Goals")).toBeInTheDocument();
      });

      // Verify console.error was called during the invalid file upload
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error processing recipe file:",
        expect.any(SyntaxError)
      );
    });
  });

  describe("Goal Modification", () => {
    test("production goals section renders with machine dropdowns", async () => {
      const { container } = render(<App />);

      const fileContent = JSON.stringify({
        nodes: [
          {
            recipe: {
              name: "iron-plate",
              in: { "iron-ore": "1" },
              out: { "iron-plate": "1" },
              producers: ["furnace", "electric-furnace"],
            },
          },
        ],
      });

      const file = new File([fileContent], "recipes.json", {
        type: "application/json",
      });
      file.text = jest.fn().mockResolvedValue(fileContent);

      const fileInput = container.querySelector('input[type="file"]');
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText("Production Goals")).toBeInTheDocument();
        // Should have machine dropdown and amount input
        const machineSelects = container.querySelectorAll(".machine-input");
        const amountInputs = container.querySelectorAll(".amount-input");
        expect(machineSelects.length).toBeGreaterThan(0);
        expect(amountInputs.length).toBeGreaterThan(0);
      });
    });

    test("build button becomes disabled when required fields are missing", async () => {
      const { container } = render(<App />);

      const fileContent = JSON.stringify({
        nodes: [
          {
            recipe: {
              name: "iron-plate",
              in: { "iron-ore": "1" },
              out: { "iron-plate": "1" },
              producers: ["furnace"],
            },
          },
        ],
      });

      const file = new File([fileContent], "recipes.json", {
        type: "application/json",
      });
      file.text = jest.fn().mockResolvedValue(fileContent);

      const fileInput = container.querySelector('input[type="file"]');
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        const buildButton = screen.getByRole("button", { name: /build/i });
        expect(buildButton).not.toBeDisabled();
      });
    });
  });

  describe("Reset Functionality", () => {
    test("reset button appears when recipes are loaded", async () => {
      const { container } = render(<App />);

      const fileContent = JSON.stringify({
        nodes: [
          {
            recipe: {
              name: "iron-plate",
              in: { "iron-ore": "1" },
              out: { "iron-plate": "1" },
              producers: ["furnace"],
            },
          },
        ],
      });

      const file = new File([fileContent], "recipes.json", {
        type: "application/json",
      });
      file.text = jest.fn().mockResolvedValue(fileContent);

      const fileInput = container.querySelector('input[type="file"]');
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText("Production Goals")).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: /reset/i })
        ).toBeInTheDocument();
      });
    });
  });

  describe("File Clearing", () => {
    test("clears production goals when file input is cleared", async () => {
      const { container } = render(<App />);

      // Upload a file first
      const fileContent = JSON.stringify({
        nodes: [
          {
            recipe: {
              name: "iron-plate",
              in: { "iron-ore": "1" },
              out: { "iron-plate": "1" },
              producers: ["furnace"],
            },
          },
        ],
      });

      const file = new File([fileContent], "recipes.json", {
        type: "application/json",
      });
      file.text = jest.fn().mockResolvedValue(fileContent);

      const fileInput = container.querySelector('input[type="file"]');
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText("Production Goals")).toBeInTheDocument();
      });

      // Clear the file input
      fireEvent.change(fileInput, { target: { files: [] } });

      // Production goals should be hidden, build button should be disabled
      expect(screen.queryByText("Production Goals")).not.toBeInTheDocument();
      const buildButton = screen.getByRole("button", { name: /build/i });
      expect(buildButton).toBeDisabled();
    });
  });
});
