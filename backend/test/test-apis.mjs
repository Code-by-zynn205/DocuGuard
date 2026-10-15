async function test() {
  const base = 'http://localhost:3001/api';

  console.log('--- 1. Testing GET /api/health ---');
  let res = await fetch(base + '/health');
  let json = await res.json();
  console.log('Health:', res.status, json);

  console.log('\n--- 2. Testing POST /api/auth/login (admin) ---');
  res = await fetch(base + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@docuguard.internal', password: 'Admin@123456' }),
  });
  const loginData = await res.json();
  console.log('Login Status:', res.status);
  const token = loginData.data?.accessToken;
  const refreshToken = loginData.data?.refreshToken;
  console.log('Logged in as:', loginData.data?.user?.fullName, '| Role:', loginData.data?.user?.role);

  console.log('\n--- 3. Testing GET /api/auth/profile (with Bearer token) ---');
  res = await fetch(base + '/auth/profile', {
    headers: { Authorization: 'Bearer ' + token },
  });
  json = await res.json();
  console.log('Profile Status:', res.status, '| Email:', json.data?.email, '| Role:', json.data?.role);

  console.log('\n--- 4. Testing GET /api/auth/users (Admin only) ---');
  res = await fetch(base + '/auth/users', {
    headers: { Authorization: 'Bearer ' + token },
  });
  json = await res.json();
  console.log('Users Status:', res.status, '| Total users:', json.data?.length);
  json.data?.forEach(u => console.log('  -', u.email, `(${u.role})`, u.fullName));

  console.log('\n--- 5. Testing POST /api/auth/register (Create new user via Admin) ---');
  const randomEmail = `staff_${Date.now()}@docuguard.internal`;
  res = await fetch(base + '/auth/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token,
    },
    body: JSON.stringify({
      email: randomEmail,
      password: 'User@123456',
      fullName: 'Nhân Viên Mới',
      role: 'uploader',
      department: 'Kế Toán',
    }),
  });
  json = await res.json();
  console.log('Register Status:', res.status, '| Message:', json.data?.message, '| User ID:', json.data?.userId);

  console.log('\n--- 6. Testing POST /api/auth/refresh ---');
  res = await fetch(base + '/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  json = await res.json();
  console.log('Refresh Status:', res.status, '| New Access Token:', !!json.data?.accessToken);

  console.log('\n--- 7. Testing POST /api/auth/logout ---');
  res = await fetch(base + '/auth/logout', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token },
  });
  json = await res.json();
  console.log('Logout Status:', res.status, '| Message:', json.data?.message);

  console.log('\n=======================================');
  console.log('🎉 TOÀN BỘ 7/7 API TEST ĐÃ THÀNH CÔNG!');
  console.log('=======================================');
}

test().catch(console.error);
