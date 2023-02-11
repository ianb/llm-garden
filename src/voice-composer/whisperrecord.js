import { holder } from "../imageapi/replicatekey";
import { requireKey } from "../imageapi/stablediffusion";
import Replicate from "../vendor/replicate";
import { loadScript } from "../loadlegacyscript";

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
    this._header = null;
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
    this._startRecorder();
  }

  _startRecorder() {
    if (this.recorder) {
      this.recorder.stop();
      this.recorder = null;
    }
    const recorder = (this.recorder = new MediaRecorder(this.stream));
    this.recorder.addEventListener("dataavailable", (event) => {
      console.log("got data", this.recorder === recorder);
      this.chunks.push(event.data);
    });
    for (const eventName of ["start", "stop", "error"]) {
      this.recorder.addEventListener(eventName, (event) => {
        if (eventName === "error") {
          this.error = event.error;
        }
        this._starting = false;
        this._stopping = false;
        this.updated();
      });
    }
    this.recorder.start(this.buffer);
  }

  get isStarting() {
    return !this.isRecording && this._starting;
  }

  get isRecording() {
    return (
      !this._stopping && this.recorder && this.recorder.state === "recording"
    );
  }

  checkpointAudio() {
    if (!this.isRecording) {
      throw new Error("Not recording");
    }
    console.log("starting checkpointing");
    return new Promise((resolve, reject) => {
      const getData = (event) => {
        const data = event.data;
        if (
          !this.chunks.length ||
          this.chunks[this.chunks.length - 1] !== data
        ) {
          this.chunks.push(data);
        }
        const audioBlob = new Blob(this.chunks, {
          type: "audio/ogg;codecs=opus",
        });
        this.chunks = [];
        this.recorder.removeEventListener("dataavailable", getData);
        resolve(audioBlob);
      };
      this.recorder.addEventListener("dataavailable", getData);
      this.recorder.requestData();
      this.recorder.stop();
      this.recorder = null;
      this._startRecorder();
    });
  }

  stop() {
    return new Promise((resolve, reject) => {
      const getData = (event) => {
        const data = event.data;
        if (
          !this.chunks.length ||
          this.chunks[this.chunks.length - 1] !== data
        ) {
          this.chunks.push(data);
        }
        const audioBlob = new Blob(this.chunks, {
          type: "audio/ogg;codecs=opus",
        });
        this.chinks = [];
        this.recorder.removeEventListener("dataavailable", getData);
        resolve(audioBlob);
      };
      this.recorder.addEventListener("dataavailable", getData);
      this._stopping = true;
      this.recorder.requestData();
      this.recorder.stop();
    });
  }

  // stop() {
  //   this._stopping = true;
  //   this.updated();
  //   return new Promise((resolve, reject) => {
  //     setTimeout(() => {
  //       this._starting = false;
  //       this.recorder.stop();
  //       this.audioBlob = new Blob(this.chunks, {
  //         type: "audio/ogg; codecs=opus",
  //       });
  //       this.updated();
  //       resolve();
  //     }, this.buffer);
  //   });
  //   // const audioUrl = URL.createObjectURL(audioBlob);
  //   // const audio = new Audio(audioUrl);
  //   // audio.play();
  // }
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

  async transcribe(audio, initial_prompt) {
    this.isTranscribing = true;
    if (audio instanceof Blob) {
      audio = await blobToDataURL(audio);
    }
    console.log("transcribing audio", audio.slice(0, 40), audio.length);
    window.lastAudio = audio;
    const a = document.createElement("audio");
    a.src = audio;
    a.controls = true;
    document.body.appendChild(a);
    if (!audio || typeof audio !== "string") {
      throw new Error("Invalid audio, not a data URL");
    }
    this.updated();
    await this.init();
    let prediction;
    this.response = null;
    const input = Object.assign({ audio, initial_prompt }, this.options);
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

export async function loadVadScript() {
  const scripts = [
    "https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.js",
    "https://cdn.jsdelivr.net/npm/@ricky0123/vad/dist/index.browser.js",
  ];
  for (const script of scripts) {
    await loadScript(script);
  }
}

export async function instantiateVad(options) {
  await loadVadScript();
  // eslint-disable-next-line no-undef
  const myvad = await vad.MicVAD.new(options);
  return myvad;
}

export class Speech {
  constructor() {
    this.whisper = new Whisper();
    this.recorder = new AudioRecorder({ buffer: 500 });
    this._inited = false;
    this.transcripts = [];
    this.pendingWhisper = null;
    this._onUpdate = [];
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
    if (this._inited) {
      return;
    }
    this.vad = await instantiateVad({
      onSpeechStart: this.onSpeechStart.bind(this),
      onSpeechEnd: this.onSpeechEnd.bind(this),
    });
    this._inited = true;
  }

  async start() {
    await this.init();
    this.vad.start();
    return this.recorder.start();
  }

  async stop() {
    return this.recorder.stop();
  }

  async onSpeechStart() {
    // Nothing to do really
    console.log("got on speech start");
  }

  async onSpeechEnd() {
    if (this.pendingWhisper) {
      console.log("got on speech end but there's also something pending");
      return;
    }
    console.log("got on speech end");
    const audio = await this.recorder.checkpointAudio();
    console.log("got audio", audio);
    if (!audio) {
      console.log("no audio to transcribe");
      return;
    }
    if (this.pendingWhisper) {
      await this.pendingWhisper;
    }
    // Seems possible that there could be a race if this backs up with more than one waiter
    const text = this.transcripts.join(" ");
    this.pendingWhisper = this.whisper.transcribe(audio, text);
    this.updated();
    const response = await this.pendingWhisper;
    this.pendingWhisper = null;
    this.transcripts.push(getResponseText(response));
    this.updated();
  }

  get isListening() {
    return this.recorder.isRecording;
  }
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
