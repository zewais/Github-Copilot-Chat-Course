import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock Chart.js class that tracks constructor calls and instances
class MockChart {
  static instances = [];
  static lastConfig = null;
  static lastContext = null;

  constructor(ctx, config) {
    MockChart.lastContext = ctx;
    MockChart.lastConfig = config;
    this.ctx = ctx;
    this.config = config;
    this.destroyed = false;
    MockChart.instances.push(this);
  }

  destroy() {
    this.destroyed = true;
  }

  toBase64Image() {
    return "data:image/png;base64,mockImageData";
  }

  static reset() {
    MockChart.instances = [];
    MockChart.lastConfig = null;
    MockChart.lastContext = null;
  }
}

// Helper to create DOM with budget form inputs
function createBudgetDOM() {
  const html = `
    <!DOCTYPE html>
    <html>
      <body>
        <form id="budgetForm">
          ${[
            "jan",
            "feb",
            "mar",
            "apr",
            "may",
            "jun",
            "jul",
            "aug",
            "sep",
            "oct",
            "nov",
            "dec",
          ]
            .map(
              (month) => `
            <input type="number" class="form-control income-input" id="income-${month}" value="" />
            <input type="number" class="form-control expense-input" id="expense-${month}" value="" />
          `,
            )
            .join("")}
        </form>
        <button id="updateChartBtn">Update Chart</button>
        <button id="downloadChartBtn">Download</button>
        <button id="chart-tab">Chart Tab</button>
        <canvas id="budgetChart"></canvas>
      </body>
    </html>
  `;

  const dom = new JSDOM(html, { runScripts: "dangerously" });
  return dom;
}

// Helper to set income/expense values
function setInputValues(window, incomeValues, expenseValues) {
  const incomeInputs = window.document.querySelectorAll(".income-input");
  const expenseInputs = window.document.querySelectorAll(".expense-input");

  incomeValues.forEach((value, index) => {
    incomeInputs[index].value = value;
  });

  expenseValues.forEach((value, index) => {
    expenseInputs[index].value = value;
  });
}

// Load script.js content
const scriptPath = join(__dirname, "..", "script.js");
const scriptContent = readFileSync(scriptPath, "utf-8");

