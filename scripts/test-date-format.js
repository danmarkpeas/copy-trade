// Test script to verify the new date format
function formatDate(dateString) {
  const date = new Date(dateString)
  const day = date.getDate().toString().padStart(2, '0')
  const month = date.toLocaleString('en-US', { month: 'long' }).toUpperCase()
  const year = date.getFullYear()
  const time = date.toLocaleString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    hour12: true 
  }).toUpperCase()
  
  return `${day} ${month} ${year}, ${time}`
}

// Test with the example date from the user
const testDate = '2025-07-28T22:46:35.000Z'
console.log('Original format: 7/28/2025, 10:46:35 PM')
console.log('New format:', formatDate(testDate))

// Test with current date
console.log('\nCurrent date:', formatDate(new Date().toISOString()))

// Test with different dates
const testDates = [
  '2025-01-15T14:30:00.000Z',
  '2025-12-31T23:59:59.000Z',
  '2025-06-01T09:15:30.000Z'
]

console.log('\nTest dates:')
testDates.forEach(date => {
  console.log(`${date} -> ${formatDate(date)}`)
}) 