import KeyHolder from "./keyholder"

export const holder = new KeyHolder("gpt3", [], (v) => v.startsWith("sk-"));