describe("validateAndCollectData()", () => {
  let window, document;

  beforeEach(() => {
    const dom = createBudgetDOM();
    window = dom.window;
    document = window.document;

    // Set up global mocks
    global.window = window;
    global.document = document;
    global.Chart = MockChart;
    global.alert = () => {};

    // Mock canvas getContext in window
    window.HTMLCanvasElement.prototype.getContext = () => ({
      canvas: {},
      fillRect: () => {},
      clearRect: () => {},
      getImageData: () => ({ data: [] }),
      putImageData: () => {},
      createImageData: () => [],
      setTransform: () => {},
      drawImage: () => {},
      save: () => {},
      fillText: () => {},
      restore: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      stroke: () => {},
      translate: () => {},
      scale: () => {},
      rotate: () => {},
      arc: () => {},
      fill: () => {},
      measureText: () => ({ width: 0 }),
      transform: () => {},
      rect: () => {},
      clip: () => {},
    });

    // Set Chart in window context
    window.Chart = MockChart;
    window.alert = () => {};

    MockChart.reset();

    // Execute script in window context
    window.eval(scriptContent);
  });

  it("should return valid data for all numeric inputs", () => {
    const incomeValues = [
      100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200,
    ];
    const expenseValues = [
      50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600,
    ];
    setInputValues(window, incomeValues, expenseValues);

    const result = window.validateAndCollectData();

    assert.strictEqual(result.isValid, true);
    // Check each value individually since parseFloat might return different references
    assert.strictEqual(result.incomeData.length, 12);
    assert.strictEqual(result.expenseData.length, 12);
    result.incomeData.forEach((val, idx) =>
      assert.strictEqual(val, incomeValues[idx]),
    );
    result.expenseData.forEach((val, idx) =>
      assert.strictEqual(val, expenseValues[idx]),
    );
  });

  it("should default empty inputs to 0 without validation errors", () => {
    // Leave all inputs empty
    const result = window.validateAndCollectData();

    assert.strictEqual(result.isValid, true);
    // Check values are all 0
    result.incomeData.forEach((val) => assert.strictEqual(val, 0));
    result.expenseData.forEach((val) => assert.strictEqual(val, 0));

    // Check no inputs have is-invalid class
    const incomeInputs = document.querySelectorAll(".income-input");
    const expenseInputs = document.querySelectorAll(".expense-input");

    incomeInputs.forEach((input) => {
      assert.strictEqual(input.classList.contains("is-invalid"), false);
    });

    expenseInputs.forEach((input) => {
      assert.strictEqual(input.classList.contains("is-invalid"), false);
    });
  });

  it("should add is-invalid class for negative numbers and set isValid to false", () => {
    const incomeValues = [
      100, -50, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200,
    ];
    const expenseValues = [
      50, 100, 150, -200, 250, 300, 350, 400, 450, 500, 550, 600,
    ];
    setInputValues(window, incomeValues, expenseValues);

    const result = window.validateAndCollectData();

    assert.strictEqual(result.isValid, false);

    // Check that negative inputs have is-invalid class
    const incomeInputs = document.querySelectorAll(".income-input");
    const expenseInputs = document.querySelectorAll(".expense-input");

    assert.strictEqual(incomeInputs[1].classList.contains("is-invalid"), true);
    assert.strictEqual(expenseInputs[3].classList.contains("is-invalid"), true);
  });

  it("should add is-invalid class for non-numeric strings and set isValid to false", () => {
    // Change first income and second expense to text inputs so they accept non-numeric values
    const incomeInputs = document.querySelectorAll(".income-input");
    const expenseInputs = document.querySelectorAll(".expense-input");
    incomeInputs[0].type = "text";
    expenseInputs[1].type = "text";

    const incomeValues = [
      "abc",
      200,
      300,
      400,
      500,
      600,
      700,
      800,
      900,
      1000,
      1100,
      1200,
    ];
    const expenseValues = [
      50,
      "xyz",
      150,
      200,
      250,
      300,
      350,
      400,
      450,
      500,
      550,
      600,
    ];
    setInputValues(window, incomeValues, expenseValues);

    const result = window.validateAndCollectData();

    assert.strictEqual(result.isValid, false);
    assert.strictEqual(incomeInputs[0].classList.contains("is-invalid"), true);
    assert.strictEqual(expenseInputs[1].classList.contains("is-invalid"), true);
  });

  it("should handle mixed valid and invalid inputs correctly", () => {
    // Change inputs to text type for non-numeric test values
    const incomeInputs = document.querySelectorAll(".income-input");
    const expenseInputs = document.querySelectorAll(".expense-input");
    incomeInputs[3].type = "text";
    expenseInputs[6].type = "text";

    const incomeValues = [
      100,
      "",
      -300,
      "abc",
      500,
      600,
      700,
      800,
      900,
      1000,
      1100,
      1200,
    ];
    const expenseValues = [
      50,
      100,
      150,
      200,
      "",
      -250,
      "xyz",
      400,
      450,
      500,
      550,
      600,
    ];
    setInputValues(window, incomeValues, expenseValues);

    const result = window.validateAndCollectData();

    assert.strictEqual(result.isValid, false);

    // Valid inputs should not have is-invalid
    assert.strictEqual(incomeInputs[0].classList.contains("is-invalid"), false);
    assert.strictEqual(incomeInputs[1].classList.contains("is-invalid"), false); // empty defaults to 0

    // Invalid inputs should have is-invalid
    assert.strictEqual(incomeInputs[2].classList.contains("is-invalid"), true); // negative
    assert.strictEqual(incomeInputs[3].classList.contains("is-invalid"), true); // non-numeric
    assert.strictEqual(expenseInputs[5].classList.contains("is-invalid"), true); // negative
    assert.strictEqual(expenseInputs[6].classList.contains("is-invalid"), true); // non-numeric
  });

  it("should return correct structure with incomeData and expenseData arrays", () => {
    const result = window.validateAndCollectData();

    assert.ok(result.hasOwnProperty("isValid"));
    assert.ok(result.hasOwnProperty("incomeData"));
    assert.ok(result.hasOwnProperty("expenseData"));
    assert.ok(Array.isArray(result.incomeData));
    assert.ok(Array.isArray(result.expenseData));
    assert.strictEqual(result.incomeData.length, 12);
    assert.strictEqual(result.expenseData.length, 12);
  });
});

