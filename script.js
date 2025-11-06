// Client-side timing logic
// Author: migrated from Tkinter version; supports:
// - multi players, pass, switch, reorder, extra time, total
// - always show HH:MM:SS.mm (two decimals)
// - start paused; Resume starts timers
// - drag & drop reordering + Up/Down buttons
// - mobile-touch friendly

(() => {
    // DOM elements
    const setupEl = document.getElementById('setup');
    const gameEl = document.getElementById('game');
    const namesContainer = document.getElementById('namesContainer');
    const numPlayersSelect = document.getElementById('numPlayers');
    const btnCreate = document.getElementById('btnCreate');
    const playersList = document.getElementById('playersList');
    const totalTimeEl = document.getElementById('totalTime');
    const extraTimeEl = document.getElementById('extraTime');
  
    const switchBtn = document.getElementById('switchBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const passBtn = document.getElementById('passBtn');
    const resetBtn = document.getElementById('resetBtn');
    const restartRoundBtn = document.getElementById('restartRoundBtn');
  
    // populate number select
    for (let i = 3; i <= 8; i++) {
      const opt = document.createElement('option');
      opt.value = i; opt.textContent = i;
      numPlayersSelect.appendChild(opt);
    }

    numPlayersSelect.value = "4";
  
    // create name fields
    function renderNameFields(count) {
      namesContainer.innerHTML = '';
      for (let i = 0; i < count; i++) {
        const row = document.createElement('div');
        row.className = 'name-row';
        const lbl = document.createElement('div');
        lbl.className = 'label';
        lbl.textContent = `Player ${i+1}:`;
        const input = document.createElement('input');
        input.type = 'text';
        input.value = `Player ${i+1}`;
        row.appendChild(lbl);
        row.appendChild(input);
        namesContainer.appendChild(row);
      }
    }
    renderNameFields(4);
    numPlayersSelect.addEventListener('change', () => renderNameFields(numPlayersSelect.value));
  
    // Internal state
    let players = []; // {name, time (s), passed}
    let extraTime = 0;
    let activeIndex = null; // index into players or null (extra time)
    let paused = true;      // starts paused
    let lastTime = performance.now();
  
    // Setup -> Create game
    btnCreate.addEventListener('click', () => {
      const inputs = Array.from(namesContainer.querySelectorAll('input'));
      players = inputs.map(inp => ({name: inp.value || 'Player', time: 0, passed: true}));
      extraTime = 0;
      activeIndex = null; // all passed => extra time
      paused = true;
      lastTime = performance.now();
      showGame();
    });
  
    function showGame() {
      setupEl.classList.add('hidden');
      gameEl.classList.remove('hidden');
      renderPlayers();
      updateDisplays();
    }
  
    function renderPlayers() {
      playersList.innerHTML = '';
      players.forEach((p, idx) => {
        const row = document.createElement('div');
        row.className = 'player-row';
        row.draggable = true;
        row.dataset.index = idx;
  
        // drag handle
        const handle = document.createElement('div');
        handle.className = 'handle';
        handle.textContent = '≡';
        row.appendChild(handle);
  
        // name
        const nameEl = document.createElement('div');
        nameEl.className = 'player-name';
        nameEl.textContent = p.name;
        row.appendChild(nameEl);
  
        // time
        const timeEl = document.createElement('div');
        timeEl.className = 'player-time';
        timeEl.textContent = formatTime(p.time);
        row.appendChild(timeEl);
  
        // up/down buttons
        const upBtn = document.createElement('button');
        upBtn.className = 'btn-small btn-updown';
        upBtn.textContent = '↑';
        upBtn.addEventListener('click', () => movePlayerUp(idx));
        row.appendChild(upBtn);
  
        const downBtn = document.createElement('button');
        downBtn.className = 'btn-small btn-updown';
        downBtn.textContent = '↓';
        downBtn.addEventListener('click', () => movePlayerDown(idx));
        row.appendChild(downBtn);
  
        // small status indicator (passed/active)
        // row styling handled in refreshDisplay
  
        // drag events
        row.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/plain', idx.toString());
          row.classList.add('dragging');
        });
        row.addEventListener('dragend', (e) => {
          row.classList.remove('dragging');
        });
  
        row.addEventListener('dragover', (e) => {
          e.preventDefault();
          row.classList.add('drag-over');
        });
        row.addEventListener('dragleave', () => row.classList.remove('drag-over'));
  
        row.addEventListener('drop', (e) => {
          e.preventDefault();
          row.classList.remove('drag-over');
          const from = parseInt(e.dataTransfer.getData('text/plain'));
          const to = idx;
          if (!Number.isNaN(from) && from !== to) {
            reorderPlayers(from, to);
          }
        });
  
        playersList.appendChild(row);
      });
      refreshDisplay();
    }
  
    // formatting: HH:MM:SS.mm (two decimals)
    function formatTime(seconds) {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const sec = Math.floor(seconds % 60);
      const ms = Math.floor((seconds - Math.floor(seconds)) * 100); // two decimals
      const hh = String(hours).padStart(2,'0');
      const mm = String(minutes).padStart(2,'0');
      const ss = String(sec).padStart(2,'0');
      const msS = String(ms).padStart(2,'0');
      return `${hh}:${mm}:${ss}.${msS}`;
    }
  
    // animation / timing loop
    function tick() {
      const now = performance.now();
      const elapsedMs = now - lastTime;
      lastTime = now;
      if (!paused) {
        const elapsedS = elapsedMs / 1000;
        if (activeIndex !== null && players.length > 0) {
          players[activeIndex].time += elapsedS;
        } else if (players.length > 0 && players.every(p => p.passed)) {
          extraTime += elapsedS;
        }
      }
      refreshDisplay();
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  
    // controls
    pauseBtn.addEventListener('click', () => {
      paused = !paused;
      pauseBtn.textContent = paused ? 'Resume' : 'Pause';
      if (!paused) lastTime = performance.now();
    });
  
    switchBtn.addEventListener('click', () => {
      if (paused) return;
      if (players.length === 0) return;
      // if currently extra time (activeIndex null), find first active player
      if (activeIndex === null) {
        const firstActive = players.findIndex(p => !p.passed);
        if (firstActive !== -1) {
          activeIndex = firstActive;
          lastTime = performance.now();
        }
        refreshDisplay();
        return;
      }
      let idx = activeIndex;
      for (let i = 1; i <= players.length; i++) {
        const cand = (idx + i) % players.length;
        if (!players[cand].passed) {
          activeIndex = cand;
          lastTime = performance.now();
          refreshDisplay();
          return;
        }
      }
      // nobody active => go to extra time
      activeIndex = null;
      refreshDisplay();
    });
  
    passBtn.addEventListener('click', () => {
      if (paused) return;
      if (activeIndex === null) return;
      players[activeIndex].passed = true;
      // try to switch to next active
      let next = null;
      for (let i = 1; i <= players.length; i++) {
        const cand = (activeIndex + i) % players.length;
        if (!players[cand].passed) { next = cand; break; }
      }
      if (next === null) {
        activeIndex = null; // extra time
      } else {
        activeIndex = next;
      }
      lastTime = performance.now();
      refreshDisplay();
    });
  
    restartRoundBtn.addEventListener('click', () => {
      players.forEach(p => p.passed = false);
      activeIndex = players.length > 0 ? 0 : null;
      lastTime = performance.now();
      refreshDisplay();
    });
  
    resetBtn.addEventListener('click', () => {
      players.forEach(p => { p.time = 0; p.passed = true; });
      extraTime = 0;
      activeIndex = null;
      paused = true;
      pauseBtn.textContent = 'Resume';
      lastTime = performance.now();
      refreshDisplay();
    });
  
    // reorder helpers
    function reorderPlayers(from, to) {
      // remove 'from' and insert at 'to', adjusting activeIndex
      const item = players.splice(from,1)[0];
      players.splice(to,0,item);
  
      // adjust activeIndex: find the player object and set index accordingly
      if (activeIndex === null) {
        // stays extra
      } else {
        // active player refers to a certain player object (by identity), find its new index
        // but since we moved within players array, active player index changes consistent with new array
        // find previous active player's name (unique enough)
        // simpler: if from === activeIndex then activeIndex = to; else adjust for shift
        if (from === activeIndex) activeIndex = to;
        else {
          if (from < activeIndex && to >= activeIndex) activeIndex -= 1;
          else if (from > activeIndex && to <= activeIndex) activeIndex += 1;
        }
      }
      renderPlayers();
    }
  
    function movePlayerUp(idx) {
      if (idx <= 0) return;
      reorderPlayers(idx, idx-1);
    }
    function movePlayerDown(idx) {
      if (idx >= players.length - 1) return;
      reorderPlayers(idx, idx+1);
    }
  
    // update UI display (times + classes)
    function refreshDisplay() {
      // update players row content & classes
      const rows = Array.from(playersList.children);
      // if rows mismatch (after initial render) re-render
      if (rows.length !== players.length) {
        renderPlayers();
        return;
      }
      players.forEach((p, idx) => {
        const row = rows[idx];
        const nameEl = row.querySelector('.player-name');
        const timeEl = row.querySelector('.player-time');
        nameEl.textContent = p.name;
        timeEl.textContent = formatTime(p.time);
  
        row.classList.toggle('passed', p.passed);
        row.classList.toggle('active', idx === activeIndex && !paused);
      });
      extraTimeEl.textContent = formatTime(extraTime);
      const total = players.reduce((acc,p) => acc + p.time, 0) + extraTime;
      totalTimeEl.textContent = formatTime(total);
    }
  
    // initial helper: on first show, create placeholder players rows
    function initialRenderPlayersEmpty() {
      playersList.innerHTML = '<div class="muted">Create a game to begin</div>';
    }
    initialRenderPlayersEmpty();
  
    // helper to render and choose first active if present
    function renderPlayers() {
      playersList.innerHTML = '';
      players.forEach((p, idx) => {
        const row = document.createElement('div');
        row.className = 'player-row';
        row.dataset.index = idx;
        row.draggable = true;
  
        const handle = document.createElement('div');
        handle.className = 'handle';
        handle.textContent = '≡';
        row.appendChild(handle);
  
        const nameEl = document.createElement('div');
        nameEl.className = 'player-name';
        nameEl.textContent = p.name;
        row.appendChild(nameEl);
  
        const timeEl = document.createElement('div');
        timeEl.className = 'player-time';
        timeEl.textContent = formatTime(p.time);
        row.appendChild(timeEl);
  
        const upBtn = document.createElement('button');
        upBtn.className = 'btn-small btn-updown';
        upBtn.textContent = '↑';
        upBtn.addEventListener('click', () => movePlayerUp(idx));
        row.appendChild(upBtn);
  
        const downBtn = document.createElement('button');
        downBtn.className = 'btn-small btn-updown';
        downBtn.textContent = '↓';
        downBtn.addEventListener('click', () => movePlayerDown(idx));
        row.appendChild(downBtn);
  
        // drag handlers
        row.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/plain', idx);
          row.classList.add('dragging');
        });
        row.addEventListener('dragend', () => row.classList.remove('dragging'));
        row.addEventListener('dragover', (e) => { e.preventDefault(); row.classList.add('drag-over'); });
        row.addEventListener('dragleave', () => row.classList.remove('drag-over'));
        row.addEventListener('drop', (e) => {
          e.preventDefault();
          row.classList.remove('drag-over');
          const from = parseInt(e.dataTransfer.getData('text/plain'));
          const to = idx;
          if (!Number.isNaN(from) && from !== to) reorderPlayers(from, to);
        });
  
        playersList.appendChild(row);
      });
  
      // if activeIndex is null but some players available and not all passed, ensure activeIndex points to first active
      if (activeIndex === null) {
        const anyActive = players.findIndex(p => !p.passed);
        if (anyActive !== -1) {
          // keep extra time if all passed, otherwise select first not passed
        }
      }
      refreshDisplay();
    }
  
  })();  