import { ModelTypeStore } from "../db";
import {
  ImageRequest,
  dimensionValues,
  stableDiffusionCostPerSecond,
} from "../imageapi/stablediffusion";
import { availableSizes, getDallECompletion } from "../imageapi/dalle";

class ImageGen {
  constructor(props) {
    props = props || {};
    this._logs = null;
    this._onUpdate = [];
    this._imageGenType = props.imageGenType || "dalle";
    this._history = (props.history || []).map((h) => new HistoryItem(h));
    this._width = props.width || 768;
    this._height = props.height || 768;
    this._size = props.size || "1024x1024";
    this._prompt_strength = props.prompt_strength || 0.8;
    this._num_outputs = props.num_outputs || 1;
    this._num_inference_steps = props.num_inference_steps || 50;
    this._guidance_scale = props.guidance_scale || 7.5;
    // FIXME: add scheduler (but it's an enum)
  }

  toJSON() {
    return {
      imageGenType: this.imageGenType,
      history: this.history,
      width: this.width,
      height: this.height,
      size: this.size,
      prompt_strength: this.prompt_strength,
      num_outputs: this.num_outputs,
      num_inference_steps: this.num_inference_steps,
      guidance_scale: this.guidance_scale,
    };
  }

  addOnUpdate(listener) {
    this._onUpdate.push(listener);
  }

  removeOnUpdate(listener) {
    this._onUpdate = this._onUpdate.filter((l) => l !== listener);
  }

  updated() {
    this._onUpdate.forEach((listener) => listener());
    this.envelope.updated();
  }

  get logs() {
    return this._logs;
  }

  set logs(value) {
    this._logs = value;
    this._onUpdate.forEach((listener) => listener());
  }

  get history() {
    return this._history;
  }

  set history(value) {
    this._history = value;
    this.updated();
  }

  deleteHistoryItem(item) {
    this._history = this._history.filter((i) => i !== item);
    this.updated();
  }

  get imageGenType() {
    return this._imageGenType;
  }

  set imageGenType(value) {
    this._imageGenType = value;
    this.updated();
  }

  get width() {
    return this._width;
  }

  set width(value) {
    this._width = parseInt(value, 10);
    this.updated();
  }

  get height() {
    return this._height;
  }

  set height(value) {
    this._height = parseInt(value, 10);
    this.updated();
  }

  get size() {
    return this._size;
  }

  set size(value) {
    this._size = value;
    this.updated();
  }

  get sizeOptions() {
    if (this.imageGenType === "sd") {
      return dimensionValues;
    } else {
      return availableSizes;
    }
  }

  get prompt_strength() {
    return this._prompt_strength;
  }

  set prompt_strength(value) {
    this._prompt_strength = parseFloat(value);
    if (isNaN(this._prompt_strength) || !this._prompt_strength) {
      this._prompt_strength = null;
    }
    this.updated();
  }

  get num_outputs() {
    return this._num_outputs;
  }

  set num_outputs(value) {
    this._num_outputs = parseInt(value, 10);
    this.updated();
  }

  get num_inference_steps() {
    return this._num_inference_steps;
  }

  set num_inference_steps(value) {
    this._num_inference_steps = parseInt(value, 10);
    this.updated();
  }

  get guidance_scale() {
    return this._guidance_scale;
  }

  set guidance_scale(value) {
    this._guidance_scale = parseFloat(value);
    if (isNaN(this._guidance_scale) || !this._guidance_scale) {
      this._guidance_scale = null;
    }
    this.updated();
  }

  get stableDiffusionParameters() {
    return {
      width: this.width,
      height: this.height,
      prompt_strength: this.prompt_strength,
      num_outputs: this.num_outputs,
      num_inference_steps: this.num_inference_steps,
      guidance_scale: this.guidance_scale,
    };
  }

  get dallEParameters() {
    return {
      size: this.size,
      n: this.num_outputs,
    };
  }

  async generateImage(props) {
    if (this.imageGenType === "sd") {
      await this.generateStableDiffusionImage(props);
    } else {
      await this.generateDallEImage(props);
    }
  }

  async generateDallEImage(props) {
    props = Object.assign(this.dallEParameters, props);
    // Dummy to show a request is in progress:
    this.request = { input: props };
    this.updated();
    const start = Date.now();
    const response = await getDallECompletion(props);
    this.request = null;
    response.time = (Date.now() - start) / 1000;
    this.history.unshift(
      new HistoryItem({ type: "dalle", input: props, response: response })
    );
    this.updated();
  }

  async generateStableDiffusionImage(props) {
    props = Object.assign(this.stableDiffusionParameters, props);
    if (this.request) {
      console.warn("Adding new request with old request still pending");
      // FIXME: should check if it's complete and then cancel it if not
      this.logs = "";
      this.request = null;
    }
    this.request = new ImageRequest(props);
    this.request.addOnUpdate(() => {
      this.logs = this.request.response.logs;
    });
    this.updated();
    const finalResponse = await this.request.request();
    this.history.unshift(
      new HistoryItem({ type: "sd", input: props, response: finalResponse })
    );
    this.request = null;
    this.updated();
  }
}

class HistoryItem {
  constructor({ type, input, response }) {
    this.type = type || "sd";
    this.input = input;
    this.response = response;
  }

  get urls() {
    if (this.type === "sd") {
      return this.response.output;
    } else if (this.type === "dalle") {
      return this.response.data.map((d) => d.url);
    }
    throw new Error("Unknown type");
  }

  get time() {
    if (this.type === "sd") {
      return this.response.metrics.predict_time;
    } else if (this.type === "dalle") {
      return this.response.time;
    }
    throw new Error("Unknown type");
  }

  get cost() {
    if (this.type === "sd") {
      return this.response.metrics.predict_time * stableDiffusionCostPerSecond;
    } else if (this.type === "dalle") {
      return this.response.cost;
    }
    throw new Error("Unknown type");
  }

  toJSON() {
    return { type: this.type, input: this.input, response: this.response };
  }
}

const builtins = [
  {
    title: "Standard",
    description: "A standard frontend to the generator",
    domain: {},
  },
];

export const imageGenDb = new ModelTypeStore("imagegen", ImageGen, builtins);
