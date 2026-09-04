// Approve a sync run via the API
const API = 'http://localhost:4000/api';

async function main() {
  const runId = process.argv[2];
  if (!runId) {
    console.error('Usage: node approve-run.mjs <runId>');
    process.exit(1);
  }

  // Login as admin
  await fetch(`${API}/auth/request-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@qayess.io' }),
  });

  const loginRes = await fetch(`${API}/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@qayess.io', code: '123456' }),
  });
  const { token } = await loginRes.json();
  console.log('Admin token:', token ? 'OK' : 'FAIL');

  // Approve the run
  console.log(`Approving run ${runId}...`);
  const approveRes = await fetch(`${API}/scraping/${runId}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  const result = await approveRes.json();
  console.log('Status:', approveRes.status);
  console.log('Result:', JSON.stringify(result, null, 2));
}

main().catch(e => console.error('Error:', e));
