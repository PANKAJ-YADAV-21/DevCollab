const axios = {
  async request(method, url, data, config = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(config.headers || {}),
    };
    const options = {
      method,
      headers,
    };
    if (data !== undefined) {
      options.body = JSON.stringify(data);
    }
    const res = await fetch(url, options);
    let resData;
    const text = await res.text();
    try {
      resData = JSON.parse(text);
    } catch {
      resData = text;
    }
    if (!res.ok) {
      const err = new Error(`Request failed with status code ${res.status}`);
      err.response = {
        status: res.status,
        statusText: res.statusText,
        data: resData,
      };
      throw err;
    }
    return {
      status: res.status,
      statusText: res.statusText,
      data: resData,
      headers: res.headers,
    };
  },
  get(url, config) {
    return this.request('GET', url, undefined, config);
  },
  post(url, data, config) {
    return this.request('POST', url, data, config);
  },
  put(url, data, config) {
    return this.request('PUT', url, data, config);
  },
  patch(url, data, config) {
    return this.request('PATCH', url, data, config);
  },
  delete(url, config) {
    return this.request('DELETE', url, undefined, config);
  },
};

const BASE_URL = 'http://localhost:5001/api';

const results = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: [],
  securityChecks: [],
};

function recordTest(name, passed, details = '') {
  results.total++;
  if (passed) {
    results.passed++;
    results.tests.push({ name, status: 'PASS', details });
    console.log(`  ✓ [PASS] ${name}`);
  } else {
    results.failed++;
    results.tests.push({ name, status: 'FAIL', details });
    console.error(`  ✗ [FAIL] ${name}: ${details}`);
  }
}

