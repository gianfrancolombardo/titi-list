class SpeechCollectorProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const chunkSize = options.processorOptions?.chunkSize;
    if (!chunkSize || chunkSize <= 0) {
      throw new Error('Invalid chunk size for SpeechCollectorProcessor');
    }
    this.chunkSize = chunkSize;
    this.buffer = new Float32Array(chunkSize);
    this.offset = 0;
    this.sampleRate = sampleRate;
    this.port.postMessage({ type: 'log', message: `SpeechCollectorProcessor initialized with chunkSize=${chunkSize}` });
    this.port.onmessage = event => {
      if (event.data?.type === 'flush') {
        this.flushBuffer();
      }
    };
  }

  process(inputs, outputs) {
    const input = inputs[0];
    if (!input || input.length === 0) {
      if (outputs[0] && outputs[0][0]) {
        outputs[0][0].fill(0);
      }
      return true;
    }

    const channelData = input[0];
    if (!channelData) {
      if (outputs[0] && outputs[0][0]) {
        outputs[0][0].fill(0);
      }
      return true;
    }

    let remaining = channelData.length;
    let readOffset = 0;

    while (remaining > 0) {
      const space = this.chunkSize - this.offset;
      const toCopy = Math.min(space, remaining);

      this.buffer.set(channelData.subarray(readOffset, readOffset + toCopy), this.offset);
      this.offset += toCopy;
      readOffset += toCopy;
      remaining -= toCopy;

      if (this.offset >= this.chunkSize) {
        this.port.postMessage({
          type: 'audio-chunk',
          payload: this.buffer.buffer.slice(0),
        });
        this.offset = 0;
      }
    }

    if (outputs[0] && outputs[0][0]) {
      outputs[0][0].fill(0);
    }

    return true;
  }

  flushBuffer() {
    if (this.offset > 0) {
      this.port.postMessage({
        type: 'audio-chunk',
        payload: this.buffer.slice(0, this.offset).buffer,
      });
      this.offset = 0;
    }
  }
}

registerProcessor('speech-collector-processor', SpeechCollectorProcessor);

