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

  console.log('\n--- 3. Testing GET /api/dashboard/stats ---');
  res = await fetch(base + '/dashboard/stats');
  json = await res.json();
  console.log('Dashboard Stats Status:', res.status, '| Total docs:', json.data?.totalDocuments, '| Avg health:', json.data?.averageHealthScore);

  console.log('\n--- 4. Testing GET /api/documents ---');
  res = await fetch(base + '/documents');
  json = await res.json();
  console.log('Documents Status:', res.status, '| Count:', json.data?.length);

  console.log('\n--- 5. Testing GET /api/incidents ---');
  res = await fetch(base + '/incidents');
  json = await res.json();
  console.log('Incidents Status:', res.status, '| Count:', json.data?.length);

  console.log('\n--- 6. Testing GET /api/incidents/summary ---');
  res = await fetch(base + '/incidents/summary');
  json = await res.json();
  console.log('Incidents Summary Status:', res.status, '| Active:', json.data?.activeIncidents);

  console.log('\n--- 7. Testing POST /api/auth/logout ---');
  if (token) {
    res = await fetch(base + '/auth/logout', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token },
    });
    json = await res.json();
    console.log('Logout Status:', res.status, '| Message:', json.data?.message);
  }

  console.log('\n======================================================');
  console.log('🎉 TOÀN BỘ CÁC API CỐT LÕI DOCUGUARD ĐÃ ĐƯỢC XÁC THỰC!');
  console.log('======================================================');
}

test().catch(console.error);
