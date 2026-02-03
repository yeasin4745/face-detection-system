const video = document.getElementById('webcam');
const canvas = document.getElementById('overlay');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const helpBtn = document.getElementById('help-btn');
const loadingOverlay = document.getElementById('loading-overlay');
const cameraPlaceholder = document.getElementById('camera-placeholder');
const statusBadge = document.getElementById('status-badge');
const detectionCount = document.getElementById('detection-count');
const detectionList = document.getElementById('detection-list');

let stream = null;
let animationId = null;

lucide.createIcons();

const driver = window.driver.js.driver;
const driverObj = driver({
    showProgress: true,
    steps: [
        { element: '#main-title', popover: { title: 'Welcome!', description: 'Welcome to AI Face Detector Pro. Let us show you around.', side: "bottom", align: 'start' }},
        { element: '#video-container', popover: { title: 'Camera View', description: 'This is where the magic happens. Your camera feed and face markings will appear here.', side: "bottom", align: 'start' }},
        { element: '#start-btn', popover: { title: 'Start Detection', description: 'Click here to turn on your camera and start real-time face detection.', side: "top", align: 'start' }},
        { element: '#stats-panel', popover: { title: 'Live Analytics', description: 'Monitor detection count and facial expressions in real-time here.', side: "left", align: 'start' }},
        { element: '#info-card', popover: { title: 'Deployment', description: 'This project is ready to be deployed on Vercel with just one click.', side: "top", align: 'start' }},
        { element: '#help-btn', popover: { title: 'Need Help?', description: 'You can restart this tour anytime by clicking this help icon.', side: "bottom", align: 'end' }}
    ]
});

async function init() {
    try {
        const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
            faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
        ]);
        loadingOverlay.classList.add('hidden');
        
        if (!localStorage.getItem('tour_completed')) {
            driverObj.drive();
            localStorage.setItem('tour_completed', 'true');
        }
    } catch (error) {
        console.error(error);
        alert('Failed to load AI models.');
    }
}

async function startCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false
        });
        video.srcObject = stream;
        video.onloadedmetadata = () => {
            video.play();
            cameraPlaceholder.classList.add('hidden');
            startBtn.classList.add('hidden');
            stopBtn.classList.remove('hidden');
            statusBadge.textContent = 'Live';
            statusBadge.className = 'px-3 py-1 rounded-full text-xs font-bold badge-active uppercase tracking-wider';
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            detect();
        };
    } catch (error) {
        console.error(error);
        alert('Camera access denied or not available.');
    }
}

function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        video.srcObject = null;
    }
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    cameraPlaceholder.classList.remove('hidden');
    startBtn.classList.remove('hidden');
    stopBtn.classList.add('hidden');
    statusBadge.textContent = 'Offline';
    statusBadge.className = 'px-3 py-1 rounded-full text-xs font-bold bg-slate-700 text-slate-400 uppercase tracking-wider';
    detectionCount.textContent = '0';
    detectionList.innerHTML = '<p class="text-slate-600 italic text-sm">Waiting for detection...</p>';
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

async function detect() {
    if (video.paused || video.ended) return;
    const displaySize = { width: video.videoWidth, height: video.videoHeight };
    faceapi.matchDimensions(canvas, displaySize);
    const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceExpressions();
    const resizedDetections = faceapi.resizeResults(detections, displaySize);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    faceapi.draw.drawDetections(canvas, resizedDetections);
    faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
    faceapi.draw.drawFaceExpressions(canvas, resizedDetections);
    updateStats(detections);
    animationId = requestAnimationFrame(detect);
}

function updateStats(detections) {
    detectionCount.textContent = detections.length;
    if (detections.length > 0) {
        detectionList.innerHTML = '';
        detections.forEach((det, i) => {
            const expressions = det.expressions;
            const topExpression = Object.keys(expressions).reduce((a, b) => expressions[a] > expressions[b] ? a : b);
            const confidence = Math.round(expressions[topExpression] * 100);
            const item = document.createElement('div');
            item.className = 'detection-item flex justify-between items-center p-3 bg-slate-700/30 rounded-xl border border-slate-600/50';
            item.innerHTML = `
                <span class="capitalize font-medium">Face ${i + 1}: ${topExpression}</span>
                <span class="text-cyan-400 font-mono text-sm">${confidence}%</span>
            `;
            detectionList.appendChild(item);
        });
    } else {
        detectionList.innerHTML = '<p class="text-slate-600 italic text-sm">No faces detected</p>';
    }
}

startBtn.addEventListener('click', startCamera);
stopBtn.addEventListener('click', stopCamera);
helpBtn.addEventListener('click', () => driverObj.drive());

init();
