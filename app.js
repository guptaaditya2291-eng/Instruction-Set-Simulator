/**
 * Instruction Set Simulator - Main UI & Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const themeToggleBtn = document.getElementById('theme-toggle');
  const expressionInput = document.getElementById('expression-input');
  const clearBtn = document.getElementById('clear-btn');
  const generateBtn = document.getElementById('generate-btn');
  const chips = document.querySelectorAll('.chip');
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');
  const inputCardBody = document.querySelector('.input-card .card-body');

  /* ==========================================
     1. Theme Toggle Management
     ========================================== */
  const savedTheme = localStorage.getItem('iss_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);

  themeToggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('iss_theme', newTheme);
  });

  /* ==========================================
     2. Input Field & Clear Button
     ========================================== */
  clearBtn.addEventListener('click', () => {
    expressionInput.value = '';
    hideErrorAlert();
    expressionInput.focus();
  });

  /* ==========================================
     3. Example Expression Chips
     ========================================== */
  chips.forEach(chip => {
    chip.addEventListener('click', () => {
      const expr = chip.getAttribute('data-expr');
      if (expr) {
        expressionInput.value = expr;
        hideErrorAlert();
        expressionInput.focus();
        processExpression();
      }
    });
  });

  /* ==========================================
     4. Tab Navigation Switcher
     ========================================== */
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');

      // Update active state on tab buttons
      tabBtns.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      // Update active panel
      tabPanels.forEach(panel => {
        panel.classList.remove('active');
        if (panel.id === `panel-${targetTab}`) {
          panel.classList.add('active');
        }
      });
    });
  });

  /* ==========================================
     5. Validation Error UI
     ========================================== */
  function showErrorAlert(message) {
    hideErrorAlert();

    const alertEl = document.createElement('div');
    alertEl.id = 'validation-alert';
    alertEl.className = 'alert-error';
    alertEl.innerHTML = `
      <svg class="alert-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <div class="alert-message"><strong>Syntax Error:</strong> ${escapeHtml(message)}</div>
    `;

    inputCardBody.insertBefore(alertEl, inputCardBody.firstChild);

    expressionInput.classList.add('shake');
    setTimeout(() => expressionInput.classList.remove('shake'), 500);
  }

  function hideErrorAlert() {
    const existing = document.getElementById('validation-alert');
    if (existing) {
      existing.remove();
    }
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, match => {
      const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
      return map[match];
    });
  }

  /* ==========================================
     6. Process Expression & Render Tab Panels
     ========================================== */
  function processExpression() {
    hideErrorAlert();
    const rawExpr = expressionInput.value;

    const parseResult = Parser.parse(rawExpr);
    if (!parseResult.isValid) {
      showErrorAlert(parseResult.error);
      return;
    }

    const tokens = parseResult.tokens;
    const postfixData = Simulator.toPostfix(tokens);
    const code3Addr = Simulator.generate3Address(postfixData.postfixTokens);
    const code2Addr = Simulator.generate2Address(postfixData.postfixTokens);
    const code1Addr = Simulator.generate1Address(postfixData.postfixTokens);
    const code0Addr = Simulator.generate0Address(postfixData.postfixTokens);

    // Render panels
    renderInstructionTab('panel-3address', 'Three-Address Instructions', code3Addr);
    renderInstructionTab('panel-2address', 'Two-Address Instructions', code2Addr);
    renderInstructionTab('panel-1address', 'One-Address (Accumulator) Instructions', code1Addr);
    renderInstructionTab('panel-0address', 'Zero-Address (Stack Machine) Instructions', code0Addr);


    // Pulse active tab panel feedback
    const activePanel = document.querySelector('.tab-panel.active');
    if (activePanel) {
      activePanel.style.opacity = '0.5';
      setTimeout(() => { activePanel.style.opacity = '1'; }, 150);
    }
  }

  /* ==========================================
     7. Render Functions
     ========================================== */
  function renderInstructionTab(panelId, title, instructions) {

    const panel = document.getElementById(panelId);
    const codeText = instructions.join('\n');

    const linesHtml = instructions.map((line, idx) => `
      <div class="code-line">
        <span class="line-num">${idx + 1}</span>
        <span class="line-content">${highlightSyntax(line)}</span>
      </div>
    `).join('');

    panel.innerHTML = `
      <div class="code-container">
        <div class="code-header-bar">
          <span class="code-meta">${title} (${instructions.length} instructions)</span>
          <button class="copy-btn" data-copy="${escapeHtml(codeText)}">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span>Copy</span>
          </button>
        </div>
        <div class="code-block">
          ${linesHtml}
        </div>
      </div>
    `;

    attachCopyHandlers(panel);
  }

  function highlightSyntax(line) {
    const escaped = escapeHtml(line);
    return escaped
      .replace(/\b(MOV|ADD|SUB|MUL|DIV|LOAD|STORE|PUSH|POP)\b/g, '<span class="op">$1</span>')
      .replace(/\b(R\d+)\b/g, '<span class="reg">$1</span>')
      .replace(/\b(T\d+|TEMP\d+)\b/g, '<span class="var">$1</span>');
  }

  function attachCopyHandlers(container) {
    const copyBtns = container.querySelectorAll('.copy-btn');
    copyBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const textToCopy = btn.getAttribute('data-copy');
        navigator.clipboard.writeText(textToCopy).then(() => {
          const span = btn.querySelector('span');
          const originalText = span.textContent;
          span.textContent = 'Copied!';
          btn.style.borderColor = 'var(--accent-secondary)';
          setTimeout(() => {
            span.textContent = originalText;
            btn.style.borderColor = '';
          }, 1500);
        });
      });
    });
  }

  /* ==========================================
     8. Event Listeners for Generate & Enter
     ========================================== */
  generateBtn.addEventListener('click', processExpression);

  expressionInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      processExpression();
    }
  });

  // Auto-process initial default expression on load
  processExpression();
});
