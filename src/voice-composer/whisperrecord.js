import { holder } from "../imageapi/replicatekey";
import { requireKey } from "../imageapi/stablediffusion";
import Replicate from "../vendor/replicate";

const fullProxyUrl = "http://localhost:8010/proxy/v1";

export class AudioRecorder {
  constructor(options) {
    options = options || {};
    this.buffer = options.buffer || 1000;
    this.recorder = null;
    this.chunks = [];
    this.error = null;
    this._onUpdate = [];
    this._starting = false;
    this._stopping = false;
  }

  addOnUpdate(listener) {
    this._onUpdate.push(listener);
  }

  removeOnUpdate(listener) {
    this._onUpdate = this._onUpdate.filter((l) => l !== listener);
  }

  updated() {
    this._onUpdate.forEach((listener) => listener());
  }

  async start() {
    if (this.recorder) {
      console.warn("Starting with a recorder already running");
      this.recorder.stop();
      this.updated();
    }
    this.chunks = [];
    this.error = null;
    this._starting = true;
    this.updated();
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.recorder = new MediaRecorder(this.stream);
    this.recorder.addEventListener("dataavailable", (event) => {
      this.chunks.push(event.data);
    });
    for (const eventName of ["start", "stop", "error"]) {
      this.recorder.addEventListener(eventName, (event) => {
        if (eventName === "error") {
          this.error = event.error;
        }
        if (eventName === "stop") {
          this.stream.getTracks().forEach((track) => track.stop());
          this.stream = null;
        }
        this._starting = false;
        this._stopping = false;
        this.updated();
      });
    }
    this.recorder.start(this.buffer);
    window.recorder = this.recorder;
  }

  get isStarting() {
    return !this.isRecording && this._starting;
  }

  get isRecording() {
    return (
      !this._stopping && this.recorder && this.recorder.state === "recording"
    );
  }

  stop() {
    this._stopping = true;
    this.updated();
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        this._starting = false;
        this.recorder.stop();
        this.audioBlob = new Blob(this.chunks, {
          type: "audio/ogg; codecs=opus",
        });
        this.updated();
        resolve();
      }, this.buffer);
    });
    // const audioUrl = URL.createObjectURL(audioBlob);
    // const audio = new Audio(audioUrl);
    // audio.play();
  }
}

async function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => {
      const dataUrl = reader.result;
      resolve(dataUrl);
    };
    reader.onerror = (error) => {
      reject(error);
    };
  });
}

let replicateClient;

export const defaultOptions = {
  model: "large",
  transcription: "vtt",
  // Note this causes the repeated text weirdness (but increases quality):
  condition_on_previous_text: true,
  buffer: 1000, // milliseconds
};

export class Whisper {
  constructor(options) {
    this.options = Object.assign({}, defaultOptions, options);
    requireKey();
    if (!replicateClient) {
      replicateClient = new Replicate({ token: holder.getKey(), fullProxyUrl });
    }
    this._onUpdate = [];
    this._init = false;
    this.isTranscribing = false;
    this.init();
  }

  addOnUpdate(listener) {
    this._onUpdate.push(listener);
  }

  removeOnUpdate(listener) {
    this._onUpdate = this._onUpdate.filter((l) => l !== listener);
  }

  updated() {
    this._onUpdate.forEach((listener) => listener());
  }

  async init() {
    if (this._init) {
      return;
    }
    this.replicateWhisper = await replicateClient.models.get(
      "openai/whisper",
      "30414ee7c4fffc37e260fcab7842b5be470b9b840f2b608f5baa9bbef9a259ed"
    );
    this._init = true;
  }

  async transcribe(audio) {
    this.isTranscribing = true;
    if (audio instanceof Blob) {
      audio = await blobToDataURL(audio);
    }
    if (!audio || typeof audio !== "string") {
      throw new Error("Invalid audio, not a data URL");
    }
    this.updated();
    await this.init();
    let prediction;
    this.response = null;
    const input = Object.assign({ audio }, this.options);
    console.info("Sending to Whisper:", input);
    for await (prediction of this.replicateWhisper.predictor(input)) {
      this.response = prediction;
      this.updated();
    }
    // FIXME: should catch errors here and stuff
    this.isTranscribing = false;
    return this.response;
  }
}

export function getResponseText(response) {
  const parts = response.output.segments.map((x) => x.text);
  let text = parts.join(" ").trim();
  text = text.replace(/\s\s+/g, " ");
  return text;
}

/* Example response:

{
    "completed_at": "2023-01-26T21:36:58.601684Z",
    "created_at": "2023-01-26T21:36:56.823803Z",
    "error": null,
    "id": "7cw3ve7wunae5iqhlle3lw36ny",
    "input": {
        "audio": "data:audio/ogg; codecs=opus;base64,...",
        "model": "large",
        "transcription": "vtt",
        "condition_on_previous_text": true
    },
    "logs": "Transcribe with large model",
    "metrics": {
        "predict_time": 1.722608
    },
    "output": {
        "segments": [
            {
                "id": 0,
                "end": 6.16,
                "seek": 0,
                "text": " This is a test of some stuff, yes indeed.",
                "start": 0,
                "tokens": [...]
                "avg_logprob": -0.4554723671504429,
                "temperature": 0,
                "no_speech_prob": 0.14580026268959045,
                "compression_ratio": 0.8913043478260869
            }
        ],
        "translation": null,
        "transcription": "00:00.000 --> 00:06.160\nThis is a test of some stuff, yes indeed.\n",
        "detected_language": "english"
    },
    "started_at": "2023-01-26T21:36:56.879076Z",
    "status": "succeeded",
    "urls": {
        "get": "https://api.replicate.com/v1/predictions/7cw3ve7wunae5iqhlle3lw36ny",
        "cancel": "https://api.replicate.com/v1/predictions/7cw3ve7wunae5iqhlle3lw36ny/cancel"
    },
    "version": "30414ee7c4fffc37e260fcab7842b5be470b9b840f2b608f5baa9bbef9a259ed",
    "webhook_completed": null
}

*/
