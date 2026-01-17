const video = document.getElementById('webcam');
const canvas = document.getElementById('overlay');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const loadingOverlay = document.getElementById('loading-overlay');
const cameraPlaceholder = document.getElementById('camera-placeholder');
const statusBadge = document.getElementById('status-badge');
const detectionCount = document.getElementById('detection-count');
const detectionList = document.getElementById('detection-list');

let model = null;
let stream = null;
let animationId = null;

lucide.createIcons();

async function init() {
    try {
        model = await cocoSsd.load();
        loadingOverlay.classList.add('hidden');
    } catch (error) {
        console.error(error);
        alert('Failed to load AI model.');
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
    detectionList.innerHTML = '<p class="text-slate-600 italic text-sm">Waiting for data...</p>';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

async function detect() {
    if (!model || video.paused || video.ended) return;

    const predictions = await model.detect(video);
    
    renderPredictions(predictions);
    
    animationId = requestAnimationFrame(detect);
}

function renderPredictions(predictions) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    detectionCount.textContent = predictions.length;
    
    if (predictions.length > 0) {
        detectionList.innerHTML = '';
        
        predictions.forEach(prediction => {
            const [x, y, width, height] = prediction.bbox;
            const score = Math.round(prediction.score * 100);
            
            ctx.strokeStyle = '#22d3ee';
            ctx.lineWidth = 4;
            ctx.strokeRect(x, y, width, height);
            
            ctx.fillStyle = '#22d3ee';
            const textWidth = ctx.measureText(`${prediction.class} ${score}%`).width;
            ctx.fillRect(x, y - 30, textWidth + 20, 30);
            
            ctx.fillStyle = '#0f172a';
            ctx.font = 'bold 16px Inter';
            ctx.fillText(`${prediction.class} ${score}%`, x + 10, y - 10);
            
            const item = document.createElement('div');
            item.className = 'detection-item flex justify-between items-center p-3 bg-slate-700/30 rounded-xl border border-slate-600/50';
            item.innerHTML = `
                <span class="capitalize font-medium">${prediction.class}</span>
                <span class="text-cyan-400 font-mono text-sm">${score}%</span>
            `;
            detectionList.appendChild(item);
        });
    } else {
        detectionList.innerHTML = '<p class="text-slate-600 italic text-sm">No objects detected</p>';
    }
}

startBtn.addEventListener('click', startCamera);
stopBtn.addEventListener('click', stopCamera);


init();
