// @ts-check
const { test, expect } = require('@playwright/test');

const BASE = 'http://127.0.0.1:3000';
const EMAIL = 'admin@admin.com';
const PASSWORD = 'ymfe.org';

// ─── helpers ────────────────────────────────────────────────────────────────

async function loginUI(page) {
  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.fill('input[placeholder=Email]', EMAIL);
  await page.fill('input[placeholder=Password]', PASSWORD);
  await page.click('button.ant-btn-primary');
  await page.waitForURL(/^(?!.*\/login)/, { timeout: 8000 });
  await page.waitForLoadState('networkidle');
  // dismiss first-run guide if present
  const guide = page.locator('button:has-text("退出指引")');
  if (await guide.isVisible({ timeout: 2000 }).catch(() => false)) {
    await guide.click();
  }
}

async function loginAPI(request) {
  const res = await request.post(`${BASE}/api/user/login`, {
    data: { email: EMAIL, password: PASSWORD }
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.errcode).toBe(0);
  return body.data;
}

// ─── UI tests ───────────────────────────────────────────────────────────────

test('home page loads with YApi title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/YApi/i);
});

test('login with valid credentials reaches dashboard', async ({ page }) => {
  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.fill('input[placeholder=Email]', EMAIL);
  await page.fill('input[placeholder=Password]', PASSWORD);
  await page.click('button.ant-btn-primary');
  await page.waitForURL(/^(?!.*\/login)/, { timeout: 8000 });
  // header search box is visible only when logged in
  await expect(page.locator('.ant-input-search, input[placeholder*="搜索"]').first()).toBeVisible({ timeout: 5000 });
});

test('login with wrong password shows error notification', async ({ page }) => {
  await page.goto('/login', { waitUntil: 'networkidle' });
  await page.fill('input[placeholder=Email]', EMAIL);
  await page.fill('input[placeholder=Password]', 'wrong_password_123');
  await page.click('button.ant-btn-primary');
  await expect(page.locator('.ant-notification, .ant-message')).toBeVisible({ timeout: 5000 });
  // still on login page
  await expect(page).toHaveURL(/login/);
});

// ─── API-driven tests ────────────────────────────────────────────────────────

test('create a new group via API', async ({ request }) => {
  await loginAPI(request);
  const groupName = `E2E-Group-${Date.now()}`;
  const res = await request.post(`${BASE}/api/group/add`, {
    data: { group_name: groupName, group_desc: 'e2e test group' }
  });
  const body = await res.json();
  expect(body.errcode).toBe(0);
  expect(body.data.group_name).toBe(groupName);
});

test('create a project in personal space via API', async ({ request }) => {
  await loginAPI(request);

  // personal group is returned directly as an object
  const grpRes = await request.get(`${BASE}/api/group/get_mygroup`);
  const grpData = await grpRes.json();
  expect(grpData.errcode).toBe(0);
  const groupId = grpData.data._id;

  const projName = `E2E-Project-${Date.now()}`;
  const projRes = await request.post(`${BASE}/api/project/add`, {
    data: { name: projName, basepath: '/e2e', group_id: groupId, project_type: 'private' }
  });
  const projBody = await projRes.json();
  expect(projBody.errcode).toBe(0);
  expect(projBody.data.name).toBe(projName);
});

test('create an interface inside a project via API', async ({ request }) => {
  await loginAPI(request);

  const grpRes = await request.get(`${BASE}/api/group/get_mygroup`);
  const groupId = (await grpRes.json()).data._id;

  const projRes = await request.post(`${BASE}/api/project/add`, {
    data: { name: `E2E-Proj-${Date.now()}`, basepath: '/iface-test', group_id: groupId, project_type: 'private' }
  });
  const projectId = (await projRes.json()).data._id;

  // get default category
  const catRes = await request.get(`${BASE}/api/interface/getCatMenu?project_id=${projectId}`);
  const catData = await catRes.json();
  expect(catData.errcode).toBe(0);
  const catId = catData.data[0]._id;

  const ifaceRes = await request.post(`${BASE}/api/interface/add`, {
    data: {
      project_id: projectId,
      catid: catId,
      title: 'E2E Test Interface',
      path: '/ping',
      method: 'GET',
      res_body_type: 'json',
      res_body: JSON.stringify({ code: 0, msg: 'ok' }),
      res_body_is_json_schema: false,
      status: 'undone'
    }
  });
  const ifaceBody = await ifaceRes.json();
  expect(ifaceBody.errcode).toBe(0);
  expect(ifaceBody.data.path).toBe('/ping');
});

test('mock server returns data for a defined interface', async ({ request }) => {
  await loginAPI(request);

  const grpRes = await request.get(`${BASE}/api/group/get_mygroup`);
  const groupId = (await grpRes.json()).data._id;

  const projRes = await request.post(`${BASE}/api/project/add`, {
    data: { name: `E2E-Mock-${Date.now()}`, basepath: '/mock-test', group_id: groupId, project_type: 'private' }
  });
  const projBody = await projRes.json();
  const projectId = projBody.data._id;

  const catRes = await request.get(`${BASE}/api/interface/getCatMenu?project_id=${projectId}`);
  const catId = (await catRes.json()).data[0]._id;

  const mockBody = { code: 0, message: 'hello from mock', item: { id: 42 } };
  await request.post(`${BASE}/api/interface/add`, {
    data: {
      project_id: projectId,
      catid: catId,
      title: 'Mock Ping',
      path: '/ping',
      method: 'GET',
      res_body_type: 'json',
      res_body: JSON.stringify(mockBody),
      res_body_is_json_schema: false,
      status: 'undone'
    }
  });

  // hit mock server: /mock/<projectId><basepath><path>
  const mockRes = await request.get(`${BASE}/mock/${projectId}/mock-test/ping`);
  expect(mockRes.ok()).toBeTruthy();
  const data = await mockRes.json();
  expect(data.code).toBe(0);
  expect(data.message).toBe('hello from mock');
  expect(data.item.id).toBe(42);
});
