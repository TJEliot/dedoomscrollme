  const STORAGE_KEY = 'tasks';

  // State
  let tasks = [];

  // Elements
  const taskInput = document.getElementById('taskInput');
  const addBtn = document.getElementById('addBtn');
  const taskList = document.getElementById('taskList');
  const footer = document.getElementById('footer');
  const stats = document.getElementById('stats');
  const clearDoneBtn = document.getElementById('clearDone');

  async function loadTasks() {
    try {
      const result = await browser.storage.local.get(STORAGE_KEY);
      const arr = result[STORAGE_KEY];
      if (!Array.isArray(arr)) return [];
      return arr.filter(t =>
        t && typeof t.id === 'string' && typeof t.text === 'string' && typeof t.done === 'boolean'
      );
    } catch (e) {
      console.warn('Could not load tasks:', e);
      return [];
    }
  }

  async function saveTasks() {
    try {
      await browser.storage.local.set({ [STORAGE_KEY]: tasks });
    } catch (e) {
      console.warn('Could not save tasks:', e);
    }
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  async function addTask(text) {
    text = text.trim();
    if (!text) return;
    tasks.push({ id: generateId(), text, done: false });
    await saveTasks();
    render();
    taskInput.value = '';
    taskInput.focus();
  }

  async function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
      task.done = !task.done;
      await saveTasks();
      render();
    }
  }

  async function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    await saveTasks();
    render();
  }

  async function clearDone() {
    tasks = tasks.filter(t => !t.done);
    await saveTasks();
    render();
  }

  // Drag state
  let dragId = null;

  function render() {
    taskList.innerHTML = '';

    if (tasks.length === 0) {
      taskList.innerHTML = `
        <li class="empty">
          <span class="shrug">¯\\_(ツ)_/¯</span>
          nothing here yet. add something you keep meaning to do.
        </li>
      `;
      footer.style.display = 'none';
      return;
    }

    const doneCount = tasks.filter(t => t.done).length;
    const totalCount = tasks.length;
    const pendingCount = totalCount - doneCount;

    tasks.forEach(task => {
      const li = document.createElement('li');
      li.className = 'task' + (task.done ? ' done' : '');
      li.dataset.id = task.id;
      li.draggable = true;

      // Grip handle
      const grip = document.createElement('span');
      grip.className = 'task-grip';
      grip.textContent = '⠿';
      grip.setAttribute('aria-hidden', 'true');

      // Checkbox
      const check = document.createElement('input');
      check.type = 'checkbox';
      check.className = 'task-check';
      check.checked = task.done;
      check.setAttribute('aria-label', 'Mark "' + task.text + '" as ' + (task.done ? 'not done' : 'done'));
      check.addEventListener('change', () => toggleTask(task.id));

      // Text
      const span = document.createElement('span');
      span.className = 'task-text';
      span.textContent = task.text;

      // Delete
      const del = document.createElement('button');
      del.className = 'task-delete';
      del.textContent = '×';
      del.setAttribute('aria-label', 'Delete "' + task.text + '"');
      del.addEventListener('click', () => deleteTask(task.id));

      // Drag events
      li.addEventListener('dragstart', (e) => {
        dragId = task.id;
        li.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });

      li.addEventListener('dragend', () => {
        li.classList.remove('dragging');
        dragId = null;
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
      });

      li.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (task.id !== dragId) {
          li.classList.add('drag-over');
        }
      });

      li.addEventListener('dragleave', () => {
        li.classList.remove('drag-over');
      });

      li.addEventListener('drop', async (e) => {
        e.preventDefault();
        li.classList.remove('drag-over');
        if (dragId && dragId !== task.id) {
          const fromIdx = tasks.findIndex(t => t.id === dragId);
          const toIdx = tasks.findIndex(t => t.id === task.id);
          if (fromIdx !== -1 && toIdx !== -1) {
            const [moved] = tasks.splice(fromIdx, 1);
            tasks.splice(toIdx, 0, moved);
            await saveTasks();
            render();
          }
        }
      });

      li.appendChild(grip);
      li.appendChild(check);
      li.appendChild(span);
      li.appendChild(del);
      taskList.appendChild(li);
    });

    // Footer
    footer.style.display = 'flex';
    if (pendingCount === 0) {
      stats.textContent = 'all done. nice.';
    } else {
      stats.textContent = pendingCount + ' to go' + (doneCount > 0 ? ' · ' + doneCount + ' done' : '');
    }
    clearDoneBtn.style.display = doneCount > 0 ? 'inline' : 'none';
  }

  // Event listeners
  taskInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addTask(taskInput.value);
  });

  addBtn.addEventListener('click', () => addTask(taskInput.value));
  clearDoneBtn.addEventListener('click', clearDone);

  // Init: load tasks then render
  loadTasks().then(loaded => {
    tasks = loaded;
    render();
    taskInput.focus();
  });