describe("renderChart()", () => {
  let window, document, alertCalls;

  beforeEach(() => {
    const dom = createBudgetDOM();
    window = dom.window;
    document = window.document;

    alertCalls = [];
    global.window = window;
    global.document = document;
    global.Chart = MockChart;
    global.alert = (msg) => alertCalls.push(msg);

    // Mock canvas getContext in window
    window.HTMLCanvasElement.prototype.getContext = () => ({
      canvas: {},
      fillRect: () => {},
      clearRect: () => {},
      getImageData: () => ({ data: [] }),
      putImageData: () => {},
      createImageData: () => [],
      setTransform: () => {},
      drawImage: () => {},
      save: () => {},
      fillText: () => {},
      restore: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      stroke: () => {},
      translate: () => {},
      scale: () => {},
      rotate: () => {},
      arc: () => {},
      fill: () => {},
      measureText: () => ({ width: 0 }),
      transform: () => {},
      rect: () => {},
      clip: () => {},
    });

    // Set Chart and alert in window context
    window.Chart = MockChart;
    window.alert = (msg) => alertCalls.push(msg);

    MockChart.reset();

    // Execute script in window context
    window.eval(scriptContent);
  });

  it("should create Chart with correct configuration for valid data", () => {
    const incomeValues = [
      850, 920, 780, 650, 890, 810, 950, 720, 870, 760, 830, 910,
    ];
    const expenseValues = [
      620, 580, 710, 490, 740, 560, 680, 530, 640, 590, 670, 790,
    ];
    setInputValues(window, incomeValues, expenseValues);

    window.renderChart();

    assert.strictEqual(MockChart.instances.length, 1);
    assert.strictEqual(MockChart.lastConfig.type, "bar");

    // Check datasets
    const datasets = MockChart.lastConfig.data.datasets;
    assert.strictEqual(datasets.length, 2);
    assert.strictEqual(datasets[0].label, "Income");
    // Compare values element by element due to parseFloat reference differences
    datasets[0].data.forEach((val, idx) =>
      assert.strictEqual(val, incomeValues[idx]),
    );
    assert.strictEqual(datasets[1].label, "Expenses");
    datasets[1].data.forEach((val, idx) =>
      assert.strictEqual(val, expenseValues[idx]),
    );

    // Check labels
    const expectedLabels = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const actualLabels = MockChart.lastConfig.data.labels;
    assert.strictEqual(actualLabels.length, expectedLabels.length);
    actualLabels.forEach((label, idx) =>
      assert.strictEqual(label, expectedLabels[idx]),
    );

    // Check colors
    assert.ok(datasets[0].backgroundColor.includes("40, 167, 69")); // green for income
    assert.ok(datasets[1].backgroundColor.includes("220, 53, 69")); // red for expenses
  });

  it("should show alert and not create chart when validation fails", () => {
    const incomeValues = [
      -100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200,
    ];
    const expenseValues = [
      50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600,
    ];
    setInputValues(window, incomeValues, expenseValues);

    window.renderChart();

    assert.strictEqual(alertCalls.length, 1);
    assert.ok(alertCalls[0].includes("validation errors"));
    assert.strictEqual(MockChart.instances.length, 0);
  });

  it("should destroy existing chartInstance before creating new one", () => {
    const incomeValues = [
      100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200,
    ];
    const expenseValues = [
      50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600,
    ];
    setInputValues(window, incomeValues, expenseValues);

    // Create first chart
    window.renderChart();
    const firstChart = MockChart.instances[0];

    // Create second chart
    window.renderChart();

    assert.strictEqual(firstChart.destroyed, true);
    assert.strictEqual(MockChart.instances.length, 2);
    assert.strictEqual(MockChart.instances[1].destroyed, false);
  });

  it("should configure y-axis with dollar formatting", () => {
    const incomeValues = [
      100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200,
    ];
    const expenseValues = [
      50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600,
    ];
    setInputValues(window, incomeValues, expenseValues);

    window.renderChart();

    const yAxisConfig = MockChart.lastConfig.options.scales.y;
    assert.strictEqual(yAxisConfig.beginAtZero, true);
    assert.ok(typeof yAxisConfig.ticks.callback === "function");

    // Test callback formats with dollar sign
    const formatted = yAxisConfig.ticks.callback(1000);
    assert.ok(formatted.includes("$"));
  });

  it("should configure tooltip with dollar formatting", () => {
    const incomeValues = [
      100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200,
    ];
    const expenseValues = [
      50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600,
    ];
    setInputValues(window, incomeValues, expenseValues);

    window.renderChart();

    const tooltipConfig = MockChart.lastConfig.options.plugins.tooltip;
    assert.ok(typeof tooltipConfig.callbacks.label === "function");

    // Test tooltip callback
    const mockContext = {
      dataset: { label: "Income" },
      parsed: { y: 1000 },
    };
    const label = tooltipConfig.callbacks.label(mockContext);
    assert.ok(label.includes("Income"));
    assert.ok(label.includes("$"));
  });
});

