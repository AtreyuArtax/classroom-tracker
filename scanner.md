<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Classroom Washroom Scanner</title>
    <!-- Vue 3 -->
    <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
    <!-- Tailwind CSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- HTML5 QR Code Scanner -->
    <script src="https://unpkg.com/html5-qrcode" type="text/javascript"></script>
    <!-- QR Code Generator -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrious/4.0.2/qrious.min.js"></script>
    <style>
        /* Ensures the print preview looks clean and breaks pages correctly */
        @media print {
            @page { margin: 0.5in; }
            body { background-color: white !important; }
        }
    </style>
</head>
<body class="bg-gray-100 min-h-screen p-4 md:p-8 font-sans">
    <!-- Wrap the main app in a div that hides when printing -->
    <div id="app">
        
        <!-- MAIN DASHBOARD (Hidden during print) -->
        <div class="max-w-5xl mx-auto space-y-6 print:hidden">
            
            <header class="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center">
                </svg>
                {{ isPiP ? 'Return to Main Window' : 'Pop Out (PiP)' }}
            </button>
        </header>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <!-- LEFT COLUMN: The Scanner Environment -->
            <!-- We wrap this in a specific ID so we can move this exact DOM node into the PiP window -->
            <div id="pip-container" class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
                
                <div id="scanner-wrapper" class="flex flex-col h-full bg-white">
                    
                    <!-- Dynamic Status Banner -->
                    <div 
                        class="p-6 text-center transition-colors duration-300 flex-shrink-0"
                        :class="studentStatus === 'in' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
                        <h2 class="text-3xl font-black uppercase tracking-wider mb-1">
                            Student is {{ studentStatus }}
                        </h2>
                        <p class="font-medium opacity-80">Test Student (ID: student-test-123)</p>
                    </div>

                    <!-- Camera Area -->
                    <div class="p-4 flex-grow flex flex-col justify-center items-center relative">
                        
                        <!-- Cooldown Overlay -->
                        <div v-if="cooldownActive" class="absolute inset-0 z-10 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center">
                            <div class="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <h3 class="text-xl font-bold text-gray-800">Success!</h3>
                            <p class="text-gray-600 font-medium">Cooldown active to prevent double-scans...</p>
                        </div>

                        <!-- Scanner Viewfinder -->
                        <div class="w-full max-w-sm aspect-square bg-gray-900 rounded-xl overflow-hidden shadow-inner relative">
                            <div id="reader" class="w-full h-full"></div>
                            
                            <!-- Placeholder when camera is off -->
                            <div v-if="!isScanning" class="absolute inset-0 flex items-center justify-center text-gray-400 flex-col gap-3">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span>Camera Offline</span>
                            </div>
                        </div>

                        <div class="w-full max-w-sm mt-6 flex flex-col gap-3">
                            <!-- Camera Selection Dropdown -->
                            <div v-if="cameras.length > 0">
                                <label class="block text-sm font-medium text-gray-700 mb-1">Select Camera</label>
                                <select 
                                    v-model="selectedCamera" 
                                    @change="switchCamera" 
                                    class="w-full border border-gray-300 rounded-lg shadow-sm p-2.5 bg-white text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none">
                                    <option v-for="cam in cameras" :key="cam.id" :value="cam.id">
                                        {{ cam.label || 'Camera ' + cam.id }}
                                    </option>
                                </select>
                            </div>

                            <!-- Start/Stop Controls -->
                            <button 
                                v-if="!isScanning"
                                @click="startScanner" 
                                class="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold transition-transform active:scale-95 shadow-lg w-full">
                                Start Camera Scanner
                            </button>
                            
                            <button 
                                v-if="isScanning"
                                @click="stopScanner" 
                                class="bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-xl font-bold transition-transform active:scale-95 shadow-lg w-full">
                                Stop Camera
                            </button>
                        </div>
                    </div>
                </div>

            </div>

            <!-- RIGHT COLUMN: Test Materials (You wouldn't have this in the real app) -->
            <div class="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center text-center">
                <h3 class="text-xl font-bold text-gray-800 mb-2">Your Test Subject</h3>
                <p class="text-gray-600 mb-6 text-sm max-w-xs">
                    Scan this code with the webcam. In the real app, this would be printed on a lanyard or card.
                </p>
                
                <div class="bg-gray-50 p-4 rounded-xl border border-gray-100 shadow-inner mb-6">
                    <img :src="qrCodeUrl" alt="Test QR Code" class="w-48 h-48 mx-auto" v-if="qrCodeUrl" />
                </div>
                
                <!-- NEW: Print Class List Button -->
                <button 
                    @click="openPrintView"
                    class="w-full mb-6 bg-gray-800 hover:bg-gray-900 text-white px-6 py-3 rounded-xl font-bold transition-transform active:scale-95 shadow-md flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Generate Class QR Codes
                </button>

                <div class="bg-blue-50 text-blue-800 p-4 rounded-lg text-sm text-left w-full space-y-2">
                    <p class="font-bold flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" /></svg>
                        How to test:
                    </p>
                    <ul class="list-disc pl-5 space-y-1">
                        <li>Take a photo of the QR code with your phone.</li>
                        <li>Click "Start Camera Scanner".</li>
                        <li>Hold your phone screen up to your computer's webcam.</li>
                    </ul>
                </div>
            </div>

        </div>

        <!-- PRINT VIEW MODAL (Only visible when activated, fills screen) -->
        <div v-if="showPrintView" class="fixed inset-0 bg-white z-50 overflow-y-auto print:block">
            <div class="p-8 max-w-5xl mx-auto print:p-0 print:max-w-none">
                
                <!-- Print Header (Hidden on actual paper) -->
                <div class="flex justify-between items-center mb-8 pb-4 border-b border-gray-200 print:hidden">
                    <div>
                        <h2 class="text-3xl font-bold text-gray-800">Class QR Codes</h2>
                        <p class="text-gray-500">Print this page and cut out the cards for your students.</p>
                    </div>
                    <div class="space-x-4 flex">
                        <button @click="printPage" class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold shadow-md">
                            Print Cards
                        </button>
                        <button @click="showPrintView = false" class="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded-lg font-bold">
                            Close
                        </button>
                    </div>
                </div>

                <!-- Printable Grid -->
                <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 print:grid-cols-4 print:gap-4">
                    <div v-for="student in classList" :key="student.id" class="flex flex-col items-center text-center p-4 border-2 border-dashed border-gray-300 rounded-xl print:border-solid print:border-gray-400 print:break-inside-avoid">
                        <img :src="student.qrUrl" :alt="student.name" class="w-32 h-32 md:w-40 md:h-40 mb-3" />
                        <span class="font-bold text-lg text-gray-900">{{ student.name }}</span>
                        <span class="text-xs text-gray-500 font-mono mt-1">{{ student.id }}</span>
                    </div>
                </div>

            </div>
        </div>

    </div>

    <script>
        const { createApp, ref, onMounted, onUnmounted } = Vue;

        createApp({
            setup() {
                // Reactive State
                const studentStatus = ref('in'); // 'in' or 'out'
                const isScanning = ref(false);
                const cooldownActive = ref(false);
                const qrCodeUrl = ref('');
                
                // Camera Selection State
                const cameras = ref([]);
                const selectedCamera = ref(null);
                
                // PiP State
                const pipSupported = ref('documentPictureInPicture' in window);
                const isPiP = ref(false);
                let pipWindowObj = null;

                // Class List & Print State
                const showPrintView = ref(false);
                const classList = ref([
                    { id: 'uuid-1', name: 'Alice Abbott' },
                    { id: 'uuid-2', name: 'Bob Barnes' },
                    { id: 'uuid-3', name: 'Charlie Clark' },
                    { id: 'uuid-4', name: 'Diana Davis' },
                    { id: 'uuid-5', name: 'Evan Edwards' },
                    { id: 'uuid-6', name: 'Fiona Franklin' },
                    { id: 'uuid-7', name: 'George Garcia' },
                    { id: 'uuid-8', name: 'Hannah Hill' }
                ]);

                // Internal variables
                let html5QrCode = null;
                let lastScanTime = 0;
                const DEBOUNCE_MS = 5000; // 5 seconds cooldown
                let audioCtx = null;

                // 1. Generate the test QR code on load
                const generateQR = () => {
                    try {
                        // We embed the payload "student-test-123" into the image using QRious
                        const qr = new QRious({
                            value: 'student-test-123',
                            size: 300,
                            background: '#ffffff',
                            foreground: '#111827'
                        });
                        qrCodeUrl.value = qr.toDataURL();
                    } catch (err) {
                        console.error("QR Generation error", err);
                    }
                };

                // 2. Audio Feedback (The "Beep")
                const playBeep = () => {
                    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                    if (audioCtx.state === 'suspended') audioCtx.resume();
                    
                    const oscillator = audioCtx.createOscillator();
                    const gainNode = audioCtx.createGain();
                    
                    oscillator.type = 'sine';
                    // 880Hz is a nice high-pitched, noticeable beep
                    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); 
                    
                    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(audioCtx.destination);
                    
                    oscillator.start();
                    // Fade out quickly
                    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.15);
                    oscillator.stop(audioCtx.currentTime + 0.15);
                };

                // 3. Scan Handler & Logic
                const handleScan = (decodedText) => {
                    const now = Date.now();
                    
                    // Check if we are scanning the right payload and aren't in cooldown
                    if (decodedText === 'student-test-123') {
                        if (now - lastScanTime < DEBOUNCE_MS) {
                            return; // Ignore, still cooling down
                        }

                        // Valid scan accepted!
                        lastScanTime = now;
                        playBeep();
                        
                        // Toggle state
                        studentStatus.value = studentStatus.value === 'in' ? 'out' : 'in';
                        
                        // Trigger visual cooldown UI
                        cooldownActive.value = true;
                        setTimeout(() => {
                            cooldownActive.value = false;
                        }, DEBOUNCE_MS);
                    }
                };

                // 4. Start Webcam Scanner
                const startScanner = async () => {
                    // Initialize audio context on first user interaction to bypass browser restrictions
                    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                    if (audioCtx.state === 'suspended') audioCtx.resume();

                    if (!html5QrCode) {
                        html5QrCode = new Html5Qrcode("reader");
                    }

                    try {
                        // Request camera permissions and list devices if we haven't already
                        if (cameras.value.length === 0) {
                            const devices = await Html5Qrcode.getCameras();
                            if (devices && devices.length > 0) {
                                cameras.value = devices;
                                selectedCamera.value = devices[0].id; // Default to the first available
                            }
                        }

                        // Determine which camera to use
                        const cameraConfig = selectedCamera.value 
                            ? { deviceId: { exact: selectedCamera.value } } 
                            : { facingMode: "environment" }; // Fallback

                        await html5QrCode.start(
                            cameraConfig,
                            { 
                                fps: 15, // High frame rate for fast scanning
                                qrbox: { width: 250, height: 250 },
                                aspectRatio: 1.0
                            },
                            handleScan,
                            (errorMessage) => { 
                                // Ignore background parse errors
                            }
                        );
                        isScanning.value = true;
                    } catch (err) {
                        console.error("Failed to start scanner:", err);
                        alert("Could not start camera. Please ensure you have given browser permissions.");
                    }
                };

                // 5. Stop Webcam Scanner
                const stopScanner = async () => {
                    if (html5QrCode && isScanning.value) {
                        try {
                            await html5QrCode.stop();
                            isScanning.value = false;
                        } catch (err) {
                            console.error("Failed to stop scanner:", err);
                        }
                    }
                };

                // 6. Switch Camera
                const switchCamera = async () => {
                    if (isScanning.value) {
                        await stopScanner();
                        await startScanner();
                    }
                };

                // 7. Document Picture-in-Picture Logic
                const togglePiP = async () => {
                    if (!pipSupported.value) {
                        alert("Document Picture-in-Picture is not supported in this browser version. Use Chrome or Edge version 116+.");
                        return;
                    }

                    const scannerWrapper = document.getElementById('scanner-wrapper');
                    const mainContainer = document.getElementById('pip-container');

                    // If already in PiP, close it
                    if (pipWindowObj) {
                        pipWindowObj.close();
                        return;
                    }

                    try {
                        // Request a floating window
                        const pip = await documentPictureInPicture.requestWindow({
                            width: 380,
                            height: 520
                        });
                        
                        pipWindowObj = pip;
                        isPiP.value = true;

                        // Inject Tailwind CSS into the new window so styling doesn't break
                        const twScript = document.createElement('script');
                        twScript.src = "https://cdn.tailwindcss.com";
                        pip.document.head.appendChild(twScript);

                        // Move the entire Vue-managed scanner DOM node into the floating window
                        pip.document.body.appendChild(scannerWrapper);
                        
                        // Listen for when the PiP window is closed by the user
                        pip.addEventListener("pagehide", () => {
                            // Move the DOM node back to the main page
                            mainContainer.appendChild(scannerWrapper);
                            pipWindowObj = null;
                            isPiP.value = false;
                        });

                    } catch (error) {
                        console.error(error);
                        alert("Failed to open PiP window. This environment might restrict it. Try running the app in a standalone Edge window.");
                    }
                };

                // 8. Print Logic
                const openPrintView = () => {
                    // Generate a QR code for each student dynamically
                    classList.value.forEach(student => {
                        if (!student.qrUrl) {
                            const qr = new QRious({
                                value: student.id,
                                size: 300,
                                background: '#ffffff',
                                foreground: '#111827'
                            });
                            student.qrUrl = qr.toDataURL();
                        }
                    });
                    // Show the full-screen modal
                    showPrintView.value = true;
                };

                const printPage = () => {
                    window.print();
                };

                // Cleanup on component destruction
                onUnmounted(() => {
                    if (html5QrCode && isScanning.value) {
                        html5QrCode.stop();
                    }
                    if (pipWindowObj) {
                        pipWindowObj.close();
                    }
                });

                // Init
                onMounted(() => {
                    generateQR();
                });

                return {
                    studentStatus,
                    isScanning,
                    cooldownActive,
                    qrCodeUrl,
                    pipSupported,
                    isPiP,
                    cameras,
                    selectedCamera,
                    showPrintView,
                    classList,
                    startScanner,
                    stopScanner,
                    switchCamera,
                    togglePiP,
                    openPrintView,
                    printPage
                };
            }
        }).mount('#app');
    </script>
</body>
</html>