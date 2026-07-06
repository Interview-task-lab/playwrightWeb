/**
 * RunConfiguration Controller (Frontend)
 *
 * Coordinates loading, creating, running, and deleting run configurations.
 * Handles role-based and domain-based filtering for both domain selection and test case selection.
 */

import { runConfigurationApi, domainApi, testCaseApi } from '../services/api.service.js';
import { authService } from '../services/auth.service.js';

export class RunConfigurationController {
  /**
   * @param {import('../pages/MainPage.js').MainPage} page
   * @param {import('../components/Toast.js').Toast} toast
   * @param {{ userId: number, role: string, domain_id: number|null }} user
   */
  constructor(page, toast, user) {
    this._page = page;
    this._toast = toast;
    this._user = user;
    this._domains = [];
    this._allTestCases = [];
    this._configs = [];
    this._pollInterval = null;
    this._runningConfigId = null;
  }

  /**
   * Binds UI events. Called once in main.js.
   */
  bind() {
    // Form toggle
    this._page.toggleCreateConfigBtn?.addEventListener('click', () => this._toggleCreateForm());
    this._page.cancelCreateConfigBtn?.addEventListener('click', () => this._toggleCreateForm(false));

    // Type select change triggers conditional UI
    this._page.configTypeSelect?.addEventListener('change', () => this._handleTypeChange());

    // Domain checkboxes change filters test cases in custom selection list and syncs parent/child checkboxes
    this._page.configDomainsList?.addEventListener('change', (e) => {
      if (e.target.name === 'configDomain') {
        const isParent = e.target.getAttribute('data-is-parent') === 'true';
        if (isParent) {
          const parentId = e.target.getAttribute('data-id');
          const children = this._page.configDomainsList.querySelectorAll(`input[data-parent-id="${parentId}"]`);
          children.forEach((child) => {
            child.checked = e.target.checked;
          });
        } else {
          const parentId = e.target.getAttribute('data-parent-id');
          if (parentId) {
            const parentCheckbox = this._page.configDomainsList.querySelector(`input[data-is-parent="true"][data-id="${parentId}"]`);
            if (parentCheckbox) {
              const allChildren = Array.from(this._page.configDomainsList.querySelectorAll(`input[data-parent-id="${parentId}"]`));
              const checkedChildren = allChildren.filter(c => c.checked);
              if (checkedChildren.length === allChildren.length) {
                parentCheckbox.checked = true;
              } else if (checkedChildren.length === 0) {
                parentCheckbox.checked = false;
              } else {
                parentCheckbox.checked = false;
              }
            }
          }
        }
        this._populateTestCasesCheckboxes();
      }
    });

    // Save configuration
    this._page.saveConfigBtn?.addEventListener('click', () => this._saveConfig());

    // Refresh configurations list
    this._page.refreshConfigsBtn?.addEventListener('click', () => this.load());

    // Test case checklist toggle adds/removes to draggable order list
    this._page.configTestCasesList?.addEventListener('change', (e) => {
      if (e.target.name === 'configTestCase') {
        this._handleTestCaseCheckboxChange(e.target);
      }
    });

    // Initialize drag and drop
    this._initDragAndDrop();
  }

  /**
   * Loads configurations, domains, and test cases.
   */
  async load() {
    try {
      this._page.configsGrid.innerHTML = `
        <div class="col-span-full text-center py-12 text-surface-500 text-sm">
          <svg class="w-8 h-8 animate-spin mx-auto mb-3 text-accent-500" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
          </svg>
          Yükleniyor...
        </div>`;

      // Fetch all required data in parallel
      const [configsData, domainsData, testCasesData] = await Promise.all([
        runConfigurationApi.getAll(),
        domainApi.getAll(),
        testCaseApi.getAll()
      ]);

      if (configsData.success) this._configs = configsData.configs;
      if (domainsData.success) this._domains = domainsData.domains;
      if (testCasesData.success) this._allTestCases = testCasesData.testCases;

      this._populateDomainCheckboxes();
      this._populateTestCasesCheckboxes();
      this._renderConfigs();

      // Check if runner is currently executing a configuration for this user
      await this._checkActiveRunnerStatus();

    } catch (err) {
      this._toast.show('Veriler yüklenirken hata oluştu: ' + err.message, 'error');
    }
  }

