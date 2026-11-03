const BASE_URL = 'http://localhost:5001/api';

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

const results = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: [],
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

async function runPhase5Audit() {
  console.log('=====================================================');
  console.log(' DevCollab Phase 5: Task Management & Kanban Board Audit');
  console.log('=====================================================\n');

  try {
    const ts = Date.now();
    const adminEmail = `admin_task_${ts}@devcollab.io`;
    const leaderEmail = `leader_task_${ts}@devcollab.io`;
    const dev1Email = `dev1_task_${ts}@devcollab.io`;
    const dev2Email = `dev2_task_${ts}@devcollab.io`;
    const outsiderEmail = `outsider_task_${ts}@devcollab.io`;
    const password = 'Password123!';

    // Register 5 users
    const rAdmin = await axios.post(`${BASE_URL}/auth/register`, { name: 'Audit Admin', email: adminEmail, password });
    const adminToken = rAdmin.data.data.token;
    const adminId = rAdmin.data.data.user._id;

    const rLeader = await axios.post(`${BASE_URL}/auth/register`, { name: 'Audit Leader', email: leaderEmail, password });
    const leaderToken = rLeader.data.data.token;
    const leaderId = rLeader.data.data.user._id;

    const rDev1 = await axios.post(`${BASE_URL}/auth/register`, { name: 'Audit Dev1', email: dev1Email, password });
    const dev1Token = rDev1.data.data.token;
    const dev1Id = rDev1.data.data.user._id;

    const rDev2 = await axios.post(`${BASE_URL}/auth/register`, { name: 'Audit Dev2', email: dev2Email, password });
    const dev2Token = rDev2.data.data.token;
    const dev2Id = rDev2.data.data.user._id;

    const rOutsider = await axios.post(`${BASE_URL}/auth/register`, { name: 'Audit Outsider', email: outsiderEmail, password });
    const outsiderToken = rOutsider.data.data.token;
    const outsiderId = rOutsider.data.data.user._id;

    // Create Team
    const rTeam = await axios.post(
      `${BASE_URL}/teams`,
      { name: 'Kanban Core Team', description: 'Testing Kanban tasks & RBAC' },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    const teamId = rTeam.data.data.team._id;

    // Add Leader, Dev1, Dev2 to Team
    await axios.post(
      `${BASE_URL}/teams/${teamId}/members`,
      { email: leaderEmail, role: 'Team Leader' },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    await axios.post(
      `${BASE_URL}/teams/${teamId}/members`,
      { email: dev1Email, role: 'Developer' },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    await axios.post(
      `${BASE_URL}/teams/${teamId}/members`,
      { email: dev2Email, role: 'Developer' },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    // Create Project
    const rProj = await axios.post(
      `${BASE_URL}/projects`,
      {
        teamId,
        name: 'Microservices Mesh Auth',
        description: 'Core microservices gateway',
        status: 'Active',
        priority: 'High',
        assignedMembers: [adminId, leaderId, dev1Id, dev2Id],
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    const projectId = rProj.data.data.project._id;

    // -------------------------------------------------------------
    // SUITE 1: Task Creation CRUD & Input Validation
    // -------------------------------------------------------------
    console.log('--- Suite 1: Task Creation CRUD & Validation ---');
    let task1Id, task2Id;

    // 1.1 Admin creates Task 1
    try {
      const res = await axios.post(
        `${BASE_URL}/tasks`,
        {
          projectId,
          title: 'Implement Redis Session Cache',
          description: 'High performance token store with TTL expiry',
          priority: 'High',
          status: 'To Do',
          dueDate: '2026-11-20',
          assignedDeveloper: dev1Id,
        },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      task1Id = res.data.data.task._id;
      const isAssigned = (res.data.data.task.assignedDeveloper?._id || res.data.data.task.assignedDeveloper) === dev1Id;
      recordTest('1.1 Admin Creates Task inside Project', res.status === 201 && !!task1Id && isAssigned);
    } catch (err) {
      recordTest('1.1 Admin Creates Task inside Project', false, err.message);
    }

    // 1.2 Team Leader creates Task 2
    try {
      const res = await axios.post(
        `${BASE_URL}/tasks`,
        {
          projectId,
          title: 'Setup Distributed Tracing',
          description: 'OpenTelemetry integration for RPC spans',
          priority: 'Medium',
          status: 'In Progress',
        },
        { headers: { Authorization: `Bearer ${leaderToken}` } }
      );
      task2Id = res.data.data.task._id;
      recordTest('1.2 Team Leader Creates Task', res.status === 201 && !!task2Id);
    } catch (err) {
      recordTest('1.2 Team Leader Creates Task', false, err.message);
    }

    // 1.3 Developer attempts to create task (Forbidden)
    try {
      await axios.post(
        `${BASE_URL}/tasks`,
        { projectId, title: 'Rogue Dev Task' },
        { headers: { Authorization: `Bearer ${dev1Token}` } }
      );
      recordTest('1.3 Developer Blocked from Creating Tasks', false, 'Expected 403');
    } catch (err) {
      recordTest('1.3 Developer Blocked from Creating Tasks', err.response?.status === 403);
    }

    // 1.4 Outsider attempts to create task (Forbidden)
    try {
      await axios.post(
        `${BASE_URL}/tasks`,
        { projectId, title: 'Outsider Injected Task' },
        { headers: { Authorization: `Bearer ${outsiderToken}` } }
      );
      recordTest('1.4 Outsider Blocked from Creating Tasks', false, 'Expected 403');
    } catch (err) {
      recordTest('1.4 Outsider Blocked from Creating Tasks', err.response?.status === 403);
    }

    // 1.5 Short title validation (<2 chars)
    try {
      await axios.post(
        `${BASE_URL}/tasks`,
        { projectId, title: 'A' },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      recordTest('1.5 Short Title Validation (<2 chars)', false, 'Expected 400');
    } catch (err) {
      recordTest('1.5 Short Title Validation (<2 chars)', err.response?.status === 400);
    }

    // 1.6 Invalid priority rejection
    try {
      await axios.post(
        `${BASE_URL}/tasks`,
        { projectId, title: 'Bad Priority Task', priority: 'UltraHigh' },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      recordTest('1.6 Invalid Priority Rejection', false, 'Expected 400');
    } catch (err) {
      recordTest('1.6 Invalid Priority Rejection', err.response?.status === 400);
    }

    // 1.7 Invalid status rejection
    try {
      await axios.post(
        `${BASE_URL}/tasks`,
        { projectId, title: 'Bad Status Task', status: 'NonExistent' },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      recordTest('1.7 Invalid Status Rejection', false, 'Expected 400');
    } catch (err) {
      recordTest('1.7 Invalid Status Rejection', err.response?.status === 400);
    }

    // 1.8 Assign non-team member developer
    try {
      await axios.post(
        `${BASE_URL}/tasks`,
        { projectId, title: 'Outsider Assigned Task', assignedDeveloper: outsiderId },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      recordTest('1.8 Non-Team Member Assignment Rejection', false, 'Expected 400');
    } catch (err) {
      recordTest('1.8 Non-Team Member Assignment Rejection', err.response?.status === 400);
    }

    // -------------------------------------------------------------
    // SUITE 2: Task Retrieval & Query Filters
    // -------------------------------------------------------------
    console.log('\n--- Suite 2: Task Retrieval & Query Filters ---');

    // 2.1 Team Member views project tasks
    try {
      const res = await axios.get(`${BASE_URL}/tasks?projectId=${projectId}`, {
        headers: { Authorization: `Bearer ${dev1Token}` },
      });
      recordTest('2.1 Team Member Views Project Tasks', res.status === 200 && res.data.data.tasks.length >= 2);
    } catch (err) {
      recordTest('2.1 Team Member Views Project Tasks', false, err.message);
    }

    // 2.2 Filter by Status
    try {
      const res = await axios.get(`${BASE_URL}/tasks?projectId=${projectId}&status=To Do`, {
        headers: { Authorization: `Bearer ${dev1Token}` },
      });
      const allToDo = res.data.data.tasks.every((t) => t.status === 'To Do');
      recordTest('2.2 Filter Tasks by Status', res.status === 200 && allToDo && res.data.data.tasks.length >= 1);
    } catch (err) {
      recordTest('2.2 Filter Tasks by Status', false, err.message);
    }

    // 2.3 Filter by Priority
    try {
      const res = await axios.get(`${BASE_URL}/tasks?projectId=${projectId}&priority=High`, {
        headers: { Authorization: `Bearer ${dev1Token}` },
      });
      const allHigh = res.data.data.tasks.every((t) => t.priority === 'High');
      recordTest('2.3 Filter Tasks by Priority', res.status === 200 && allHigh && res.data.data.tasks.length >= 1);
    } catch (err) {
      recordTest('2.3 Filter Tasks by Priority', false, err.message);
    }

    // 2.4 Filter by Assigned Developer (dev1)
    try {
      const res = await axios.get(`${BASE_URL}/tasks?projectId=${projectId}&assignedDeveloper=${dev1Id}`, {
        headers: { Authorization: `Bearer ${dev1Token}` },
      });
      const allDev1 = res.data.data.tasks.every((t) => (t.assignedDeveloper?._id || t.assignedDeveloper) === dev1Id);
      recordTest('2.4 Filter Tasks by Assigned Developer', res.status === 200 && allDev1 && res.data.data.tasks.length >= 1);
    } catch (err) {
      recordTest('2.4 Filter Tasks by Assigned Developer', false, err.message);
    }

    // 2.5 Live Search Filter
    try {
      const res = await axios.get(`${BASE_URL}/tasks?projectId=${projectId}&search=Redis`, {
        headers: { Authorization: `Bearer ${dev1Token}` },
      });
      const found = res.data.data.tasks.some((t) => t.title.includes('Redis'));
      recordTest('2.5 Search Tasks by Keyword', res.status === 200 && found);
    } catch (err) {
      recordTest('2.5 Search Tasks by Keyword', false, err.message);
    }

    // 2.6 Outsider view blocked
    try {
      await axios.get(`${BASE_URL}/tasks?projectId=${projectId}`, {
        headers: { Authorization: `Bearer ${outsiderToken}` },
      });
      recordTest('2.6 Outsider Blocked from Viewing Tasks', false, 'Expected 403');
    } catch (err) {
      recordTest('2.6 Outsider Blocked from Viewing Tasks', err.response?.status === 403);
    }

    // 2.7 View single task details by ID
    try {
      const res = await axios.get(`${BASE_URL}/tasks/${task1Id}`, {
        headers: { Authorization: `Bearer ${dev2Token}` },
      });
      recordTest('2.7 View Individual Task Details', res.status === 200 && res.data.data.task.title === 'Implement Redis Session Cache');
    } catch (err) {
      recordTest('2.7 View Individual Task Details', false, err.message);
    }

    // -------------------------------------------------------------
    // SUITE 3: Task Editing & Developer Reassignment
    // -------------------------------------------------------------
    console.log('\n--- Suite 3: Task Editing & Reassignment ---');

    // 3.1 Team Leader edits task details & reassigns to Dev2
    try {
      const res = await axios.put(
        `${BASE_URL}/tasks/${task1Id}`,
        {
          title: 'Implement Redis Session Cache (Cluster Mode)',
          priority: 'Critical',
          assignedDeveloper: dev2Id,
        },
        { headers: { Authorization: `Bearer ${leaderToken}` } }
      );
      const isReassigned = (res.data.data.task.assignedDeveloper?._id || res.data.data.task.assignedDeveloper) === dev2Id;
      recordTest('3.1 Team Leader Edits Task and Reassigns Developer', res.status === 200 && isReassigned && res.data.data.task.priority === 'Critical');
    } catch (err) {
      recordTest('3.1 Team Leader Edits Task and Reassigns Developer', false, err.message);
    }

    // 3.2 Developer attempts to edit task details (Forbidden)
    try {
      await axios.put(
        `${BASE_URL}/tasks/${task1Id}`,
        { title: 'Dev Unauthorized Edit' },
        { headers: { Authorization: `Bearer ${dev1Token}` } }
      );
      recordTest('3.2 Developer Blocked from Editing Task Details', false, 'Expected 403');
    } catch (err) {
      recordTest('3.2 Developer Blocked from Editing Task Details', err.response?.status === 403);
    }

    // -------------------------------------------------------------
    // SUITE 4: Drag & Drop Status Updates (PATCH /api/tasks/:id/status)
    // -------------------------------------------------------------
    console.log('\n--- Suite 4: Drag & Drop Status Updates ---');

    // Reassign Task 1 back to Dev1 for RBAC drag test
    await axios.put(
      `${BASE_URL}/tasks/${task1Id}`,
      { assignedDeveloper: dev1Id, status: 'To Do' },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );

    // 4.1 Developer 1 moves their assigned task: To Do -> In Progress
    try {
      const res = await axios.patch(
        `${BASE_URL}/tasks/${task1Id}/status`,
        { status: 'In Progress' },
        { headers: { Authorization: `Bearer ${dev1Token}` } }
      );
      recordTest('4.1 Assigned Developer Moves Task to In Progress', res.status === 200 && res.data.data.task.status === 'In Progress');
    } catch (err) {
      recordTest('4.1 Assigned Developer Moves Task to In Progress', false, err.message);
    }

    // 4.2 Developer 1 moves their assigned task: In Progress -> In Review
    try {
      const res = await axios.patch(
        `${BASE_URL}/tasks/${task1Id}/status`,
        { status: 'In Review' },
        { headers: { Authorization: `Bearer ${dev1Token}` } }
      );
      recordTest('4.2 Assigned Developer Moves Task to In Review', res.status === 200 && res.data.data.task.status === 'In Review');
    } catch (err) {
      recordTest('4.2 Assigned Developer Moves Task to In Review', false, err.message);
    }

    // 4.3 Developer 2 attempts to move Dev1's task (Forbidden)
    try {
      await axios.patch(
        `${BASE_URL}/tasks/${task1Id}/status`,
        { status: 'Completed' },
        { headers: { Authorization: `Bearer ${dev2Token}` } }
      );
      recordTest('4.3 Developer Blocked from Moving Other User’s Task', false, 'Expected 403');
    } catch (err) {
      recordTest('4.3 Developer Blocked from Moving Other User’s Task', err.response?.status === 403);
    }

    // 4.4 Developer 2 attempts to move unassigned Task 2 (Forbidden)
    try {
      await axios.patch(
        `${BASE_URL}/tasks/${task2Id}/status`,
        { status: 'Completed' },
        { headers: { Authorization: `Bearer ${dev2Token}` } }
      );
      recordTest('4.4 Developer Blocked from Moving Unassigned Task', false, 'Expected 403');
    } catch (err) {
      recordTest('4.4 Developer Blocked from Moving Unassigned Task', err.response?.status === 403);
    }

    // 4.5 Team Leader moves Dev1's task to Completed (Allowed)
    try {
      const res = await axios.patch(
        `${BASE_URL}/tasks/${task1Id}/status`,
        { status: 'Completed' },
        { headers: { Authorization: `Bearer ${leaderToken}` } }
      );
      recordTest('4.5 Team Leader Moves Any Task to Completed', res.status === 200 && res.data.data.task.status === 'Completed');
    } catch (err) {
      recordTest('4.5 Team Leader Moves Any Task to Completed', false, err.message);
    }

    // 4.6 Admin moves Dev1's task back to In Progress (Allowed)
    try {
      const res = await axios.patch(
        `${BASE_URL}/tasks/${task1Id}/status`,
        { status: 'In Progress' },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      recordTest('4.6 Admin Moves Any Task Status', res.status === 200 && res.data.data.task.status === 'In Progress');
    } catch (err) {
      recordTest('4.6 Admin Moves Any Task Status', false, err.message);
    }

    // 4.7 Invalid status payload rejected
    try {
      await axios.patch(
        `${BASE_URL}/tasks/${task1Id}/status`,
        { status: 'InvalidColumn' },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      recordTest('4.7 Invalid Status Payload Rejection', false, 'Expected 400');
    } catch (err) {
      recordTest('4.7 Invalid Status Payload Rejection', err.response?.status === 400);
    }

    // -------------------------------------------------------------
    // SUITE 5: Task Comments Discussion
    // -------------------------------------------------------------
    console.log('\n--- Suite 5: Task Comments Discussion ---');
    let comment1Id, comment2Id;

    // 5.1 Developer 1 adds comment
    try {
      const res = await axios.post(
        `${BASE_URL}/tasks/${task1Id}/comments`,
        { text: 'Initial cluster benchmarks show 12k ops/sec.' },
        { headers: { Authorization: `Bearer ${dev1Token}` } }
      );
      comment1Id = res.data.data.comment._id;
      recordTest('5.1 Developer Posts Comment on Task', res.status === 201 && !!comment1Id);
    } catch (err) {
      recordTest('5.1 Developer Posts Comment on Task', false, err.message);
    }

    // 5.2 Team Leader adds comment
    try {
      const res = await axios.post(
        `${BASE_URL}/tasks/${task1Id}/comments`,
        { text: 'Great throughput! Verify memory usage under load.' },
        { headers: { Authorization: `Bearer ${leaderToken}` } }
      );
      comment2Id = res.data.data.comment._id;
      recordTest('5.2 Team Leader Posts Comment on Task', res.status === 201 && !!comment2Id);
    } catch (err) {
      recordTest('5.2 Team Leader Posts Comment on Task', false, err.message);
    }

    // 5.3 Outsider comment blocked
    try {
      await axios.post(
        `${BASE_URL}/tasks/${task1Id}/comments`,
        { text: 'Outsider comment' },
        { headers: { Authorization: `Bearer ${outsiderToken}` } }
      );
      recordTest('5.3 Outsider Blocked from Commenting', false, 'Expected 403');
    } catch (err) {
      recordTest('5.3 Outsider Blocked from Commenting', err.response?.status === 403);
    }

    // 5.4 Empty comment rejected
    try {
      await axios.post(
        `${BASE_URL}/tasks/${task1Id}/comments`,
        { text: '   ' },
        { headers: { Authorization: `Bearer ${dev1Token}` } }
      );
      recordTest('5.4 Empty Comment Rejection', false, 'Expected 400');
    } catch (err) {
      recordTest('5.4 Empty Comment Rejection', err.response?.status === 400);
    }

    // 5.5 Developer 2 attempts to delete Developer 1's comment (Forbidden)
    try {
      await axios.delete(`${BASE_URL}/tasks/${task1Id}/comments/${comment1Id}`, {
        headers: { Authorization: `Bearer ${dev2Token}` },
      });
      recordTest('5.5 Developer Blocked from Deleting Peer Comment', false, 'Expected 403');
    } catch (err) {
      recordTest('5.5 Developer Blocked from Deleting Peer Comment', err.response?.status === 403);
    }

    // 5.6 Developer 1 deletes own comment (Allowed)
    try {
      const res = await axios.delete(`${BASE_URL}/tasks/${task1Id}/comments/${comment1Id}`, {
        headers: { Authorization: `Bearer ${dev1Token}` },
      });
      recordTest('5.6 Author Successfully Deletes Own Comment', res.status === 200);
    } catch (err) {
      recordTest('5.6 Author Successfully Deletes Own Comment', false, err.message);
    }

    // 5.7 Admin deletes Leader's comment (Allowed for Admin)
    try {
      const res = await axios.delete(`${BASE_URL}/tasks/${task1Id}/comments/${comment2Id}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      recordTest('5.7 Admin Successfully Deletes Comment', res.status === 200);
    } catch (err) {
      recordTest('5.7 Admin Successfully Deletes Comment', false, err.message);
    }

    // -------------------------------------------------------------
    // SUITE 6: Task Deletion & Cascading Cleanups
    // -------------------------------------------------------------
    console.log('\n--- Suite 6: Task Deletion & Cascading Cleanups ---');

    // 6.1 Developer attempts to delete Task 2 (Forbidden)
    try {
      await axios.delete(`${BASE_URL}/tasks/${task2Id}`, {
        headers: { Authorization: `Bearer ${dev1Token}` },
      });
      recordTest('6.1 Developer Blocked from Deleting Task', false, 'Expected 403');
    } catch (err) {
      recordTest('6.1 Developer Blocked from Deleting Task', err.response?.status === 403);
    }

    // 6.2 Team Leader deletes Task 2 (Allowed)
    try {
      const res = await axios.delete(`${BASE_URL}/tasks/${task2Id}`, {
        headers: { Authorization: `Bearer ${leaderToken}` },
      });
      recordTest('6.2 Team Leader Deletes Task', res.status === 200 && res.data.data.taskId === task2Id);
    } catch (err) {
      recordTest('6.2 Team Leader Deletes Task', false, err.message);
    }

    // 6.3 Cascading deletion on project deletion
    try {
      // Create a temporary task under project
      const rTempTask = await axios.post(
        `${BASE_URL}/tasks`,
        { projectId, title: 'Temporary Task to be Cascaded' },
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      const tempTaskId = rTempTask.data.data.task._id;

      // Delete the parent project
      await axios.delete(`${BASE_URL}/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      // Verify task was also deleted
      let taskExists = false;
      try {
        await axios.get(`${BASE_URL}/tasks/${tempTaskId}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        });
        taskExists = true;
      } catch (e) {
        taskExists = false;
      }

      recordTest('6.3 Cascading Task Deletion on Project Deletion', !taskExists);
    } catch (err) {
      recordTest('6.3 Cascading Task Deletion on Project Deletion', false, err.message);
    }

  } catch (globalErr) {
    console.error('Fatal audit error:', globalErr);
  }

  console.log('\n=====================================================');
  console.log(` Phase 5 Audit Complete: ${results.passed} / ${results.total} Passed (${results.failed} Failed)`);
  console.log('=====================================================');
}

runPhase5Audit();
