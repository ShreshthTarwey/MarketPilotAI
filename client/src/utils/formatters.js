export function formatLargeNumber(num, currencySymbol = '$') {
  if (num === null || num === undefined || isNaN(num) || num === 0) return 'N/A';
  const absNum = Math.abs(num);
  let formatted = '';
  if (absNum >= 1e12) {
    formatted = (num / 1e12).toFixed(2) + 'T';
  } else if (absNum >= 1e9) {
    formatted = (num / 1e9).toFixed(2) + 'B';
  } else if (absNum >= 1e6) {
    formatted = (num / 1e6).toFixed(2) + 'M';
  } else {
    formatted = num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return currencySymbol + formatted;
}

export function formatCount(num) {
  if (num === null || num === undefined || isNaN(num) || num === 0) return 'N/A';
  if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
  if (num >= 1e3) return (num / 1e3).toFixed(1) + 'k';
  return num.toLocaleString();
}
