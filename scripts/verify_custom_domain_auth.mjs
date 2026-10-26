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
  const title = response.headers.get('content-type')?.includes('text/html') ? text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] : undefined;
  return { response, data, title, html: title ? text : undefined };
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
  report.publicEndpoints = await Promise.all([
    ['ronineymessjrstudio.cn', /RONIN/i], ['www.ronineymessjrstudio.cn', /RONIN/i],
    ['photo.ronineymessjrstudio.cn', /PhotoAtelier/i], ['career.ronineymessjrstudio.cn', /Career|求职|简历/i],
    ['camera.ronineymessjrstudio.cn', /Camera Market|相机市场/i], ['tarot.ronineymessjrstudio.cn', /Arcana|塔罗/i],
  ].map(async ([host, title]) => {
    try {
      const page = await request(`https://${host}/`);
      const result = { host, status: page.response.status, title: page.title, assets: [],
        passed: page.response.status === 200 && title.test(page.title || '') && new URL(page.response.url).origin === `https://${host}` };
      if (!result.passed) return result;
      const document = page.html.replace(/(<script\b[^>]*>)[\s\S]*?<\/script\s*>/gi, '$1</script>')
        .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, '').replace(/<!--[\s\S]*?-->/g, '');
      const assets = [...new Set([...document.matchAll(/<(?:script|link|img)\b[^>]*(?:src|href)=["']([^"']+)["'][^>]*>/gi)]
        .filter(match => /^<(?:script|img)\b/i.test(match[0]) || /stylesheet|preload|icon/i.test(match[0]))
        .map(match => new URL(match[1].replace(/&amp;/gi, '&'), `https://${host}/`)).filter(url => url.origin === `https://${host}`).map(url => url.href))];
      for (let index = 0; index < assets.length; index += 3) result.assets.push(...await Promise.all(assets.slice(index, index + 3).map(async url => {
        try {
          const asset = await request(url);
          const fallback = asset.response.headers.get('content-type')?.includes('text/html') && /\.(?:m?js|css|png|webp|jpg|svg)(?:\?|$)/i.test(url);
          return { url, status: asset.response.status, passed: asset.response.status === 200 && asset.response.url.startsWith('https:') && !fallback };
        } catch (error) { return { url, passed: false, errorCode: error.cause?.code || error.name }; }
      })));
      result.passed = result.assets.every(asset => asset.passed);
      return result;
    } catch (error) { return { host, passed: false, errorCode: error.cause?.code || error.name }; }
  }));
  check('six_public_https_pages_and_assets', report.publicEndpoints.every(page => page.passed));
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
} catch (error) {
  report.failureStage = stage;
  report.failureCode = error.cause?.code || error.name;
  process.exitCode = 1;
}
await writeFile('CUSTOM_DOMAIN_AUTH_VERIFICATION.json', `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
