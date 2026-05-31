/* ============================================================
   AI Code Rectifier — Frontend Application (Vanilla JS)
   ============================================================ */

(function () {
  'use strict';

  // ── DOM References ──
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

  // Tabs
  const tabBtns = $$('.tab-btn');
  const tabPanels = $$('.tab-panel');
  const tabIndicator = $('#tab-indicator');

  // Code Analysis
  const codeInput = $('#code-input');
  const analysisLang = $('#analysis-language');
  const analyzeBtn = $('#analyze-btn');
  const analysisResultsContent = $('#analysis-results-content');
  const analysisLineNumbers = $('#analysis-line-numbers');

  // File Upload
  const uploadZone = $('#upload-zone');
  const fileInput = $('#file-input');
  const uploadFileInfo = $('#upload-file-info');
  const uploadFilename = $('#upload-filename');
  const uploadResultsContent = $('#upload-results-content');

  // GitHub
  const githubUrl = $('#github-url');
  const githubScanBtn = $('#github-scan-btn');
  const githubResultsContent = $('#github-results-content');
  const githubFileCount = $('#github-file-count');

  // AI Detector
  const detectorCodeInput = $('#detector-code-input');
  const detectorLang = $('#detector-language');
  const detectBtn = $('#detect-btn');
  const detectorResultsContent = $('#detector-results-content');
  const detectorLineNumbers = $('#detector-line-numbers');

  // Toast
  const toastContainer = $('#toast-container');

  // ============================================================
  //  TAB SYSTEM
  // ============================================================

  function initTabs() {
    updateIndicator(tabBtns.find(b => b.classList.contains('active')));

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = btn.dataset.tab;

        // Update buttons
        tabBtns.forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');

        // Update panels
        tabPanels.forEach(panel => {
          panel.classList.remove('active');
          panel.hidden = true;
        });
        const activePanel = $(`#panel-${tabId}`);
        if (activePanel) {
          activePanel.classList.add('active');
          activePanel.hidden = false;
        }

        // Move indicator
        updateIndicator(btn);
      });
    });

    // Recalculate indicator on resize
    window.addEventListener('resize', () => {
      const activeBtn = tabBtns.find(b => b.classList.contains('active'));
      if (activeBtn) updateIndicator(activeBtn);
    });
  }

  function updateIndicator(btn) {
    if (!btn || !tabIndicator) return;
    const bar = btn.parentElement;
    const barRect = bar.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();

    tabIndicator.style.width = `${btnRect.width}px`;
    tabIndicator.style.left = `${btnRect.left - barRect.left}px`;
  }

  // ============================================================
  //  LINE NUMBERS
  // ============================================================

  function setupLineNumbers(textarea, lineNumbersEl) {
    if (!textarea || !lineNumbersEl) return;

    function update() {
      const lines = textarea.value.split('\n').length;
      const nums = [];
      for (let i = 1; i <= lines; i++) nums.push(i);
      lineNumbersEl.textContent = nums.join('\n');
    }

    textarea.addEventListener('input', update);
    textarea.addEventListener('scroll', () => {
      lineNumbersEl.scrollTop = textarea.scrollTop;
    });

    update();
  }

  // ============================================================
  //  UTILITY FUNCTIONS
  // ============================================================

  function showLoading(container) {
    container.innerHTML = `
      <div class="skeleton-wrapper">
        <div class="skeleton skeleton-block"></div>
        <div>
          <div class="skeleton skeleton-line"></div>
          <div class="skeleton skeleton-line"></div>
          <div class="skeleton skeleton-line"></div>
          <div class="skeleton skeleton-line"></div>
        </div>
        <div class="skeleton skeleton-block-lg"></div>
      </div>
    `;
  }

  function showError(container, message) {
    container.innerHTML = `
      <div class="error-message">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/>
          <line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
        <span class="error-message-text">${escapeHtml(message)}</span>
      </div>
    `;
  }

  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
      <span>${escapeHtml(message)}</span>
    `;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-exit');
      toast.addEventListener('animationend', () => toast.remove());
    }, 3000);
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showToast('Copied to clipboard!');
      }).catch(() => {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showToast('Copied to clipboard!');
    } catch {
      showToast('Failed to copy');
    }
    document.body.removeChild(ta);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ============================================================
  //  RENDER HELPERS
  // ============================================================

  function renderBugs(bugs) {
    if (!bugs || bugs.length === 0) {
      return `
        <div class="result-section">
          <div class="result-section-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            Bugs Found
          </div>
          <p style="color: var(--success); font-size: 0.875rem;">No bugs found — looking good! ✨</p>
        </div>
      `;
    }

    const items = bugs.map(bug => {
      const severity = (bug.severity || 'info').toLowerCase();
      const severityClass = `severity-${severity}`;
      return `
        <li class="bug-item">
          <div class="bug-meta">
            ${bug.line != null ? `<span class="line-badge">Line ${bug.line}</span>` : ''}
            <span class="severity-badge ${severityClass}">${escapeHtml(severity)}</span>
          </div>
          <span class="bug-description">${escapeHtml(bug.bug || bug.description || '')}</span>
        </li>
      `;
    }).join('');

    return `
      <div class="result-section">
        <div class="result-section-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          Bugs Found · ${bugs.length}
        </div>
        <ul class="bug-list">${items}</ul>
      </div>
    `;
  }

  function renderExplanation(explanation) {
    if (!explanation) return '';
    return `
      <div class="result-section">
        <div class="result-section-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 16v-4"/>
            <path d="M12 8h.01"/>
          </svg>
          Explanation
        </div>
        <div class="explanation-box">
          <p class="explanation-text">${escapeHtml(explanation)}</p>
        </div>
      </div>
    `;
  }

  function renderFixedCode(code, language) {
    if (!code) return '';
    const id = 'fixed-code-' + Date.now();
    return `
      <div class="result-section">
        <div class="result-section-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="16 18 22 12 16 6"/>
            <polyline points="8 6 2 12 8 18"/>
          </svg>
          Fixed Code${language ? ` · ${language}` : ''}
        </div>
        <div class="fixed-code-wrapper">
          <button class="copy-btn" data-copy-target="${id}" aria-label="Copy fixed code">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            Copy
          </button>
          <div class="fixed-code-block">
            <pre><code id="${id}">${escapeHtml(code)}</code></pre>
          </div>
        </div>
      </div>
    `;
  }

  function renderAnalysisResults(data) {
    let html = '';
    html += renderBugs(data.bugs_found);
    html += renderExplanation(data.explanation);
    html += renderFixedCode(data.fixed_code, data.language);
    return html;
  }

  // ============================================================
  //  EVENT DELEGATION — COPY BUTTONS
  // ============================================================

  document.addEventListener('click', (e) => {
    const copyBtn = e.target.closest('.copy-btn');
    if (!copyBtn) return;

    const targetId = copyBtn.dataset.copyTarget;
    const codeEl = document.getElementById(targetId);
    if (codeEl) {
      copyToClipboard(codeEl.textContent);
    }
  });

  // ============================================================
  //  API HELPER
  // ============================================================

  async function apiPost(url, body, isFormData = false) {
    const options = {
      method: 'POST',
      headers: {},
    };

    if (isFormData) {
      options.body = body;
    } else {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }

    // Add CSRF token if available (Django)
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      options.headers['X-CSRFToken'] = csrfToken;
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      let errorMsg = `Server error (${response.status})`;
      try {
        const errData = await response.json();
        errorMsg = errData.error || errData.message || errData.detail || errorMsg;
      } catch {
        // ignore JSON parse error
      }
      throw new Error(errorMsg);
    }

    return response.json();
  }

  function getCsrfToken() {
    // Try cookie first
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'csrftoken') return value;
    }
    // Try meta tag
    const meta = $('meta[name="csrf-token"]');
    if (meta) return meta.content;
    // Try hidden input
    const input = $('input[name="csrfmiddlewaretoken"]');
    if (input) return input.value;
    return null;
  }

  // ============================================================
  //  TAB 1 — CODE ANALYSIS
  // ============================================================

  function initCodeAnalysis() {
    if (!analyzeBtn) return;

    analyzeBtn.addEventListener('click', async () => {
      const code = codeInput.value.trim();
      const language = analysisLang.value;

      if (!code) {
        showError(analysisResultsContent, 'Please enter some code to analyze.');
        return;
      }

      analyzeBtn.disabled = true;
      analyzeBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: pulse 1s ease-in-out infinite;">
          <circle cx="12" cy="12" r="10"/>
        </svg>
        <span>Analyzing…</span>
      `;
      showLoading(analysisResultsContent);

      try {
        const data = await apiPost('/api/analyze/', { code, language });
        analysisResultsContent.innerHTML = renderAnalysisResults(data);
      } catch (err) {
        showError(analysisResultsContent, err.message || 'An unexpected error occurred.');
      } finally {
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <span>Analyze Code</span>
        `;
      }
    });
  }

  // ============================================================
  //  TAB 2 — FILE UPLOAD
  // ============================================================

  function initFileUpload() {
    if (!uploadZone) return;

    const validExtensions = ['.py', '.js', '.ts', '.java', '.cpp', '.c', '.go', '.rb', '.rs', '.php'];

    // Drag and drop
    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      uploadZone.classList.add('drag-over');
    });

    uploadZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      uploadZone.classList.remove('drag-over');
    });

    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      uploadZone.classList.remove('drag-over');

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileUpload(files[0]);
      }
    });

    // File input change
    fileInput.addEventListener('change', () => {
      if (fileInput.files.length > 0) {
        handleFileUpload(fileInput.files[0]);
      }
    });

    async function handleFileUpload(file) {
      const fileName = file.name;
      const ext = '.' + fileName.split('.').pop().toLowerCase();

      if (!validExtensions.includes(ext)) {
        showError(uploadResultsContent, `Unsupported file type "${ext}". Accepted: ${validExtensions.join(', ')}`);
        return;
      }

      // Show file info
      uploadFilename.textContent = fileName;
      uploadFileInfo.hidden = false;

      showLoading(uploadResultsContent);

      const formData = new FormData();
      formData.append('file', file);

      try {
        const data = await apiPost('/api/upload/', formData, true);
        uploadResultsContent.innerHTML = renderAnalysisResults(data);
      } catch (err) {
        showError(uploadResultsContent, err.message || 'Failed to upload and analyze file.');
      }
    }
  }

  // ============================================================
  //  TAB 3 — GITHUB ANALYZER
  // ============================================================

  function initGitHub() {
    if (!githubScanBtn) return;

    githubScanBtn.addEventListener('click', async () => {
      const url = githubUrl.value.trim();

      if (!url) {
        showError(githubResultsContent, 'Please enter a GitHub repository URL.');
        return;
      }

      if (!url.includes('github.com')) {
        showError(githubResultsContent, 'Please enter a valid GitHub URL (e.g., https://github.com/user/repo).');
        return;
      }

      githubScanBtn.disabled = true;
      githubScanBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: pulse 1s ease-in-out infinite;">
          <circle cx="12" cy="12" r="10"/>
        </svg>
        <span>Scanning…</span>
      `;
      githubFileCount.hidden = true;
      showLoading(githubResultsContent);

      try {
        const data = await apiPost('/api/github/', { repo_url: url });

        // Show file count
        githubFileCount.textContent = `${data.total_files || 0} files scanned`;
        githubFileCount.hidden = false;

        if (!data.results || data.results.length === 0) {
          githubResultsContent.innerHTML = `
            <div class="empty-state">
              <p class="empty-state-text">No files found to analyze in this repository.</p>
            </div>
          `;
          return;
        }

        githubResultsContent.innerHTML = renderGitHubResults(data.results);

        // Attach accordion event listeners
        $$('.file-card-header', githubResultsContent).forEach(header => {
          header.addEventListener('click', () => {
            const card = header.parentElement;
            card.classList.toggle('expanded');
          });
        });

      } catch (err) {
        showError(githubResultsContent, err.message || 'Failed to scan repository.');
      } finally {
        githubScanBtn.disabled = false;
        githubScanBtn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <span>Scan Repository</span>
        `;
      }
    });
  }

  function renderGitHubResults(results) {
    const cards = results.map((fileResult, i) => {
      const bugCount = fileResult.bugs_found ? fileResult.bugs_found.length : 0;
      const innerHtml = renderAnalysisResults(fileResult);

      return `
        <div class="file-card${i === 0 ? ' expanded' : ''}">
          <div class="file-card-header">
            <span class="file-card-name">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              ${escapeHtml(fileResult.file || `File ${i + 1}`)}
            </span>
            <div style="display:flex; align-items:center; gap:10px;">
              ${bugCount > 0 ? `<span class="file-bug-count">${bugCount} bug${bugCount !== 1 ? 's' : ''}</span>` : ''}
              <svg class="file-card-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </div>
          </div>
          <div class="file-card-body">${innerHtml}</div>
        </div>
      `;
    }).join('');

    return `<div class="file-accordion">${cards}</div>`;
  }

  // ============================================================
  //  TAB 4 — AI DETECTOR
  // ============================================================

  function initDetector() {
    if (!detectBtn) return;

    detectBtn.addEventListener('click', async () => {
      const code = detectorCodeInput.value.trim();
      const language = detectorLang.value;

      if (!code) {
        showError(detectorResultsContent, 'Please enter some code to analyze.');
        return;
      }

      detectBtn.disabled = true;
      detectBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: pulse 1s ease-in-out infinite;">
          <circle cx="12" cy="12" r="10"/>
        </svg>
        <span>Detecting…</span>
      `;
      showLoading(detectorResultsContent);

      try {
        const data = await apiPost('/api/detect/', { code, language });
        detectorResultsContent.innerHTML = renderDetectorResults(data);

        // Animate confidence bar after render
        requestAnimationFrame(() => {
          const fill = $('#confidence-fill');
          if (fill) {
            fill.style.width = `${data.confidence || 0}%`;
          }
        });
      } catch (err) {
        showError(detectorResultsContent, err.message || 'An unexpected error occurred.');
      } finally {
        detectBtn.disabled = false;
        detectBtn.innerHTML = `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
          <span>Detect Origin</span>
        `;
      }
    });
  }

  function renderDetectorResults(data) {
    const isAI = (data.verdict || '').toLowerCase().includes('ai');
    const verdictClass = isAI ? 'verdict-ai' : 'verdict-human';

    let indicatorsHtml = '';
    if (data.indicators && data.indicators.length > 0) {
      const items = data.indicators.map(ind => {
        const badgeClass = (ind.suggests || '').toLowerCase() === 'ai' ? 'indicator-ai' : 'indicator-human';
        return `
          <li class="indicator-item">
            <span class="indicator-badge ${badgeClass}">${escapeHtml(ind.suggests || '')}</span>
            <span class="indicator-pattern">${escapeHtml(ind.pattern || '')}</span>
          </li>
        `;
      }).join('');

      indicatorsHtml = `
        <div class="result-section">
          <div class="result-section-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            Indicators
          </div>
          <ul class="indicators-list">${items}</ul>
        </div>
      `;
    }

    return `
      <div class="verdict-section">
        <p class="verdict-label">Verdict</p>
        <p class="verdict-text ${verdictClass}">${escapeHtml(data.verdict || 'Unknown')}</p>
      </div>

      <div class="confidence-section">
        <div class="confidence-header">
          <span class="confidence-label">Confidence</span>
          <span class="confidence-value">${data.confidence || 0}%</span>
        </div>
        <div class="confidence-bar">
          <div class="confidence-fill" id="confidence-fill" style="width: 0%;"></div>
        </div>
      </div>

      ${data.reasoning ? `
        <div class="result-section">
          <div class="result-section-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4"/>
              <path d="M12 8h.01"/>
            </svg>
            Reasoning
          </div>
          <div class="explanation-box">
            <p class="explanation-text">${escapeHtml(data.reasoning)}</p>
          </div>
        </div>
      ` : ''}

      ${indicatorsHtml}
    `;
  }

  // ============================================================
  //  KEYBOARD SHORTCUTS
  // ============================================================

  function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + Enter to submit active tab
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const activePanel = $('.tab-panel.active');
        if (!activePanel) return;

        if (activePanel.id === 'panel-analysis' && analyzeBtn && !analyzeBtn.disabled) {
          e.preventDefault();
          analyzeBtn.click();
        } else if (activePanel.id === 'panel-github' && githubScanBtn && !githubScanBtn.disabled) {
          e.preventDefault();
          githubScanBtn.click();
        } else if (activePanel.id === 'panel-detector' && detectBtn && !detectBtn.disabled) {
          e.preventDefault();
          detectBtn.click();
        }
      }
    });
  }

  // ============================================================
  //  INITIALIZATION
  // ============================================================

  function init() {
    initTabs();
    setupLineNumbers(codeInput, analysisLineNumbers);
    setupLineNumbers(detectorCodeInput, detectorLineNumbers);
    initCodeAnalysis();
    initFileUpload();
    initGitHub();
    initDetector();
    initKeyboardShortcuts();
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
