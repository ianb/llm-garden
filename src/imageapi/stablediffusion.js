import { holder } from "./replicatekey";
import Replicate from "../vendor/replicate";

const fullProxyUrl = "http://localhost:8010/proxy/v1";

export const dimensionValues = [
  128, 256, 384, 448, 512, 576, 640, 704, 768, 832, 896, 960, 1024,
];

export const stableDiffusionCostPerSecond = 0.0023;

export const defaultParameters = {
  negative_prompt: "",
  width: 768,
  height: 768,
  prompt_strength: 0.8,
  num_outputs: 1,
  num_inference_steps: 50,
  guidance_scale: 7.5,
  scheduler: "DPMSolverMultistep", // one of DDIM, K_EULER, DPMSolverMultistep, K_EULER_ANCESTRAL, PNDM, KLMS
  // Note: DPMSolverMultistep seems to constantly trigger NSFW warnings, K_EULER is better
  seed: "",
};

/* Schema of the intermediate responses:

completed_at: timestamp
created_at: "2023-01-18T22:52:52.504948Z"
error: null
id: "h6oywcol2retbcquac6zrmtvli"
input: {}
logs: big string
: "Using seed: 58084\n  0%|          | 0/50 [00:00<?, ?it/s]\n  2%|▏         | 1/50 [00:00<00:12,  3.85it/s]\n  4%|▍         | 2/50 [00:00<00:12,  3.84it/s]\n  6%|▌         | 3/50 [00:00<00:12,  3.84it/s]\n  8%|▊         | 4/50 [00:01<00:11,  3.84it/s]\n 10%|█         | 5/50 [00:01<00:11,  3.84it/s]\n 12%|█▏        | 6/50 [00:01<00:11,  3.83it/s]\n 14%|█▍        | 7/50 [00:01<00:11,  3.84it/s]\n 16%|█▌        | 8/50 [00:02<00:10,  3.84it/s]\n 18%|█▊        | 9/50 [00:02<00:10,  3.84it/s]\n 20%|██        | 10/50 [00:02<00:10,  3.84it/s]\n 22%|██▏       | 11/50 [00:02<00:10,  3.84it/s]\n 24%|██▍       | 12/50 [00:03<00:09,  3.84it/s]\n 26%|██▌       | 13/50 [00:03<00:09,  3.84it/s]\n 28%|██▊       | 14/50 [00:03<00:09,  3.84it/s]\n 30%|███       | 15/50 [00:03<00:09,  3.84it/s]\n 32%|███▏      | 16/50 [00:04<00:08,  3.84it/s]"
metrics: {predict_time: 14.335476}
output: null
started_at: "2023-01-18T22:53:03.391697Z"
status: "processing"
urls: {get: 'https://api.replicate.com/v1/predictions/h6oywcol2retbcquac6zrmtvli', cancel: 'https://api.replicate.com/v1/predictions/h6oywcol2retbcquac6zrmtvli/cancel'}
version: "f178fa7a1ae43a9a9af01b833b9d2ecf97b1bcb0acfd2dc5dd04895e042863f1"
webhook_completed: null

*/

export function requireKey() {
  if (!holder.hasKey()) {
    if (window.confirm("No Replicate API key is set. Set one now?")) {
      window.location = "/key-management";
    }
    throw new Error("No Replicate API key is set");
  }
}

let replicateClient;

export class ImageRequest {
  constructor(input) {
    if (!input.prompt) {
      throw new Error("No prompt");
    }
    requireKey();
    if (!replicateClient) {
      replicateClient = new Replicate({ token: holder.getKey(), fullProxyUrl });
    }
    this.input = input;
    this.response = null;
    this._init = false;
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
    if (this._init) {
      return;
    }
    this.stableDiffusion = await replicateClient.models.get(
      "stability-ai/stable-diffusion",
      "f178fa7a1ae43a9a9af01b833b9d2ecf97b1bcb0acfd2dc5dd04895e042863f1"
    );
    this._init = true;
  }

  async request() {
    await this.init();
    let prediction;
    this.response = null;
    const fixedInput = Object.assign({ scheduler: "K_EULER" }, this.input);
    console.log("sending", fixedInput);
    for await (prediction of this.stableDiffusion.predictor(fixedInput)) {
      this.response = prediction;
      this.updated();
    }
    return this.response;
  }

  toJSON() {
    return { input: this.input, response: this.response };
  }
}
