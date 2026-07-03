/**
 * CodeParser Service
 *
 * Pure utility functions for parsing and transforming Playwright codegen output.
 * Stateless — no side effects, no I/O.
 * Follows Single Responsibility Principle.
 */

class CodeParserService {
  /**
   * Parses raw Playwright codegen output into human-readable step descriptions.
   * @param {string} code - Raw Playwright script
   * @param {string} language - Target language (e.g. 'javascript')
   * @returns {{ step: number, description: string }[]}
   */
  parseCodeToSteps(code, language) {
    if (!code || typeof code !== 'string') return [];

    // Uncomment any assertions recorded as comments by Codegen
    const cleanedCode = code.replace(/^\s*\/\/\s*(await\s+expect\(.*)/gm, '$1');
    const lines = cleanedCode.split('\n');
    const steps = [];
    let stepNum = 1;

    for (const rawLine of lines) {
      const line = rawLine.trim();

      if (this._isSkippableLine(line)) continue;

      const description = this._describeAction(line);

      if (description) {
        steps.push({ step: stepNum, description });
        stepNum++;
      }
    }

    return steps;
  }

  /**
   * Converts a standalone Playwright codegen script to @playwright/test format.
   * @param {string} code - Raw or standalone Playwright script
   * @param {string} testName - Name for the test() block
   * @returns {string} - Formatted Playwright test file content
   */
  convertToPlaywrightTest(code, testName) {
    if (code && typeof code === 'string') {
      code = code.replace(/^\s*\/\/\s*(await\s+expect\(.*)/gm, '  $1');
    }

    // Already in test format — return as-is
    if (code.includes('test(') || code.includes('test.describe(')) {
      return code;
    }

    const bodyLines = this._extractActionLines(code);
    const safeName = testName.replace(/'/g, "\\'");
    let body = bodyLines.join('\n');

    // Replace absolute URLs with relative paths to use baseURL from config
    body = body.replace(/goto\(['"]https?:\/\/([^'"]+?)['"]\)/g, (match, urlPath) => {
      const slashIdx = urlPath.indexOf('/');
      if (slashIdx === -1) {
        return "goto('/')";
      }
      return `goto('${urlPath.slice(slashIdx)}')`;
    });

    return `const { test, expect } = require('@playwright/test');\n\ntest('${safeName}', async ({ page }) => {\n${body}\n});\n`;
  }

  /**
   * Uncomments Playwright assertion lines that codegen records as comments.
   * @param {string} code
   * @returns {string}
   */
  uncommentAssertions(code) {
    if (!code || typeof code !== 'string') return code;
    return code.replace(/^\s*\/\/\s*(await\s+expect\(.*)/gm, '  $1');
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────

  _isSkippableLine(line) {
    return (
      !line ||
      line.startsWith('//') ||
      line.startsWith('import ') ||
      line.startsWith('const ') ||
      line.startsWith('from ') ||
      line.startsWith('async ') ||
      line.startsWith('await browser') ||
      line.startsWith('await context') ||
      line === '});' ||
      line === '})' ||
      line === '}' ||
      line === '{' ||
      line.startsWith('test(') ||
      line.startsWith('test.describe') ||
      line.startsWith('module.') ||
      line.startsWith('exports.') ||
      line.startsWith('require(')
    );
  }

  _describeAction(line) {
    // page.goto
    const gotoMatch = line.match(/\.goto\(['"](.*?)['"]/);
    if (gotoMatch) return `Navigate to "${gotoMatch[1]}"`;

    // getByRole click
    const roleClickMatch = line.match(/\.(?:get_by_role|getByRole)\(['"](.*?)['"],?\s*\{?\s*name:\s*['"](.*?)['"]/);
    if (roleClickMatch) return `Click ${roleClickMatch[1]} "${roleClickMatch[2]}"`;

    // locator click
    const locatorClickMatch = line.match(/\.locator\(['"](.*?)['"]\)\.click/);
    if (locatorClickMatch) return `Click element "${locatorClickMatch[1]}"`;

    // generic click(selector)
    const genericClickMatch = line.match(/\.click\(['"](.*?)['"]\)/);
    if (genericClickMatch) return `Click "${genericClickMatch[1]}"`;

    // .click()
    if (line.includes('.click(')) return 'Click element';

    // .fill
    const fillMatch = line.match(/\.fill\(['"](.*?)['"],\s*['"](.*?)['"]\)/);
    if (fillMatch) return `Fill "${fillMatch[1]}" with "${fillMatch[2]}"`;

    const fillLocatorMatch = line.match(/\.locator\(['"](.*?)['"]\)\.fill\(['"](.*?)['"]\)/);
    if (fillLocatorMatch) return `Fill element "${fillLocatorMatch[1]}" with "${fillLocatorMatch[2]}"`;

    const labelFill = line.match(/\.(?:get_by_label|getByLabel)\(['"](.*?)['"]\)\.fill\(['"](.*?)['"]\)/);
    if (labelFill) return `Fill label "${labelFill[1]}" with "${labelFill[2]}"`;

    const placeholderFill = line.match(/\.(?:get_by_placeholder|getByPlaceholder)\(['"](.*?)['"]\)\.fill\(['"](.*?)['"]\)/);
    if (placeholderFill) return `Fill placeholder "${placeholderFill[1]}" with "${placeholderFill[2]}"`;

    // .press
    const pressMatch = line.match(/\.press\(['"](.*?)['"]\)/);
    if (pressMatch) return `Press key "${pressMatch[1]}"`;

    // .selectOption
    const selectMatch = line.match(/\.(?:select_option|selectOption)\(['"](.*?)['"]\)/);
    if (selectMatch) return `Select option "${selectMatch[1]}"`;

    // .check / .uncheck
    if (line.includes('.check(')) return 'Check checkbox';
    if (line.includes('.uncheck(')) return 'Uncheck checkbox';

    // .hover
    if (line.includes('.hover(')) return 'Hover over element';

    // .dblclick
    if (line.includes('.dblclick(') || line.includes('.double_click(')) return 'Double-click element';

    // assertions
    if (line.match(/expect\(.*\)\..*(?:toBeVisible|to_be_visible)/)) return 'Assert element is visible';

    const textMatch = line.match(/expect\(.*\)\..*(?:toHaveText|to_have_text|toContainText|to_contain_text)\(['"](.*?)['"]\)/);
    if (textMatch) return `Assert text contains "${textMatch[1]}"`;

    // waitForURL
    const waitURLMatch = line.match(/\.(?:waitForURL|wait_for_url)\(['"](.*?)['"]/);
    if (waitURLMatch) return `Wait for URL "${waitURLMatch[1]}"`;

    // getByText click
    const textClick = line.match(/\.(?:get_by_text|getByText)\(['"](.*?)['"]\)\.click/);
    if (textClick) return `Click text "${textClick[1]}"`;

    // getByRole click (simpler)
    const roleClick = line.match(/\.(?:get_by_role|getByRole)\(['"](.*?)['"].*\)\.click/);
    if (roleClick) return `Click ${roleClick[1]}`;

    // close
    if (line.includes('page.close') || line.includes('browser.close') || line.includes('context.close')) {
      return 'Close browser';
    }

    // Fallback for any await action
    if (line.includes('await') && !line.includes('newPage') && !line.includes('newContext')) {
      const cleaned = line.replace(/await\s+/, '').replace(/;$/, '').trim();
      if (cleaned.length > 0 && cleaned.length < 120) return `Action: ${cleaned}`;
    }

    return null;
  }

  _extractActionLines(code) {
    const lines = code.split('\n');
    const bodyLines = [];

    for (const line of lines) {
      const trimmed = line.trim();
      const isPageAction = trimmed.startsWith('await page.');
      const isExpect = trimmed.startsWith('await expect(') || trimmed.startsWith('expect(');
      const isComment = trimmed.startsWith('//');
      const isEmptyLine = trimmed === '';

      if (isPageAction || isExpect) {
        bodyLines.push(`  ${trimmed}`);
      } else if (isComment && bodyLines.length > 0) {
        bodyLines.push(`  ${trimmed}`);
      } else if (isEmptyLine && bodyLines.length > 0) {
        bodyLines.push('');
      }
    }

    // Remove trailing empty lines
    while (bodyLines.length > 0 && bodyLines[bodyLines.length - 1].trim() === '') {
      bodyLines.pop();
    }

    return bodyLines;
  }
}

module.exports = new CodeParserService();
