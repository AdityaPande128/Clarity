document.addEventListener('DOMContentLoaded', () => {

    const startButton = document.getElementById('startButton');
    const callContainer = document.getElementById('call-container');
    const transcriptLog = document.getElementById('transcript-log');
    const alertsLog = document.getElementById('alerts-log');

    let isCallActive = false;

    startButton.addEventListener('click', toggleCall);

    function toggleCall() {
        isCallActive = !isCallActive;

        if (isCallActive) {
            startButton.textContent = 'Stop Call Analysis';
            callContainer.style.display = 'grid';

            transcriptLog.innerHTML = '<p class="log-entry system">Connecting to analysis service...</p>';
            alertsLog.innerHTML = '<p class="log-entry system">Alerts will appear here.</p>';

            startCall();

        } else {
            startButton.textContent = 'Start Call Analysis';
            callContainer.style.display = 'none';

            stopCall();
        }
    }

    function startCall() {
        console.log("Call Started! (Step 2 will add audio logic here)");
    }

    function stopCall() {
        console.log("Call Stopped! (Step 2 will add cleanup logic here)");
    }

    const DEEPGRAM_API_KEY = '756be4e40c6d692d4ffe8a8df614d945c94d5458';

});