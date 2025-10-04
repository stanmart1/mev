const axios = require('axios');

async function testLoginFlow() {
  console.log('🔍 Testing Complete Login Flow\n');
  
  const baseURL = 'http://localhost:3001/api';
  const credentials = {
    email: 'admin@mev.com',
    password: 'admin123'
  };
  
  try {
    // Step 1: Test login endpoint
    console.log('Step 1: Testing login endpoint...');
    const loginResponse = await axios.post(`${baseURL}/auth/login`, credentials);
    
    console.log('✅ Login successful!');
    console.log('Response structure:', {
      success: loginResponse.data.success,
      hasUser: !!loginResponse.data.data?.user,
      hasAccessToken: !!loginResponse.data.data?.accessToken,
      hasRefreshToken: !!loginResponse.data.data?.refreshToken
    });
    
    const { user, accessToken, refreshToken } = loginResponse.data.data;
    console.log('\nUser:', {
      id: user.id,
      email: user.email,
      role: user.role
    });
    
    // Step 2: Test token verification
    console.log('\nStep 2: Testing token verification...');
    const verifyResponse = await axios.get(`${baseURL}/auth/verify`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    console.log('✅ Token verification successful!');
    console.log('Verified user:', verifyResponse.data.data.user.email);
    
    // Step 3: Test protected endpoint
    console.log('\nStep 3: Testing protected endpoint...');
    const profileResponse = await axios.get(`${baseURL}/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    console.log('✅ Protected endpoint accessible!');
    console.log('Profile data:', {
      email: profileResponse.data.data.user.email,
      role: profileResponse.data.data.user.role,
      hasPermissions: !!profileResponse.data.data.permissions
    });
    
    // Step 4: Test refresh token
    console.log('\nStep 4: Testing refresh token...');
    const refreshResponse = await axios.post(`${baseURL}/auth/refresh`, {
      refreshToken
    });
    
    console.log('✅ Token refresh successful!');
    console.log('New tokens received:', {
      hasAccessToken: !!refreshResponse.data.data.accessToken,
      hasRefreshToken: !!refreshResponse.data.data.refreshToken
    });
    
    console.log('\n✅ All authentication flow tests passed!');
    console.log('\n📋 Summary:');
    console.log('- Login endpoint: Working');
    console.log('- Token verification: Working');
    console.log('- Protected endpoints: Working');
    console.log('- Token refresh: Working');
    console.log('\n✅ Frontend should be able to login successfully with:');
    console.log('   Email: admin@mev.com');
    console.log('   Password: admin123');
    
  } catch (error) {
    console.error('\n❌ Test failed!');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testLoginFlow();
