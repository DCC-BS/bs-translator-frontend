export function useAudioVisualization() {
    const audioVisualization = ref<number[]>([]);

    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let frequencyData: Uint8Array<ArrayBuffer> | null = null;
    let visualizationInterval: ReturnType<typeof setInterval> | null = null;

    onUnmounted(() => {
        cleanup();
    });

    function initialize(stream: MediaStream) {
        audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        frequencyData = new Uint8Array(analyser.frequencyBinCount);
        source.connect(analyser);

        visualizationInterval = setInterval(update, 50);
    }

    function cleanup() {
        if (visualizationInterval) {
            clearInterval(visualizationInterval);
            visualizationInterval = null;
        }
        if (audioContext) {
            audioContext.close();
            audioContext = null;
        }
        analyser = null;
        frequencyData = null;
        audioVisualization.value = [];
    }

    function update() {
        if (!analyser || !frequencyData) return;

        analyser.getByteFrequencyData(frequencyData);
        const barCount = 15;
        const freqData = Array.from(frequencyData);
        const freqPerBar = Math.floor(freqData.length / barCount);
        const averagedData: number[] = [];

        for (let i = 0; i < barCount; i++) {
            const start = i * freqPerBar;
            const end = start + freqPerBar;
            const slice = freqData.slice(start, end);
            const avg =
                slice.reduce((sum, val) => sum + val, 0) / slice.length || 0;
            averagedData.push((avg / 255) * 100);
        }

        audioVisualization.value = [
            ...averagedData.toReversed(),
            ...averagedData,
        ];
    }

    return {
        audioVisualization,
        initializeVisualization: initialize,
        cleanupVisualization: cleanup,
    };
}