  _toggleCreateForm(show = null) {
    const section = this._page.createConfigSection;
    if (!section) return;

    const shouldShow = show !== null ? show : section.classList.contains('hidden');
    if (shouldShow) {
      section.classList.remove('hidden');
      this._page.toggleCreateConfigBtn.innerHTML = `
        <svg class="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
        Kapat`;
    } else {
      section.classList.add('hidden');
      this._page.toggleCreateConfigBtn.innerHTML = `
        <svg class="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
        </svg>
        Yeni Konfigürasyon`;
      // Clear inputs
      this._page.configNameInput.value = '';
      this._page.configTypeSelect.value = 'domain';
      this._handleTypeChange();
    }
  }

  _handleTypeChange() {
    this._populateTestCasesCheckboxes();
  }

  /**
   * Populates domain checkbox list in creation form.
   * Flattens parent/child structure and filters according to user domain if team member.
   */
  _populateDomainCheckboxes() {
    const container = this._page.configDomainsList;
    if (!container) return;

    container.innerHTML = '';
    container.className = 'space-y-4';

    const isUserAllowed = (domainId) => {
      if (this._user.role === 'admin' || this._user.role === 'qa') return true;
      return this._isDescendantOrSelf(this._user.domain_id, domainId);
    };

    let html = '';

    this._domains.forEach((parent) => {
      const parentAllowed = isUserAllowed(parent.id);
      const allowedChildren = (parent.subDomains || []).filter(sub => isUserAllowed(sub.id));

      if (parentAllowed || allowedChildren.length > 0) {
        let childrenHtml = '';
        if (allowedChildren.length > 0) {
          childrenHtml = allowedChildren
            .map((child) => `
              <label class="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-900/60 border border-surface-800 hover:border-surface-700 cursor-pointer transition select-none">
                <input type="checkbox" name="configDomain" value="${child.id}" data-parent-id="${parent.id}" class="rounded text-accent-500 focus:ring-accent-500 border-surface-700 bg-surface-950 w-4 h-4" />
                <span class="text-xs text-white">${child.name}</span>
              </label>
            `)
            .join('');
        }

        if (parentAllowed) {
          html += `
            <div class="domain-group border-b border-surface-800/40 pb-3 last:border-b-0 last:pb-0">
              <label class="flex items-center gap-2 mb-2 cursor-pointer select-none">
                <input type="checkbox" name="configDomain" value="${parent.id}" data-is-parent="true" data-id="${parent.id}" class="rounded text-accent-500 focus:ring-accent-500 border-surface-700 bg-surface-950 w-4 h-4" />
                <span class="text-sm font-bold text-white">${parent.name}</span>
              </label>
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 pl-6">${childrenHtml}</div>
            </div>
          `;
        } else {
          html += `
            <div class="domain-group border-b border-surface-800/40 pb-3 last:border-b-0 last:pb-0">
              <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">${childrenHtml}</div>
            </div>
          `;
        }
      }
    });

    if (!html) {
      container.innerHTML = '<div class="text-center text-xs text-surface-500 py-4">Yetkili domain bulunamadı.</div>';
      return;
    }

    container.innerHTML = html;
  }

