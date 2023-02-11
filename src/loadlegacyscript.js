export async function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.onload = () => {
      resolve();
    };
    script.onerror = (error) => {
      reject(error);
    };
    script.src = src;
    document.head.appendChild(script);
  });
}
