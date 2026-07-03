/**
 * Frontend Entry Point
 *
 * Wires up all components and controllers.
 * Only responsibility: dependency injection and event binding.
 */

import { configApi } from './services/api.service.js';
import { MainPage } from './pages/MainPage.js';
import { StatusBadge } from './components/StatusBadge.js';
import { Toast } from './components/Toast.js';
import { Modal } from './components/Modal.js';
import { RecordingController } from './controllers/recording.controller.js';
import { TestListController } from './controllers/testList.controller.js';
import { RunnerController } from './controllers/runner.controller.js';

document.addEventListener('DOMContentLoaded', async () => {
  // ─── Instantiate Page Object ────────────────────────────────────────────
  const page = new MainPage();

  // ─── Instantiate Shared Components ──────────────────────────────────────
  const statusBadge = new StatusBadge(page.statusBadge);
  const toast       = new Toast(page.toastContainer);
  const modal       = new Modal(
    page.detailModal,
    page.modalTitle,
    page.modalBody,
    page.closeModalBtn
  );

  // ─── Instantiate Controllers ─────────────────────────────────────────────
  const recordingCtrl = new RecordingController(page, statusBadge, toast);
  const testListCtrl  = new TestListController(page, toast, modal, () => recordingCtrl.result);
  const runnerCtrl    = new RunnerController(page, toast);

  // ─── Bind Events ─────────────────────────────────────────────────────────
  page.startBtn.addEventListener('click',        () => recordingCtrl.start());
  page.copyCodeBtn.addEventListener('click',     () => recordingCtrl.copyCode());
  page.newRecordingBtn.addEventListener('click', () => recordingCtrl.resetForNewRecording());
  page.saveTestBtn.addEventListener('click',     () => testListCtrl.save());
  page.refreshTestsBtn.addEventListener('click', () => testListCtrl.load());

  // Enter key on URL input triggers recording
  page.urlInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') recordingCtrl.start();
  });

  // RunnerController listens to 'run-test' events dispatched by TestListController
  runnerCtrl.bind();

  // ─── Initial Data Load ────────────────────────────────────────────────────
  try {
    const cfg = await configApi.get();
    if (cfg.success && cfg.config.targetUrl) {
      page.configUrl = cfg.config.targetUrl;
    }
  } catch {
    console.warn('Failed to load config from backend.');
  }

  await testListCtrl.load();
});
