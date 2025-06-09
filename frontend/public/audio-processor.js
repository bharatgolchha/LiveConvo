/**
 * AudioWorklet processor for real-time audio streaming to Deepgram
 * Converts audio to 16kHz mono PCM16 format
 */

class AudioProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.sampleRate = options.processorOptions?.sampleRate || 16000;
    this.sourceRate = sampleRate; // AudioContext sample rate
    this.downsampleFactor = this.sourceRate / this.sampleRate;
    this.buffer = [];
    this.bufferSize = 2048;
  }

  /**
   * Convert Float32Array to Int16Array
   */
  floatTo16BitPCM(float32Array) {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const sample = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    }
    return int16Array;
  }

  /**
   * Downsample audio if needed
   */
  downsample(buffer, downsampleFactor) {
    if (downsampleFactor === 1) return buffer;
    
    const newLength = Math.floor(buffer.length / downsampleFactor);
    const result = new Float32Array(newLength);
    
    for (let i = 0; i < newLength; i++) {
      result[i] = buffer[Math.floor(i * downsampleFactor)];
    }
    
    return result;
  }

  /**
   * Process audio frames
   */
  process(inputs, outputs, parameters) {
    const input = inputs[0];
    
    if (!input || !input[0]) return true;
    
    // Get mono channel
    const audioData = input[0];
    
    // Downsample if needed
    const downsampledData = this.downsample(audioData, this.downsampleFactor);
    
    // Add to buffer
    this.buffer.push(...downsampledData);
    
    // Process when buffer is full
    while (this.buffer.length >= this.bufferSize) {
      const chunk = this.buffer.splice(0, this.bufferSize);
      const float32Array = new Float32Array(chunk);
      const int16Array = this.floatTo16BitPCM(float32Array);
      
      // Convert to Uint8Array for transmission
      const buffer = new ArrayBuffer(int16Array.length * 2);
      const view = new DataView(buffer);
      
      for (let i = 0; i < int16Array.length; i++) {
        view.setInt16(i * 2, int16Array[i], true); // little-endian
      }
      
      // Send to main thread
      this.port.postMessage({
        type: 'audio',
        buffer: new Uint8Array(buffer)
      });
    }
    
    return true; // Keep processor alive
  }
}

// Register the processor
registerProcessor('audio-processor', AudioProcessor);