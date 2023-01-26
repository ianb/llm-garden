import { holder } from "./thumbsnapkey";

export function requireKey() {
  if (!holder.hasKey()) {
    if (window.confirm("No Thumb Snap API key is set. Set one now?")) {
      window.location = "/key-management";
    }
    throw new Error("No Thumb Snap API key is set");
  }
}

export async function upload(b64file) {
  requireKey();
  const key = holder.getKey();
  const url = "https://thumbsnap.com/api/upload";
  const formData = new FormData();
  formData.append("key", key);
  const blob = b64toBlob(b64file, "image/png");
  formData.append("media", blob);
  const resp = await fetch(url, {
    method: "POST",
    mode: "cors",
    body: formData,
  });
  if (!resp.ok) {
    const error = await resp.text();
    console.error("Bad thumbsnap response:", resp, error);
    throw new Error(
      `thumbsnap request failed: ${resp.status} ${resp.statusText}: ${error}`
    );
  }
  const body = await resp.json();
  return body;
}

export function b64toBlob(
  b64Data,
  contentType = "application/octet-stream",
  sliceSize = 512
) {
  const byteCharacters = atob(b64Data);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
    const slice = byteCharacters.slice(offset, offset + sliceSize);

    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  const blob = new Blob(byteArrays, { type: contentType });
  return blob;
}
