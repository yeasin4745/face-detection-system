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
        { element: '#main-title', popover: { title: 'AI Vision Pro', description: 'Experience advanced face analysis in real-time.', side: "bottom", align: 'start' }},
        { element: '#video-container', popover: { title: 'Live View', description: 'Watch the AI track face landmarks, expressions, age, and gender here.', side: "bottom", align: 'start' }},
        { element: '#start-btn', popover: { title: 'Start AI', description: 'Enable your camera to begin the real-time detection process.', side: "top", align: 'start' }},
        { element: '#stats-panel', popover: { title: 'Real-time Stats', description: 'Detailed analysis for every face detected in the frame.', side: "left", align: 'start' }},
        { element: '#help-btn', popover: { title: 'Help', description: 'Restart this guide anytime if you need a refresher.', side: "bottom", align: 'end' }}
    ]
});

async function init() {
    try {
        const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
            faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
            faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL)
        ]);
        loadingOverlay.classList.add('hidden');
        if (!localStorage.getItem('tour_completed')) {
            driverObj.drive();
            localStorage.setItem('tour_completed', 'true');
        }
    } catch (error) {
        console.error(error);
        alert('Failed to load AI models. Please check your internet connection.');
    }
}

async function startCamera() {
    try {
        const constraints = {
            video: { 
                facingMode: 'user', 
                width: { ideal: window.innerWidth < 768 ? 640 : 1280 }, 
                height: { ideal: window.innerWidth < 768 ? 480 : 720 } 
            },
            audio: false
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        video.onloadedmetadata = () => {
            video.play();
            cameraPlaceholder.classList.add('hidden');
            startBtn.classList.add('hidden');
            stopBtn.classList.remove('hidden');
            statusBadge.textContent = 'Live';
            statusBadge.className = 'px-3 py-1 rounded-full text-[10px] md:text-xs font-bold badge-active uppercase tracking-wider';
            resizeCanvas();
            detect();
        };
    } catch (error) {
        console.error(error);
        alert('Camera access denied or not available.');
    }
}

function resizeCanvas() {
    const rect = video.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
}

function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        video.srcObject = null;
    }
    if (animationId) cancelAnimationFrame(animationId);
    cameraPlaceholder.classList.remove('hidden');
    startBtn.classList.remove('hidden');
    stopBtn.classList.add('hidden');
    statusBadge.textContent = 'Offline';
    statusBadge.className = 'px-3 py-1 rounded-full text-[10px] md:text-xs font-bold bg-slate-700 text-slate-400 uppercase tracking-wider';
    detectionCount.textContent = '0';
    detectionList.innerHTML = '<p class="text-slate-600 italic text-xs md:text-sm">Waiting for detection...</p>';
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

async function detect() {
    if (video.paused || video.ended) return;
    const displaySize = { width: canvas.width, height: canvas.height };
    faceapi.matchDimensions(canvas, displaySize);
    const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceExpressions()
        .withAgeAndGender();
    const resizedDetections = faceapi.resizeResults(detections, displaySize);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    faceapi.draw.drawDetections(canvas, resizedDetections);
    faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
    faceapi.draw.drawFaceExpressions(canvas, resizedDetections);
    resizedDetections.forEach(result => {
        const { age, gender, genderProbability } = result;
        new faceapi.draw.DrawTextField(
            [
                `${faceapi.utils.round(age, 0)} years`,
                `${gender} (${faceapi.utils.round(genderProbability, 2)})`
            ],
            result.detection.box.bottomLeft
        ).draw(canvas);
    });
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
            const age = Math.round(det.age);
            const gender = det.gender;
            const item = document.createElement('div');
            item.className = 'detection-item p-3 bg-slate-700/30 rounded-xl border border-slate-600/50 space-y-1';
            item.innerHTML = `
                <div class="flex justify-between items-center">
                    <span class="capitalize font-bold text-cyan-400 text-sm">Face ${i + 1}</span>
                    <span class="text-slate-400 text-[10px] font-mono">${gender}, ~${age}y</span>
                </div>
                <div class="flex justify-between items-center">
                    <span class="text-xs text-slate-300 capitalize">${topExpression}</span>
                    <span class="text-xs font-mono text-cyan-500">${confidence}%</span>
                </div>
            `;
            detectionList.appendChild(item);
        });
    } else {
        detectionList.innerHTML = '<p class="text-slate-600 italic text-xs md:text-sm">No faces detected</p>';
    }
}

startBtn.addEventListener('click', startCamera);
stopBtn.addEventListener('click', stopCamera);
helpBtn.addEventListener('click', () => driverObj.drive());
window.addEventListener('resize', resizeCanvas);

init();
