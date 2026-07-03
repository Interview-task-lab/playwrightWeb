const { Router } = require('express');
const { startRecording, getRecordingStatus } = require('../controllers/record.controller');

const router = Router();

router.post('/start', startRecording);
router.get('/status', getRecordingStatus);

module.exports = router;
