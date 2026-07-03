/**
 * Domain Controller (Frontend)
 *
 * Manages loading hierarchical domains from backend, rendering them as collapsible sub-menus,
 * and handling sidebar click events.
 */

import { domainApi } from '../services/api.service.js';

export class DomainController {
  /**
   * @param {import('../pages/MainPage.js').MainPage} page
   * @param {(domain: object) => void} onSelectDomain - Callback triggered when a sub-domain is selected
   */
  constructor(page, onSelectDomain) {
    this._page = page;
    this._onSelect = onSelectDomain;
    this._domains = [];
  }

  /**
   * Loads all domains from the API and renders the hierarchical tree list in the sidebar.
   */
  async load() {
    try {
      const data = await domainApi.getAll();
      if (data.success) {
        this._domains = data.domains;
        this._render();
      }
    } catch (err) {
      console.error('Failed to load domains in sidebar:', err);
    }
  }

  _render() {
    const listContainer = this._page.domainList;
    if (!listContainer) return;

    listContainer.innerHTML = this._domains
      .map((parent) => {
        const subItems = parent.subDomains
          .map((sub) => `
            <button id="subDomainBtn-${sub.id}" class="domain-sub-btn" data-id="${sub.id}">
              <span class="mr-2 text-surface-600">•</span> ${sub.name}
            </button>`)
          .join('');

        return `
          <div class="domain-group" id="domainGroup-${parent.id}">
            <button class="domain-parent-btn" data-target="subDomainList-${parent.id}">
              <span>${parent.name}</span>
              <svg class="w-3.5 h-3.5 transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
              </svg>
            </button>
            <div id="subDomainList-${parent.id}" class="domain-sub-list">
              ${subItems}
            </div>
          </div>`;
      })
      .join('');

    // Bind event listeners for accordion collapse
    const parentButtons = listContainer.querySelectorAll('.domain-parent-btn');
    parentButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        const list = document.getElementById(targetId);
        if (list) {
          list.classList.toggle('collapsed');
          btn.classList.toggle('collapsed');
        }
      });
    });

    // Bind event listeners for child domains selection
    const subButtons = listContainer.querySelectorAll('.domain-sub-btn');
    subButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const domainId = parseInt(btn.getAttribute('data-id'), 10);
        
        // Highlight active sub-domain button
        subButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');

        // Find the selected domain object
        let selectedSub = null;
        for (const parent of this._domains) {
          const found = parent.subDomains.find(s => s.id === domainId);
          if (found) {
            selectedSub = found;
            break;
          }
        }

        if (selectedSub) {
          this._onSelect(selectedSub);
        }
      });
    });
  }

  /**
   * Recursively checks if the selected sub-domain is a child/descendant of the user's domain.
   * @param {number} userDomainId
   * @param {number} selectedDomainId
   * @returns {boolean}
   */
  isDescendantOrSelf(userDomainId, selectedDomainId) {
    if (userDomainId === selectedDomainId) return true;
    if (!userDomainId || !selectedDomainId) return false;

    // Flatten tree to map id -> parentId
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
