let chartInstance = null;
const monthLabels = [
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

// Validate and collect data from all inputs
function validateAndCollectData() {
  const incomeInputs = document.querySelectorAll(".income-input");
  const expenseInputs = document.querySelectorAll(".expense-input");

  let isValid = true;
  const incomeData = [];
  const expenseData = [];

  // Validate and collect income data
  incomeInputs.forEach((input) => {
    const value = input.value.trim();

    if (value === "") {
      // Empty input defaults to 0
      incomeData.push(0);
      input.classList.remove("is-invalid");
    } else if (isNaN(value) || parseFloat(value) < 0) {
      // Invalid input
      input.classList.add("is-invalid");
      isValid = false;
      incomeData.push(0);
    } else {
      // Valid input
      incomeData.push(parseFloat(value));
      input.classList.remove("is-invalid");
    }
  });

  // Validate and collect expense data
  expenseInputs.forEach((input) => {
    const value = input.value.trim();

    if (value === "") {
      // Empty input defaults to 0
      expenseData.push(0);
      input.classList.remove("is-invalid");
    } else if (isNaN(value) || parseFloat(value) < 0) {
      // Invalid input
      input.classList.add("is-invalid");
      isValid = false;
      expenseData.push(0);
    } else {
      // Valid input
      expenseData.push(parseFloat(value));
      input.classList.remove("is-invalid");
    }
  });

  return { isValid, incomeData, expenseData };
}

// Render the bar chart
function renderChart() {
  const { isValid, incomeData, expenseData } = validateAndCollectData();

  if (!isValid) {
    alert("Please fix the validation errors before updating the chart.");
    return;
  }

  const ctx = document.getElementById("budgetChart").getContext("2d");

  // Destroy existing chart if it exists
  if (chartInstance) {
    chartInstance.destroy();
  }

  // Create new chart with grouped bars
  chartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: monthLabels,
      datasets: [
        {
          label: "Income",
          data: incomeData,
          backgroundColor: "rgba(40, 167, 69, 0.7)",
          borderColor: "rgba(40, 167, 69, 1)",
          borderWidth: 1,
        },
        {
          label: "Expenses",
          data: expenseData,
          backgroundColor: "rgba(220, 53, 69, 0.7)",
          borderColor: "rgba(220, 53, 69, 1)",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function (value) {
              return "$" + value.toLocaleString();
            },
          },
        },
      },
      plugins: {
        legend: {
          display: true,
          position: "top",
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return (
                context.dataset.label +
                ": $" +
                context.parsed.y.toLocaleString()
              );
            },
          },
        },
      },
    },
  });
}

window.onload = function () {
  // Update Chart button click handler
  const updateChartBtn = document.getElementById("updateChartBtn");
  updateChartBtn.addEventListener("click", renderChart);

  // Auto-render chart when switching to Chart tab
  const chartTab = document.getElementById("chart-tab");
  chartTab.addEventListener("shown.bs.tab", renderChart);

  // Download Chart button click handler
  const downloadChartBtn = document.getElementById("downloadChartBtn");
  downloadChartBtn.addEventListener("click", function () {
    if (!chartInstance) {
      alert("Please update the chart first before downloading.");
      return;
    }

    // Get chart as base64 image
    const imageData = chartInstance.toBase64Image();

    // Create temporary link element
    const downloadLink = document.createElement("a");
    downloadLink.href = imageData;
    downloadLink.download = "budget-chart.png";

    // Trigger download
    downloadLink.click();
  });
};
