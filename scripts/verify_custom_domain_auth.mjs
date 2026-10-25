import { writeFile } from 'node:fs/promises';

const web = 'https://career.ronineymessjrstudio.cn';
const supabase = 'https://woywgfoqurumrkyoznnb.supabase.co';
const report = { checkedAt: new Date().toISOString(), web, passed: false, businessWrites: false, checks: [] };
let stage = 'configuration';

async function request(url, init = {}) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(30000) });
  const text = await response.text();
  let data;
  if (response.headers.get('content-type')?.includes('application/json')) data = JSON.parse(text);
  return { response, data };
}

function check(name, passed) {
  report.checks.push({ name, passed });
  if (!passed) throw new Error(name);
}

try {
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const email = process.env.CAREER_COPILOT_TEST_EMAIL;
  const password = process.env.CAREER_COPILOT_TEST_PASSWORD;
  check('existing_test_credentials_configured', Boolean(key && email && password));
  check('expected_supabase_project', process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '') === supabase);
  stage = 'public_routes';
  const login = await request(`${web}/login`);
  check('https_login_page', login.response.status === 200);
  const runtime = await request(`${web}/api/runtime`);
  check('production_runtime', runtime.response.status === 200 && runtime.data?.service === 'career-copilot-v2' && runtime.data.authRequired === true);
  const anonymous = await request(`${web}/api/control/analytics`);
  check('anonymous_request_rejected', anonymous.response.status === 401);
  stage = 'test_account_login';
  const loginResult = await request(`${supabase}/auth/v1/token?grant_type=password`, {
    method: 'POST', headers: { apikey: key, 'content-type': 'application/json', Origin: web },
    body: JSON.stringify({ email, password }),
  });
  check('existing_account_login', loginResult.response.status === 200 && typeof loginResult.data?.access_token === 'string');
  report.testSessionCreated = true;
  check('supabase_login_cors', ['*', web].includes(loginResult.response.headers.get('access-control-allow-origin')));
  const headers = { authorization: `Bearer ${loginResult.data.access_token}`, Origin: web };
  stage = 'authenticated_reads';
  const analytics = await request(`${web}/api/control/analytics?days=7`, { headers });
  check('authenticated_analytics', analytics.response.status === 200 && typeof analytics.data?.analytics === 'object');
  const resumes = await request(`${web}/api/control/resumes`, { headers });
  check('authenticated_resumes', resumes.response.status === 200 && Array.isArray(resumes.data?.resumes));
  report.passed = true;
} catch {
  report.failureStage = stage;
  process.exitCode = 1;
}
await writeFile('CUSTOM_DOMAIN_AUTH_VERIFICATION.json', `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
