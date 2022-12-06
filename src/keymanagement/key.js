import KeyHolder from "./keyholder";

const standardKey =
  "FFB0le+/wQs711zpoAgN/mKBvc01vOD4r8OiZaNHzvWSSroS0n/p8onJmWSRD+SKb8cw6SahQ6XdpwiRcKCOFROAlNfLIv1AJFO2XIN5TQ==";

export const holder = new KeyHolder("gpt3", [standardKey], (v) =>
  v.startsWith("sk-")
);