describe("window.onload event handlers", () => {
  let window, document, alertCalls;

  beforeEach(() => {
    const dom = createBudgetDOM();
    window = dom.window;
    document = window.document;

    alertCalls = [];
    global.window = window;
    global.document = document;
    global.Chart = MockChart;
    global.alert = (msg) => alertCalls.push(msg);

    // Mock canvas getContext in window
    window.HTMLCanvasElement.prototype.getContext = () => ({
      canvas: {},
      fillRect: () => {},
      clearRect: () => {},
      getImageData: () => ({ data: [] }),
      putImageData: () => {},
      createImageData: () => [],
      setTransform: () => {},
      drawImage: () => {},
      save: () => {},
      fillText: () => {},
      restore: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      stroke: () => {},
      translate: () => {},
      scale: () => {},
      rotate: () => {},
      arc: () => {},
      fill: () => {},
      measureText: () => ({ width: 0 }),
      transform: () => {},
      rect: () => {},
      clip: () => {},
    });

    // Set Chart and alert in window context
    window.Chart = MockChart;
    window.alert = (msg) => alertCalls.push(msg);

    MockChart.reset();

    // Execute script in window context
    window.eval(scriptContent);

    // Trigger window.onload to register event handlers
    if (window.onload) {
      window.onload();
    }
  });

  it("should register click handler on updateChartBtn that calls renderChart", () => {
    const incomeValues = [
      100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200,
    ];
    const expenseValues = [
      50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600,
    ];
    setInputValues(window, incomeValues, expenseValues);

    const updateBtn = document.getElementById("updateChartBtn");
    updateBtn.click();

    assert.strictEqual(MockChart.instances.length, 1);
  });

  it("should register click handler on downloadChartBtn that creates PNG download", () => {
    const incomeValues = [
      100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200,
    ];
    const expenseValues = [
      50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600,
    ];
    setInputValues(window, incomeValues, expenseValues);

    // Create chart first
    window.renderChart();

    // Mock createElement to track download link creation
    let createdLinks = [];
    const originalCreateElement = document.createElement.bind(document);
    document.createElement = (tagName) => {
      const element = originalCreateElement(tagName);
      if (tagName === "a") {
        createdLinks.push(element);
      }
      return element;
    };

    const downloadBtn = document.getElementById("downloadChartBtn");
    downloadBtn.click();

    assert.strictEqual(createdLinks.length, 1);
    assert.strictEqual(
      createdLinks[0].href,
      "data:image/png;base64,mockImageData",
    );
    assert.strictEqual(createdLinks[0].download, "budget-chart.png");
  });

  it("should show alert when download button clicked without chart", () => {
    const downloadBtn = document.getElementById("downloadChartBtn");
    downloadBtn.click();

    assert.strictEqual(alertCalls.length, 1);
    assert.ok(alertCalls[0].includes("update the chart first"));
  });

  it("should register shown.bs.tab event on chart tab that triggers renderChart", () => {
    const incomeValues = [
      100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200,
    ];
    const expenseValues = [
      50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600,
    ];
    setInputValues(window, incomeValues, expenseValues);

    const chartTab = document.getElementById("chart-tab");

    // Trigger Bootstrap's shown.bs.tab event
    const event = new window.Event("shown.bs.tab");
    chartTab.dispatchEvent(event);

    assert.strictEqual(MockChart.instances.length, 1);
  });
});
