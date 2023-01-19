import KeyHolder from "../key-management/keyholder";

export const holder = new KeyHolder("replicate", [], (v) => v.length === 40);