  /**
   * Populates test cases checklist based on target domain selection and user access.
   */
  _populateTestCasesCheckboxes() {
    const container = this._page.configTestCasesList;
    if (!container) return;

    container.innerHTML = '';

    // Get all checked target domain IDs
    const checkedDomainBoxes = Array.from(this._page.configDomainsList.querySelectorAll('input[name="configDomain"]:checked'));
    const selectedDomainIds = checkedDomainBoxes.map(cb => parseInt(cb.value, 10));

    if (selectedDomainIds.length === 0) {
      this._page.configTestCasesWrapper?.classList.add('hidden');
      return;
    }

    // Show wrapper when domains are selected
    this._page.configTestCasesWrapper?.classList.remove('hidden');

    // Filter test cases that belong to any of the selectedDomainIds hierarchies
    const filteredTests = this._allTestCases.filter((tc) => {
      // Must belong to at least one selected domain or its sub-domains
      let isDomainMatch = false;
      for (const dId of selectedDomainIds) {
        if (this._isDescendantOrSelf(dId, tc.domain_id)) {
          isDomainMatch = true;
          break;
        }
      }
      
      // Must also be accessible by current logged in user
      let isUserMatch = true;
      if (this._user.role !== 'admin' && this._user.role !== 'qa') {
        isUserMatch = this._isDescendantOrSelf(this._user.domain_id, tc.domain_id);
      }
      return isDomainMatch && isUserMatch;
    });

    if (this._page.configSelectedOrderList) {
      this._page.configSelectedOrderList.innerHTML = '';
      if (this._page.configSelectedOrderEmpty) {
        this._page.configSelectedOrderList.appendChild(this._page.configSelectedOrderEmpty);
        this._page.configSelectedOrderEmpty.classList.remove('hidden');
      }
    }

    if (filteredTests.length === 0) {
      container.innerHTML = '<div class="col-span-full text-center text-xs text-surface-500">Seçili domainler altında test senaryosu bulunamadı.</div>';
      return;
    }

    const isDomainType = this._page.configTypeSelect?.value === 'domain';

    container.innerHTML = filteredTests
      .map((tc) => {
        const checkedAttribute = isDomainType ? 'checked disabled' : '';
        return `
          <label class="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-900/60 border border-surface-800 hover:border-surface-700 cursor-pointer transition select-none">
            <input type="checkbox" name="configTestCase" value="${tc.id}" ${checkedAttribute} class="rounded text-accent-500 focus:ring-accent-500 border-surface-700 bg-surface-950 w-4 h-4" />
            <div class="flex flex-col min-w-0">
              <span class="text-xs font-semibold text-white truncate">${tc.name}</span>
              <span class="text-[10px] text-surface-400 truncate">${tc.domain_name || 'No Domain'}</span>
            </div>
          </label>`;
      })
      .join('');

    // If it is domain type, automatically populate the sortable execution list with all tests
    if (isDomainType) {
      const orderList = this._page.configSelectedOrderList;
      const emptyDiv = this._page.configSelectedOrderEmpty;
      
      filteredTests.forEach((testCase) => {
        const item = document.createElement('div');
        item.setAttribute('draggable', 'true');
        item.setAttribute('data-id', testCase.id.toString());
        item.className = 'flex items-center gap-3 p-3 bg-surface-900 border border-surface-800 rounded-xl cursor-grab active:cursor-grabbing hover:border-surface-700 transition select-none';
        item.innerHTML = `
          <div class="text-surface-500 shrink-0">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"/>
            </svg>
          </div>
          <div class="flex flex-col min-w-0">
            <span class="text-xs font-semibold text-white truncate">${testCase.name}</span>
            <span class="text-[10px] text-surface-400 truncate">${testCase.domain_name || 'No Domain'}</span>
          </div>
        `;
        orderList.appendChild(item);
      });
      if (filteredTests.length > 0) {
        emptyDiv?.classList.add('hidden');
      }
    }
  }

  /**
   * Appends or removes test cases in the drag-and-drop sortable list.
   * @param {HTMLInputElement} checkbox
   */
  _handleTestCaseCheckboxChange(checkbox) {
    const tcId = parseInt(checkbox.value, 10);
    const orderList = this._page.configSelectedOrderList;
    const emptyDiv = this._page.configSelectedOrderEmpty;

    if (checkbox.checked) {
      const testCase = this._allTestCases.find(t => t.id === tcId);
      if (!testCase) return;

      const item = document.createElement('div');
      item.setAttribute('draggable', 'true');
      item.setAttribute('data-id', tcId.toString());
      item.className = 'flex items-center gap-3 p-3 bg-surface-900 border border-surface-800 rounded-xl cursor-grab active:cursor-grabbing hover:border-surface-700 transition select-none';
      item.innerHTML = `
        <div class="text-surface-500 shrink-0">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8h16M4 16h16"/>
          </svg>
        </div>
        <div class="flex flex-col min-w-0">
          <span class="text-xs font-semibold text-white truncate">${testCase.name}</span>
          <span class="text-[10px] text-surface-400 truncate">${testCase.domain_name || 'No Domain'}</span>
        </div>
      `;
      orderList.appendChild(item);
      emptyDiv?.classList.add('hidden');
    } else {
      const existingItem = orderList.querySelector(`[data-id="${tcId}"]`);
      if (existingItem) {
        existingItem.remove();
      }
      
      const remains = orderList.querySelectorAll('[draggable="true"]');
      if (remains.length === 0) {
        emptyDiv?.classList.remove('hidden');
      }
    }
  }