async function runAudit() {
  console.log('=====================================================');
  console.log(' DevCollab Complete Integration & Quality Audit (Phases 1-4)');
  console.log('=====================================================\n');

  try {
    // -----------------------------------------------------------------
    // SUITE 1: Authentication & JWT Functionality
    // -----------------------------------------------------------------
    console.log('--- Suite 1: Authentication & JWT Functionality ---');
    const timestamp = Date.now();
    const adminEmail = `admin_${timestamp}@devcollab.io`;
    const leaderEmail = `leader_${timestamp}@devcollab.io`;
    const devEmail = `dev_${timestamp}@devcollab.io`;
    const outsiderEmail = `outsider_${timestamp}@devcollab.io`;
    const password = 'Password123!';

    // 1.1 Register Admin
    let adminToken, adminId;
    try {
      const res = await axios.post(`${BASE_URL}/auth/register`, {
        name: 'Audit Admin',
        email: adminEmail,
        password,
      });
      adminToken = res.data.data.token;
      adminId = res.data.data.user._id;
      const noPasswordExposed = !res.data.data.user.password;
      recordTest('1.1 User Registration (Admin creation & password omitted)', res.status === 201 && !!adminToken && noPasswordExposed);
    } catch (err) {
      recordTest('1.1 User Registration', false, err.message);
    }

    // 1.2 Duplicate Email Prevention
    try {
      await axios.post(`${BASE_URL}/auth/register`, {
        name: 'Duplicate Admin',
        email: adminEmail,
        password,
      });
      recordTest('1.2 Duplicate Email Prevention', false, 'Should have failed with 400');
    } catch (err) {
      recordTest('1.2 Duplicate Email Prevention', err.response?.status === 400, err.response?.data?.message);
    }

    // 1.3 Short Password Validation (<6 chars)
    try {
      await axios.post(`${BASE_URL}/auth/register`, {
        name: 'Short Pass',
        email: `short_${timestamp}@devcollab.io`,
        password: '123',
      });
      recordTest('1.3 Short Password Rejection', false, 'Should have failed with 400');
    } catch (err) {
      recordTest('1.3 Short Password Rejection', err.response?.status === 400);
    }

    // 1.4 Invalid Email Format
    try {
      await axios.post(`${BASE_URL}/auth/register`, {
        name: 'Bad Email',
        email: 'invalid-email-format',
        password,
      });
      recordTest('1.4 Invalid Email Format Rejection', false, 'Should have failed with 400');
    } catch (err) {
      recordTest('1.4 Invalid Email Format Rejection', err.response?.status === 400);
    }

    // Register Leader & Developer & Outsider
    let leaderToken, leaderId, devToken, devId, outsiderToken, outsiderId;
    const resLeader = await axios.post(`${BASE_URL}/auth/register`, { name: 'Audit Leader', email: leaderEmail, password });
    leaderToken = resLeader.data.data.token;
    leaderId = resLeader.data.data.user._id;

    const resDev = await axios.post(`${BASE_URL}/auth/register`, { name: 'Audit Dev', email: devEmail, password });
    devToken = resDev.data.data.token;
    devId = resDev.data.data.user._id;

    const resOutsider = await axios.post(`${BASE_URL}/auth/register`, { name: 'Audit Outsider', email: outsiderEmail, password });
    outsiderToken = resOutsider.data.data.token;
    outsiderId = resOutsider.data.data.user._id;

    // 1.5 Valid Login
    try {
      const res = await axios.post(`${BASE_URL}/auth/login`, {
        email: adminEmail,
        password,
      });
      const valid = res.status === 200 && !!res.data.data.token && !res.data.data.user.password;
      recordTest('1.5 User Login with Valid Credentials', valid);
    } catch (err) {
      recordTest('1.5 User Login with Valid Credentials', false, err.message);
    }

    // 1.6 Invalid Password Login
    try {
      await axios.post(`${BASE_URL}/auth/login`, {
        email: adminEmail,
        password: 'WrongPassword!',
      });
      recordTest('1.6 Invalid Password Rejection', false, 'Should have failed with 401');
    } catch (err) {
      recordTest('1.6 Invalid Password Rejection', err.response?.status === 401);
    }

    // 1.7 Non-existent User Login
    try {
      await axios.post(`${BASE_URL}/auth/login`, {
        email: 'nobody@nowhere.com',
        password,
      });
      recordTest('1.7 Non-existent User Login Rejection', false, 'Should have failed with 401');
    } catch (err) {
      recordTest('1.7 Non-existent User Login Rejection', err.response?.status === 401);
    }

    // 1.8 Protected Route with Valid Token
    try {
      const res = await axios.get(`${BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      recordTest('1.8 Protected Route Access (/api/auth/me)', res.status === 200 && res.data.data.user.email === adminEmail);
    } catch (err) {
      recordTest('1.8 Protected Route Access (/api/auth/me)', false, err.message);
    }

    // 1.9 Protected Route without Token
    try {
      await axios.get(`${BASE_URL}/auth/me`);
      recordTest('1.9 Protected Route Blocks Missing Token', false, 'Should have failed with 401');
    } catch (err) {
      recordTest('1.9 Protected Route Blocks Missing Token', err.response?.status === 401);
    }

    // 1.10 Protected Route with Tampered Token
    try {
      await axios.get(`${BASE_URL}/auth/me`, {
        headers: { Authorization: 'Bearer invalid.tampered.token' },
      });
      recordTest('1.10 Protected Route Blocks Tampered Token', false, 'Should have failed with 401');
    } catch (err) {
      recordTest('1.10 Protected Route Blocks Tampered Token', err.response?.status === 401);
    }

    // -----------------------------------------------------------------
    // SUITE 2: Team Creation & Member Management
    // -----------------------------------------------------------------
    console.log('\n--- Suite 2: Team Creation & Member Management ---');
    let teamId;

    // 2.1 Admin creates team
    try {
      const res = await axios.post(
        `${BASE_URL}/teams`,
        { name: 'Audit Team Alpha', description: 'Testing RBAC team operations' },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      teamId = res.data.data.team._id;
      const isAdmin = res.data.data.userRole === 'Admin';
      recordTest('2.1 Admin Creates Team', res.status === 201 && isAdmin && !!teamId);
    } catch (err) {
      recordTest('2.1 Admin Creates Team', false, err.message);
    }

    // 2.2 Get User Teams
    try {
      const res = await axios.get(`${BASE_URL}/teams`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const found = res.data.data.teams.some((t) => t._id === teamId);
      recordTest('2.2 Get User Teams for Admin', res.status === 200 && found);
    } catch (err) {
      recordTest('2.2 Get User Teams for Admin', false, err.message);
    }

    // 2.3 Non-member gets teams (must be isolated)
    try {
      const res = await axios.get(`${BASE_URL}/teams`, {
        headers: { Authorization: `Bearer ${outsiderToken}` },
      });
      const isolated = !res.data.data.teams.some((t) => t._id === teamId);
      recordTest('2.3 Non-member Team Isolation', res.status === 200 && isolated);
    } catch (err) {
      recordTest('2.3 Non-member Team Isolation', false, err.message);
    }

    // 2.4 Admin adds Team Leader
    try {
      const res = await axios.post(
        `${BASE_URL}/teams/${teamId}/members`,
        { email: leaderEmail, role: 'Team Leader' },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      const member = res.data.data.team.members.find((m) => (m.user?._id || m.user) === leaderId);
      recordTest('2.4 Admin Adds Team Leader', res.status === 200 && member?.role === 'Team Leader');
    } catch (err) {
      recordTest('2.4 Admin Adds Team Leader', false, err.message);
    }

    // 2.5 Team Leader adds Developer
    try {
      const res = await axios.post(
        `${BASE_URL}/teams/${teamId}/members`,
        { email: devEmail, role: 'Developer' },
        { headers: { Authorization: `Bearer ${leaderToken}` } }
      );
      const member = res.data.data.team.members.find((m) => (m.user?._id || m.user) === devId);
      recordTest('2.5 Team Leader Adds Developer', res.status === 200 && member?.role === 'Developer');
    } catch (err) {
      recordTest('2.5 Team Leader Adds Developer', false, err.message);
    }

    // 2.6 Team Leader attempts to add Admin (Must be forbidden)
    try {
      await axios.post(
        `${BASE_URL}/teams/${teamId}/members`,
        { email: outsiderEmail, role: 'Admin' },
        { headers: { Authorization: `Bearer ${leaderToken}` } }
      );
      recordTest('2.6 Team Leader Forbidden from Adding Admin', false, 'Should have failed with 403');
    } catch (err) {
      recordTest('2.6 Team Leader Forbidden from Adding Admin', err.response?.status === 403);
    }

    // 2.7 Developer attempts to add member (Must be forbidden)
    try {
      await axios.post(
        `${BASE_URL}/teams/${teamId}/members`,
        { email: outsiderEmail, role: 'Developer' },
        { headers: { Authorization: `Bearer ${devToken}` } }
      );
      recordTest('2.7 Developer Forbidden from Adding Members', false, 'Should have failed with 403');
    } catch (err) {
      recordTest('2.7 Developer Forbidden from Adding Members', err.response?.status === 403);
    }

    // 2.8 Add non-existent user by email
    try {
      await axios.post(
        `${BASE_URL}/teams/${teamId}/members`,
        { email: 'ghost_nonexistent@devcollab.io', role: 'Developer' },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      recordTest('2.8 Add Non-existent User Rejection', false, 'Should have failed with 404');
    } catch (err) {
      recordTest('2.8 Add Non-existent User Rejection', err.response?.status === 404);
    }

    // 2.9 Add already-existing member
    try {
      await axios.post(
        `${BASE_URL}/teams/${teamId}/members`,
        { email: devEmail, role: 'Developer' },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      recordTest('2.9 Duplicate Member Addition Rejection', false, 'Should have failed with 400');
    } catch (err) {
      recordTest('2.9 Duplicate Member Addition Rejection', err.response?.status === 400);
    }

    // 2.10 Non-member accesses team details
    try {
      await axios.get(`${BASE_URL}/teams/${teamId}`, {
        headers: { Authorization: `Bearer ${outsiderToken}` },
      });
      recordTest('2.10 Non-member Access to Team Blocked', false, 'Should have failed with 403');
    } catch (err) {
      recordTest('2.10 Non-member Access to Team Blocked', err.response?.status === 403);
    }

    // -----------------------------------------------------------------
    // SUITE 3: Team Role Management & Removal RBAC
    // -----------------------------------------------------------------
    console.log('\n--- Suite 3: Team Role Management & Removal RBAC ---');

    // 3.1 Admin promotes Developer to Team Leader
    try {
      const res = await axios.put(
        `${BASE_URL}/teams/${teamId}/members/${devId}/role`,
        { role: 'Team Leader' },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      const member = res.data.data.team.members.find((m) => (m.user?._id || m.user) === devId);
      recordTest('3.1 Admin Updates Member Role', res.status === 200 && member?.role === 'Team Leader');
    } catch (err) {
      recordTest('3.1 Admin Updates Member Role', false, err.message);
    }

    // 3.2 Team Leader attempts to promote role (Must be forbidden)
    try {
      await axios.put(
        `${BASE_URL}/teams/${teamId}/members/${devId}/role`,
        { role: 'Admin' },
        { headers: { Authorization: `Bearer ${leaderToken}` } }
      );
      recordTest('3.2 Team Leader Forbidden from Changing Roles', false, 'Should have failed with 403');
    } catch (err) {
      recordTest('3.2 Team Leader Forbidden from Changing Roles', err.response?.status === 403);
    }

    // 3.3 Developer attempts to update role (Must be forbidden)
    try {
      await axios.put(
        `${BASE_URL}/teams/${teamId}/members/${leaderId}/role`,
        { role: 'Admin' },
        { headers: { Authorization: `Bearer ${devToken}` } }
      );
      recordTest('3.3 Developer Forbidden from Changing Roles', false, 'Should have failed with 403');
    } catch (err) {
      recordTest('3.3 Developer Forbidden from Changing Roles', err.response?.status === 403);
    }

    // Demote Dev back to Developer for removal testing
    await axios.put(
      `${BASE_URL}/teams/${teamId}/members/${devId}/role`,
      { role: 'Developer' },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    // 3.4 Team Leader attempts to remove Team Leader (Must be forbidden)
    try {
      // Add another leader to test peer removal
      const resTemp = await axios.post(
        `${BASE_URL}/teams/${teamId}/members`,
        { email: outsiderEmail, role: 'Team Leader' },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      await axios.delete(`${BASE_URL}/teams/${teamId}/members/${outsiderId}`, {
        headers: { Authorization: `Bearer ${leaderToken}` },
      });
      recordTest('3.4 Team Leader Forbidden from Removing Team Leader', false, 'Should have failed with 403');
    } catch (err) {
      recordTest('3.4 Team Leader Forbidden from Removing Team Leader', err.response?.status === 403);
      // Clean up outsider
      await axios.delete(`${BASE_URL}/teams/${teamId}/members/${outsiderId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
    }

    // 3.5 Team Leader removes Developer
    try {
      const res = await axios.delete(`${BASE_URL}/teams/${teamId}/members/${devId}`, {
        headers: { Authorization: `Bearer ${leaderToken}` },
      });
      const exists = res.data.data.team.members.some((m) => (m.user?._id || m.user) === devId);
      recordTest('3.5 Team Leader Removes Developer Member', res.status === 200 && !exists);
    } catch (err) {
      recordTest('3.5 Team Leader Removes Developer Member', false, err.message);
    }

    // Re-add Developer for subsequent project tests
    await axios.post(
      `${BASE_URL}/teams/${teamId}/members`,
      { email: devEmail, role: 'Developer' },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    // 3.6 Developer attempts to remove another member (Must be forbidden)
    try {
      await axios.delete(`${BASE_URL}/teams/${teamId}/members/${leaderId}`, {
        headers: { Authorization: `Bearer ${devToken}` },
      });
      recordTest('3.6 Developer Forbidden from Removing Members', false, 'Should have failed with 403');
    } catch (err) {
      recordTest('3.6 Developer Forbidden from Removing Members', err.response?.status === 403);
    }

    // 3.7 Team Leader attempts to delete team (Must be forbidden)
    try {
      await axios.delete(`${BASE_URL}/teams/${teamId}`, {
        headers: { Authorization: `Bearer ${leaderToken}` },
      });
      recordTest('3.7 Team Leader Forbidden from Deleting Team', false, 'Should have failed with 403');
    } catch (err) {
      recordTest('3.7 Team Leader Forbidden from Deleting Team', err.response?.status === 403);
    }

    // 3.8 Developer attempts to delete team (Must be forbidden)
    try {
      await axios.delete(`${BASE_URL}/teams/${teamId}`, {
        headers: { Authorization: `Bearer ${devToken}` },
      });
      recordTest('3.8 Developer Forbidden from Deleting Team', false, 'Should have failed with 403');
    } catch (err) {
      recordTest('3.8 Developer Forbidden from Deleting Team', err.response?.status === 403);
    }

    // -----------------------------------------------------------------
    // SUITE 4: Project Management & RBAC Operations
    // -----------------------------------------------------------------
    console.log('\n--- Suite 4: Project Management & RBAC Operations ---');
    let projectId;

    // 4.1 Admin creates project in team
    try {
      const res = await axios.post(
        `${BASE_URL}/projects`,
        {
          teamId,
          name: 'Core Auth Gateway',
          description: 'OAuth2 and JWT proxy services',
          status: 'Active',
          priority: 'High',
          progress: 25,
          startDate: '2026-11-01',
          deadline: '2026-12-01',
          assignedMembers: [adminId, leaderId],
        },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      projectId = res.data.data.project._id;
      recordTest('4.1 Admin Creates Project inside Team', res.status === 201 && !!projectId);
    } catch (err) {
      recordTest('4.1 Admin Creates Project inside Team', false, err.message);
    }

    // 4.2 Team Leader creates project in team
    let leaderProjectId;
    try {
      const res = await axios.post(
        `${BASE_URL}/projects`,
        {
          teamId,
          name: 'Leader Managed Pipeline',
          description: 'Data ingestion service',
          status: 'Planning',
          priority: 'Medium',
        },
        { headers: { Authorization: `Bearer ${leaderToken}` } }
      );
      leaderProjectId = res.data.data.project._id;
      recordTest('4.2 Team Leader Creates Project inside Team', res.status === 201 && !!leaderProjectId);
    } catch (err) {
      recordTest('4.2 Team Leader Creates Project inside Team', false, err.message);
    }

    // 4.3 Developer attempts to create project (Must be forbidden)
    try {
      await axios.post(
        `${BASE_URL}/projects`,
        { teamId, name: 'Dev Rogue Project' },
        { headers: { Authorization: `Bearer ${devToken}` } }
      );
      recordTest('4.3 Developer Forbidden from Creating Projects', false, 'Should have failed with 403');
    } catch (err) {
      recordTest('4.3 Developer Forbidden from Creating Projects', err.response?.status === 403);
    }

    // 4.4 Non-team member attempts to create project in team (Must be forbidden)
    try {
      await axios.post(
        `${BASE_URL}/projects`,
        { teamId, name: 'Outsider Injected Project' },
        { headers: { Authorization: `Bearer ${outsiderToken}` } }
      );
      recordTest('4.4 Non-team Member Forbidden from Creating Projects', false, 'Should have failed with 403');
    } catch (err) {
      recordTest('4.4 Non-team Member Forbidden from Creating Projects', err.response?.status === 403);
    }

    // 4.5 Date Order Validation (startDate > deadline)
    try {
      await axios.post(
        `${BASE_URL}/projects`,
        {
          teamId,
          name: 'Bad Dates Project',
          startDate: '2026-12-10',
          deadline: '2026-11-10',
        },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      recordTest('4.5 Invalid Date Order Rejection', false, 'Should have failed with 400');
    } catch (err) {
      recordTest('4.5 Invalid Date Order Rejection', err.response?.status === 400);
    }

    // 4.6 Invalid Status Rejection
    try {
      await axios.post(
        `${BASE_URL}/projects`,
        { teamId, name: 'Bad Status', status: 'NonExistentStatus' },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      recordTest('4.6 Invalid Status Rejection', false, 'Should have failed with 400');
    } catch (err) {
      recordTest('4.6 Invalid Status Rejection', err.response?.status === 400);
    }

    // 4.7 Get Projects accessible to user
    try {
      const res = await axios.get(`${BASE_URL}/projects`, {
        headers: { Authorization: `Bearer ${devToken}` },
      });
      const found = res.data.data.projects.some((p) => p._id === projectId);
      recordTest('4.7 Team Members Can View Accessible Projects', res.status === 200 && found);
    } catch (err) {
      recordTest('4.7 Team Members Can View Accessible Projects', false, err.message);
    }

    // 4.8 Non-member project isolation
    try {
      const res = await axios.get(`${BASE_URL}/projects`, {
        headers: { Authorization: `Bearer ${outsiderToken}` },
      });
      const count = res.data.data.projects.length;
      recordTest('4.8 Non-team Member Projects Isolation', res.status === 200 && count === 0);
    } catch (err) {
      recordTest('4.8 Non-team Member Projects Isolation', false, err.message);
    }

    // 4.9 View individual project details
    try {
      const res = await axios.get(`${BASE_URL}/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${leaderToken}` },
      });
      recordTest('4.9 Team Member Views Project Details', res.status === 200 && res.data.data.project.name === 'Core Auth Gateway');
    } catch (err) {
      recordTest('4.9 Team Member Views Project Details', false, err.message);
    }

    // 4.10 Non-member blocked from project details
    try {
      await axios.get(`${BASE_URL}/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${outsiderToken}` },
      });
      recordTest('4.10 Non-member Blocked from Project Details', false, 'Should have failed with 403');
    } catch (err) {
      recordTest('4.10 Non-member Blocked from Project Details', err.response?.status === 403);
    }

    // 4.11 Team Leader updates project details
    try {
      const res = await axios.put(
        `${BASE_URL}/projects/${projectId}`,
        {
          status: 'On Hold',
          progress: 55,
          description: 'Paused for architectural review',
        },
        { headers: { Authorization: `Bearer ${leaderToken}` } }
      );
      recordTest(
        '4.11 Team Leader Updates Project Details',
        res.status === 200 && res.data.data.project.status === 'On Hold' && res.data.data.project.progress === 55
      );
    } catch (err) {
      recordTest('4.11 Team Leader Updates Project Details', false, err.message);
    }

    // 4.12 Developer attempts to update project details (Must be forbidden)
    try {
      await axios.put(
        `${BASE_URL}/projects/${projectId}`,
        { status: 'Completed' },
        { headers: { Authorization: `Bearer ${devToken}` } }
      );
      recordTest('4.12 Developer Forbidden from Editing Project Details', false, 'Should have failed with 403');
    } catch (err) {
      recordTest('4.12 Developer Forbidden from Editing Project Details', err.response?.status === 403);
    }

    // 4.13 Assign team member to project
    try {
      const res = await axios.post(
        `${BASE_URL}/projects/${projectId}/members`,
        { userId: devId },
        { headers: { Authorization: `Bearer ${leaderToken}` } }
      );
      const isAssigned = res.data.data.project.assignedMembers.some((m) => (m._id || m) === devId);
      recordTest('4.13 Assign Team Member to Project', res.status === 200 && isAssigned);
    } catch (err) {
      recordTest('4.13 Assign Team Member to Project', false, err.message);
    }

    // 4.14 Assign user who does NOT belong to team (Must fail with 400)
    try {
      await axios.post(
        `${BASE_URL}/projects/${projectId}/members`,
        { userId: outsiderId },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      recordTest('4.14 Assign Non-team Member Rejection', false, 'Should have failed with 400');
    } catch (err) {
      recordTest('4.14 Assign Non-team Member Rejection', err.response?.status === 400);
    }

    // 4.15 Duplicate member assignment rejection
    try {
      await axios.post(
        `${BASE_URL}/projects/${projectId}/members`,
        { userId: devId },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      recordTest('4.15 Duplicate Assignment Rejection', false, 'Should have failed with 400');
    } catch (err) {
      recordTest('4.15 Duplicate Assignment Rejection', err.response?.status === 400);
    }

    // 4.16 Team Leader removes assigned member from project
    try {
      const res = await axios.delete(`${BASE_URL}/projects/${projectId}/members/${devId}`, {
        headers: { Authorization: `Bearer ${leaderToken}` },
      });
      const stillAssigned = res.data.data.project.assignedMembers.some((m) => (m._id || m) === devId);
      recordTest('4.16 Team Leader Unassigns Member', res.status === 200 && !stillAssigned);
    } catch (err) {
      recordTest('4.16 Team Leader Unassigns Member', false, err.message);
    }

    // Re-assign dev to test self-unassign
    await axios.post(
      `${BASE_URL}/projects/${projectId}/members`,
      { userId: devId },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    // 4.17 Developer attempts to remove another member (Must be forbidden)
    try {
      await axios.delete(`${BASE_URL}/projects/${projectId}/members/${adminId}`, {
        headers: { Authorization: `Bearer ${devToken}` },
      });
      recordTest('4.17 Developer Forbidden from Removing Other Members', false, 'Should have failed with 403');
    } catch (err) {
      recordTest('4.17 Developer Forbidden from Removing Other Members', err.response?.status === 403);
    }

    // 4.18 Developer unassigns themselves from project
    try {
      const res = await axios.delete(`${BASE_URL}/projects/${projectId}/members/${devId}`, {
        headers: { Authorization: `Bearer ${devToken}` },
      });
      const stillAssigned = res.data.data.project.assignedMembers.some((m) => (m._id || m) === devId);
      recordTest('4.18 Developer Successfully Unassigns Themselves', res.status === 200 && !stillAssigned);
    } catch (err) {
      recordTest('4.18 Developer Successfully Unassigns Themselves', false, err.message);
    }

    // 4.19 Team Leader attempts to delete project (Must be forbidden)
    try {
      await axios.delete(`${BASE_URL}/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${leaderToken}` },
      });
      recordTest('4.19 Team Leader Forbidden from Deleting Projects', false, 'Should have failed with 403');
    } catch (err) {
      recordTest('4.19 Team Leader Forbidden from Deleting Projects', err.response?.status === 403);
    }

    // 4.20 Developer attempts to delete project (Must be forbidden)
    try {
      await axios.delete(`${BASE_URL}/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${devToken}` },
      });
      recordTest('4.20 Developer Forbidden from Deleting Projects', false, 'Should have failed with 403');
    } catch (err) {
      recordTest('4.20 Developer Forbidden from Deleting Projects', err.response?.status === 403);
    }

    // 4.21 Admin deletes project
    try {
      const res = await axios.delete(`${BASE_URL}/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      recordTest('4.21 Admin Deletes Project Successfully', res.status === 200 && res.data.data.projectId === projectId);
    } catch (err) {
      recordTest('4.21 Admin Deletes Project Successfully', false, err.message);
    }

    // -----------------------------------------------------------------
    // SUITE 5: Cascading Data Integrity & Cleanup
    // -----------------------------------------------------------------
    console.log('\n--- Suite 5: Cascading Data Integrity & Cleanup ---');

    // 5.1 Cascading delete on Team disbandment
    try {
      // Create project under team
      const resProj = await axios.post(
        `${BASE_URL}/projects`,
        { teamId, name: 'Project to be Cascaded' },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      const cascadedProjId = resProj.data.data.project._id;

      // Delete the team
      await axios.delete(`${BASE_URL}/teams/${teamId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      // Verify project was also deleted and is now 404
      let projectStillExists = false;
      try {
        await axios.get(`${BASE_URL}/projects/${cascadedProjId}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        projectStillExists = true;
      } catch (e) {
        projectStillExists = false;
      }

      recordTest('5.1 Cascading Deletion of Projects on Team Deletion', !projectStillExists);
    } catch (err) {
      recordTest('5.1 Cascading Deletion of Projects on Team Deletion', false, err.message);
    }

  } catch (globalErr) {
    console.error('Fatal audit error:', globalErr);
  }

  console.log('\n=====================================================');
  console.log(` Audit Complete: ${results.passed} / ${results.total} Passed (${results.failed} Failed)`);
  console.log('=====================================================');
}

runAudit();
