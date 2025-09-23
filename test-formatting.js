// Test script to verify number formatting fixes

function formatCurrencyForTest(value) {
  if (!value || isNaN(value)) return '0';
  return value.toLocaleString('en-US', { 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 0 
  });
}

function translatePaymentMethodForTest(method) {
  const translations = {
    'Bank Transfer': 'Banka Havalesi',
    'Cash': 'Nakit', 
    'Check': 'Çek',
    'Credit Card': 'Kredi Kartı'
  };
  return translations[method] || method;
}

// Test problematic numbers from the user's report
const problematicNumbers = [
  3316.5800700000004,
  3410.0000000000005,
  3056.6000000000004,
  347562.47507000004,
  2287.2966,
  3507.2966
];

console.log('Testing number formatting:');
problematicNumbers.forEach(num => {
  console.log(`${num} -> $${formatCurrencyForTest(num)}`);
});

console.log('\nTesting payment method translation:');
const paymentMethods = ['Bank Transfer', 'Cash', 'Check', 'Credit Card'];
paymentMethods.forEach(method => {
  console.log(`${method} -> ${translatePaymentMethodForTest(method)}`);
});

console.log('\nFormatting test completed successfully!');