  /**
   * Initializes drag and drop sorting for test cases.
   */
  _initDragAndDrop() {
    const list = this._page.configSelectedOrderList;
    if (!list) return;

    let draggedItem = null;

    list.addEventListener('dragstart', (e) => {
      draggedItem = e.target.closest('[draggable="true"]');
      if (draggedItem) {
        draggedItem.classList.add('opacity-40');
      }
    });

    list.addEventListener('dragend', (e) => {
      if (draggedItem) {
        draggedItem.classList.remove('opacity-40');
        draggedItem = null;
      }
    });

    list.addEventListener('dragover', (e) => {
      e.preventDefault();
      const afterElement = this._getDragAfterElement(list, e.clientY);
      const draggable = draggedItem;
      if (!draggable) return;
      if (afterElement == null) {
        list.appendChild(draggable);
      } else {
        list.insertBefore(draggable, afterElement);
      }
    });
  }

  /**
   * Determines which element the cursor is positioned directly below during a drag event.
   */
  _getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('[draggable="true"]:not(.opacity-40)')];

    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  /**
   * Saves a new run configuration to backend.
   */
  async _saveConfig() {
    const name = this._page.configNameInput.value.trim();
    const type = this._page.configTypeSelect.value;

    if (!name) {
      this._toast.show('Lütfen konfigürasyon adını girin.', 'error');
      return;
    }

    const checkedDomainBoxes = Array.from(this._page.configDomainsList.querySelectorAll('input[name="configDomain"]:checked'));
    const domainIds = checkedDomainBoxes.map(cb => parseInt(cb.value, 10));

    if (domainIds.length === 0) {
      this._toast.show('Lütfen en az bir hedef domain seçin.', 'error');
      return;
    }

    const isSerial = this._page.configRunModeSelect?.value === 'true';
    const payload = { name, type, domainIds, isSerial };

    const orderItems = Array.from(this._page.configSelectedOrderList.querySelectorAll('[draggable="true"]'));

    if (type === 'custom') {
      if (orderItems.length === 0) {
        this._toast.show('Lütfen en az bir test senaryosu seçin.', 'error');
        return;
      }
      payload.testCaseIds = orderItems.map(item => parseInt(item.getAttribute('data-id'), 10));
    } else {
      if (orderItems.length > 0) {
        payload.testCaseIds = orderItems.map(item => parseInt(item.getAttribute('data-id'), 10));
      }
    }

    try {
      this._page.saveConfigBtn.disabled = true;
      this._page.saveConfigBtn.textContent = 'Saving...';

      const data = await runConfigurationApi.create(payload);
      if (data.success) {
        this._toast.show('Konfigürasyon başarıyla oluşturuldu.', 'success');
        this._toggleCreateForm(false);
        await this.load();
      }
    } catch (err) {
      this._toast.show(err.message || 'Konfigürasyon kaydedilemedi.', 'error');
    } finally {
      this._page.saveConfigBtn.disabled = false;
      this._page.saveConfigBtn.textContent = 'Kaydet ve Oluştur';
    }
  }

  /**
   * Renders the grid list of all configurations.
   */
  _renderConfigs() {
    const grid = this._page.configsGrid;
    const emptyState = this._page.configsEmptyState;

    if (this._configs.length === 0) {
      grid.innerHTML = '';
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');

    grid.innerHTML = this._configs
      .map((config) => {
        const typeBadge = config.type === 'domain'
          ? `<span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Domain Bazlı</span>`
          : `<span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-accent-500/10 text-accent-400 border border-accent-500/20">Özel Seçim</span>`;

        const runModeBadge = config.is_serial !== false
          ? `<span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">Seri</span>`
          : `<span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">Paralel</span>`;

        const reportBtnHtml = config.last_report_url
          ? `<a id="reportConfigBtn-${config.id}" href="http://localhost:3001${config.last_report_url}" target="_blank" class="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 bg-accent-500/10 text-accent-400 border border-accent-500/20 hover:bg-accent-500/20">
               <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293 l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
               </svg>
               Report
             </a>`
          : '';

        return `
          <div class="glass-card p-5 flex flex-col justify-between" id="configCard-${config.id}">
            <div>
              <div class="flex items-start justify-between gap-3 mb-2">
                <h4 class="font-bold text-white text-sm truncate" title="${config.name}">${config.name}</h4>
                <div class="flex gap-1.5 shrink-0">
                  ${typeBadge}
                  ${runModeBadge}
                  <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-surface-800 text-surface-300 border border-surface-700/50" title="${config.domain_names}">${config.domain_names}</span>
                </div>
              </div>
              <p class="text-[10px] text-surface-400 mb-4">
                Oluşturan: <strong class="text-white">${config.creator_username || 'Sistem'}</strong> · ${new Date(config.created_at).toLocaleString()}
              </p>
              
              <!-- Content Description / Test Cases Toggle -->
              <div class="bg-surface-950/30 border border-surface-800/60 rounded-xl p-3 mb-5 text-xs text-surface-300 leading-relaxed">
                ${config.type === 'domain'
                  ? `Seçili domainler (${config.domain_names}) ve altındaki tüm domainlerdeki test senaryolarını koşar.`
                  : `<div class="cursor-pointer select-none flex items-center justify-between text-accent-400 font-semibold" data-toggle-list="${config.id}">
                       <span>Test senaryolarını göster</span>
                       <svg class="w-3.5 h-3.5 transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                       </svg>
                     </div>
                     <div id="tcDetailsList-${config.id}" class="hidden space-y-1 mt-2 text-[10px] text-surface-400 max-h-24 overflow-y-auto custom-scrollbar pt-1">
                       Yükleniyor...
                     </div>`
                }
              </div>
            </div>

            <!-- Action buttons -->
            <div class="flex items-center justify-between border-t border-surface-800/40 pt-4 mt-auto">
              <button class="btn-ghost py-1.5 px-3 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-1" data-action="delete" data-id="${config.id}">
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                </svg>
                Sil
              </button>
              <div class="flex items-center gap-2" id="actionsWrapper-${config.id}">
                <button class="btn-primary text-xs py-1.5 px-4 flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500" id="runConfigBtn-${config.id}" data-action="run" data-id="${config.id}">
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                  Run
                </button>
                ${reportBtnHtml}
              </div>
            </div>
          </div>`;
      })
      .join('');

    // Bind event listeners to config cards
    this._bindCardActions();
  }

  _bindCardActions() {
    const grid = this._page.configsGrid;

    // Delete actions
    grid.querySelectorAll('button[data-action="delete"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'), 10);
        if (confirm('Bu konfigürasyonu silmek istediğinize emin misiniz?')) {
          this._deleteConfig(id);
        }
      });
    });

    // Run actions
    grid.querySelectorAll('button[data-action="run"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'), 10);
        this._runConfig(id);
      });
    });

    // Toggle custom test list view
    grid.querySelectorAll('div[data-toggle-list]').forEach((el) => {
      el.addEventListener('click', async () => {
        const id = parseInt(el.getAttribute('data-toggle-list'), 10);
        const listDiv = document.getElementById(`tcDetailsList-${id}`);
        const iconSvg = el.querySelector('svg');

        if (!listDiv) return;

        listDiv.classList.toggle('hidden');
        iconSvg.classList.toggle('rotate-180');

        if (!listDiv.classList.contains('hidden') && listDiv.textContent.trim() === 'Yükleniyor...') {
          try {
            // Lazy load test cases for this custom config
            const response = await fetch(`http://localhost:3001/api/run-configurations/${id}`);
            // Wait, we need an endpoint, or we can query our repository.
            // Oh, we defined `GET /api/run-configurations/:id` or similar? Let's check.
            // We defined `getConfigsForUser` and `/api/run-configurations` GET.
            // Wait, we can fetch all test cases from the config via test cases service.
            // Let's create an endpoint in the routes: we didn't add GET /:id but wait!
            // We can fetch them via a dedicated endpoint, or we can just fetch testCases for config.
            // Let's add GET /:id/tests to return the test cases for that run configuration! That is very clean.
            // Wait! Let's check what endpoints we declared in `runConfiguration.routes.js`:
            // `router.get('/', getConfigs);`
            // Let's see: we can easily add an endpoint: `router.get('/:id/tests', authorizeRunConfigAccess('read'), getTestsForConfig)`
            // Wait! We can also fetch the list of test cases in frontend by joining local state of config.testCaseIds!
            // Wait, did the config database record return `test_cases`?
            // No, `findAll` in repository returns `run_configurations` rows. It does not return the list of test cases.
            // So a separate API endpoint to fetch test cases of a config is extremely clean!
            // Let's add that API route and controller method. I will do that in the next step.
            // For now, let's fetch from `/api/run-configurations/${id}/tests`.
            const res = await fetch(`http://localhost:3001/api/run-configurations/${id}/tests`, {
              headers: {
                'Authorization': `Bearer ${authService.getToken()}`
              }
            });
            const data = await res.json();
            if (data.success && data.testCases) {
              if (data.testCases.length === 0) {
                listDiv.innerHTML = '<div>Tanımlı test bulunamadı.</div>';
              } else {
                listDiv.innerHTML = data.testCases
                  .map(tc => `<div class="flex items-center justify-between py-0.5 border-b border-surface-900/40">
                                <span class="truncate pr-2">${tc.name}</span>
                                <span class="text-[9px] shrink-0 opacity-60">${tc.domain_name || 'No Domain'}</span>
                              </div>`)
                  .join('');
              }
            } else {
              listDiv.innerHTML = '<div>Hata: Testler yüklenemedi.</div>';
            }
          } catch (err) {
            listDiv.innerHTML = '<div>Hata oluştu.</div>';
          }
        }
      });
    });
  }

  async _deleteConfig(id) {
    try {
      const data = await runConfigurationApi.delete(id);
      if (data.success) {
        this._toast.show('Konfigürasyon başarıyla silindi.', 'success');
        await this.load();
      }
    } catch (err) {
      this._toast.show('Silme hatası: ' + err.message, 'error');
    }
  }

  async _runConfig(id) {
    if (this._runningConfigId !== null) {
      this._toast.show('Lütfen mevcut koşumun tamamlanmasını bekleyin.', 'warning');
      return;
    }

    try {
      this._page.setConfigRunBtnLoading(id);
      this._runningConfigId = id;

      const data = await runConfigurationApi.run(id);
      if (data.success) {
        this._toast.show(data.message, 'success');
        this._startPollingStatus();
      }
    } catch (err) {
      this._toast.show('Çalıştırma hatası: ' + err.message, 'error');
      this._page.resetConfigRunBtn(id);
      this._runningConfigId = null;
    }
  }

  /**
   * Status polling mechanism
   */
  _startPollingStatus() {
    if (this._pollInterval) clearInterval(this._pollInterval);

    this._pollInterval = setInterval(async () => {
      try {
        const response = await fetch('http://localhost:3001/api/test-cases/run-status', {
          headers: {
            'Authorization': `Bearer ${authService.getToken()}`
          }
        });
        const status = await response.json();

        if (status.status === 'idle') {
          this._stopPollingStatus();
          if (this._runningConfigId !== null) {
            this._page.resetConfigRunBtn(this._runningConfigId);
            this._runningConfigId = null;
          }
        } else if (status.status === 'completed' || status.status === 'error') {
          this._stopPollingStatus();
          
          if (this._runningConfigId !== null) {
            const configId = this._runningConfigId;
            this._page.resetConfigRunBtn(configId);
            this._runningConfigId = null;

            if (status.status === 'completed') {
              this._toast.show('Koşum başarıyla tamamlandı!', 'success');
            } else {
              this._toast.show('Koşum sırasında hata oluştu. Detaylar raporda.', 'error');
            }

            if (status.reportUrl) {
              this._page.addConfigReportBtn(configId, `http://localhost:3001${status.reportUrl}`);
            }
          }
        }
      } catch (err) {
        console.error('Polling status error:', err);
      }
    }, 1500);
  }

  _stopPollingStatus() {
    if (this._pollInterval) {
      clearInterval(this._pollInterval);
      this._pollInterval = null;
    }
  }

  /**
   * Checks if a config run was already running on load
   */
  async _checkActiveRunnerStatus() {
    try {
      const response = await fetch('http://localhost:3001/api/test-cases/run-status', {
        headers: {
          'Authorization': `Bearer ${authService.getToken()}`
        }
      });
      const status = await response.json();

      if (status.status === 'running' && status.isConfigRun && status.runConfigId) {
        this._runningConfigId = status.runConfigId;
        this._page.setConfigRunBtnLoading(status.runConfigId);
        this._startPollingStatus();
      }
    } catch (err) {
      console.warn('Failed to check active runner status.');
    }
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  _isDescendantOrSelf(userDomainId, selectedDomainId) {
    if (userDomainId === selectedDomainId) return true;
    if (!userDomainId || !selectedDomainId) return false;

    // Flatten domains to map id -> parentId
    const parentMap = new Map();
    const traverse = (nodes) => {
      nodes.forEach((node) => {
        parentMap.set(node.id, node.parentId);
        if (node.subDomains && node.subDomains.length > 0) {
          traverse(node.subDomains);
        }
      });
    };
    traverse(this._domains);

    let currentId = selectedDomainId;
    while (currentId !== undefined && currentId !== null) {
      if (currentId === userDomainId) return true;
      currentId = parentMap.get(currentId);
    }
    return false;
  }
}
