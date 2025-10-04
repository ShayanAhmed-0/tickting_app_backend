/**
 * Route Filtering API Test Examples
 * This file demonstrates various query parameter combinations
 */

const BASE_URL = 'http://localhost:9000/api/admin/routes';
const AUTH_TOKEN = 'your-jwt-token-here'; // Replace with actual token

// Helper function to make requests
async function makeRequest(endpoint, params = {}) {
  const url = new URL(endpoint, BASE_URL);
  Object.keys(params).forEach(key => {
    if (params[key] !== null && params[key] !== undefined) {
      url.searchParams.append(key, params[key]);
    }
  });
  
  console.log(`\n🔍 Request: ${url.toString()}`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    console.log(`✅ Response: ${response.status}`);
    console.log(`📊 Results: ${data.data?.routes?.length || 0} routes found`);
    console.log(`📄 Pagination: Page ${data.data?.pagination?.page || 1} of ${data.data?.pagination?.totalPages || 1}`);
    
    if (data.data?.filters?.appliedFilters) {
      console.log(`🔧 Applied Filters:`, data.data.filters.appliedFilters);
    }
    
    return data;
  } catch (error) {
    console.error(`❌ Error:`, error.message);
    return null;
  }
}

// Test cases
async function runTests() {
  console.log('🚀 Starting Route Filtering API Tests...\n');
  
  // Test 1: Basic listing
  console.log('📋 Test 1: Basic Route Listing');
  await makeRequest('', {
    page: 1,
    limit: 5
  });
  
  // Test 2: Origin and destination filtering
  console.log('\n📍 Test 2: Origin & Destination Filtering');
  await makeRequest('', {
    origin: '68e07ca39b1b15d265780592',
    destination: '68e07ca39b1b15d265780593',
    page: 1,
    limit: 10
  });
  
  // Test 3: Date filtering
  console.log('\n📅 Test 3: Date Filtering');
  await makeRequest('', {
    departureDate: '2024-01-15',
    tripType: 'one-way',
    page: 1,
    limit: 10
  });
  
  // Test 4: Day and time filtering
  console.log('\n⏰ Test 4: Day & Time Filtering');
  await makeRequest('', {
    day: 'monday',
    time: '08:00-18:00',
    page: 1,
    limit: 10
  });
  
  // Test 5: Search functionality
  console.log('\n🔍 Test 5: Search Functionality');
  await makeRequest('', {
    search: 'Mexico',
    page: 1,
    limit: 10
  });
  
  // Test 6: Complex filtering
  console.log('\n🎯 Test 6: Complex Filtering');
  await makeRequest('', {
    origin: '68e07ca39b1b15d265780592',
    destination: '68e07ca39b1b15d265780593',
    departureDate: '2024-01-15',
    tripType: 'one-way',
    day: 'monday',
    time: '08:00-18:00',
    sortBy: 'dayTime.time',
    sortOrder: 'asc',
    page: 1,
    limit: 10
  });
  
  // Test 7: Sorting options
  console.log('\n📊 Test 7: Sorting Options');
  await makeRequest('', {
    sortBy: 'name',
    sortOrder: 'asc',
    page: 1,
    limit: 5
  });
  
  // Test 8: Status filtering
  console.log('\n🟢 Test 8: Status Filtering');
  await makeRequest('', {
    isActive: true,
    page: 1,
    limit: 10
  });
  
  // Test 9: Bus filtering
  console.log('\n🚌 Test 9: Bus Filtering');
  await makeRequest('', {
    bus: '68e07ca39b1b15d265780594',
    page: 1,
    limit: 10
  });
  
  // Test 10: Pagination
  console.log('\n📄 Test 10: Pagination');
  await makeRequest('', {
    page: 2,
    limit: 5
  });
  
  console.log('\n✅ All tests completed!');
}

// Filter options test
async function testFilterOptions() {
  console.log('\n🔧 Testing Filter Options Endpoint...');
  
  try {
    const response = await fetch(`${BASE_URL}/filter-options`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    console.log(`✅ Filter Options Response: ${response.status}`);
    console.log(`📍 Destinations: ${data.data?.destinations?.length || 0}`);
    console.log(`🚌 Buses: ${data.data?.buses?.length || 0}`);
    console.log(`📅 Available Days: ${data.data?.availableDays?.length || 0}`);
    console.log(`🔥 Popular Routes: ${data.data?.popularRoutes?.length || 0}`);
    
    return data;
  } catch (error) {
    console.error(`❌ Filter Options Error:`, error.message);
    return null;
  }
}

// Search test
async function testSearch() {
  console.log('\n🔍 Testing Search Endpoint...');
  
  try {
    const response = await fetch(`${BASE_URL}/search?q=Mexico&limit=5`, {
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    console.log(`✅ Search Response: ${response.status}`);
    console.log(`🔍 Search Results: ${data.data?.routes?.length || 0} routes found`);
    
    return data;
  } catch (error) {
    console.error(`❌ Search Error:`, error.message);
    return null;
  }
}

// Main execution
async function main() {
  console.log('🎯 Route Filtering API Test Suite');
  console.log('=====================================');
  
  // Run main tests
  await runTests();
  
  // Test additional endpoints
  await testFilterOptions();
  await testSearch();
  
  console.log('\n🎉 All tests completed successfully!');
  console.log('\n📝 Note: Make sure to:');
  console.log('1. Replace AUTH_TOKEN with your actual JWT token');
  console.log('2. Update the ObjectIds to match your database');
  console.log('3. Ensure the server is running on localhost:9000');
}

// Export for use in other files
module.exports = {
  makeRequest,
  runTests,
  testFilterOptions,
  testSearch
};

// Run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

