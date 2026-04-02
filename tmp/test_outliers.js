// Mocking standard deviation for test
function calculateStandardDeviation(values) {
  if (!values || values.length < 2) return null
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const squaredDiffs = values.map(v => Math.pow(v - mean, 2))
  const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / (values.length - 1)
  return Math.sqrt(avgSquaredDiff)
}

function detectOutliers(values, threshold = 1.5) {
  if (!values || values.length < 3) return { clean: values, outliers: [] }
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const sd = calculateStandardDeviation(values)
  if (sd === null || sd === 0) return { clean: values, outliers: [] }

  let cutoff = mean - (threshold * sd)

  const zeroCount = values.filter(v => v === 0).length
  const zeroRatio = zeroCount / values.length
  if (mean > 50 && zeroRatio < 0.25) {
    if (cutoff < 1) {
        console.log("Triggered Hard Zero rule. Previous cutoff:", cutoff.toFixed(2));
        cutoff = 1
    }
  }

  const clean = values.filter(v => v >= cutoff)
  const outliers = values.filter(v => v < cutoff)
  return { clean, outliers, cutoff, mean, sd }
}

// Test Case 1: Class of 23 students, 22 at 75%, 1 at 0%
const classStats = Array(22).fill(75).concat([0]);
const result = detectOutliers(classStats);

console.log("Mean:", result.mean.toFixed(2));
console.log("SD:", result.sd.toFixed(2));
console.log("Final Cutoff:", result.cutoff.toFixed(2));
console.log("Outliers Count:", result.outliers.length);
console.log("Outliers:", result.outliers);

// Test Case 2: Class with high variance (spread out grades)
const spreadClass = [0, 40, 50, 60, 70, 80, 90];
const result2 = detectOutliers(spreadClass);
console.log("\nSpread Class Mean:", result2.mean.toFixed(2));
console.log("Spread Class Cutoff:", result2.cutoff.toFixed(2));
console.log("Spread Class Outliers:", result2.outliers);
