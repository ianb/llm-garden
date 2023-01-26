import KeyHolder from "../key-management/keyholder";

export const holder = new KeyHolder("thumbsnap", [], (v) => v.length === 32);
