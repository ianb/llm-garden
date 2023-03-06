/* eslint-disable no-unused-vars */
import { ModelLoader } from "../components/modelindex";
import { p5Db } from "./p5db";
import { useState, useEffect, useRef } from "preact/hooks";
import p5 from "p5";

window.p5 = p5;

export function P5DrawingIframeView() {
  const store = p5Db;
  const u = new URL(location.href).searchParams;
  if (u.get("name") || u.get("id")) {
    let model;
    if (u.get("id")) {
      model = store.getById(u.get("id"));
    } else {
      model = store.getBySlug(u.get("name"));
    }
    return (
      <ModelLoader model={model} viewer={P5Iframe}>
        <div class="font-bold flex justify-center p-10">Loading...</div>
      </ModelLoader>
    );
  }
  return "Invalid: no ?id or ?name";
}

function P5Iframe({ model }) {
  const containerRef = useRef(null);
  const coordRef = useRef(null);
  useEffect(() => {
    if (!containerRef.current) {
      console.log("no container yet");
      return;
    }
    const script = document.createElement("script");
    window.p5element = containerRef.current;
    const scriptText =
      model.domain.script + "\n\nwindow.p5object = new p5(null, p5element);";
    launchCanvasWatcher(containerRef.current, coordRef.current);
    script.textContent = scriptText;
    console.log("Adding script", scriptText);
    document.body.appendChild(script);
    sendScreenshot(containerRef.current);
    return () => {
      if (window.p5object) {
        window.p5object.remove();
      }
      document.body.removeChild(script);
    };
  }, [containerRef, model]);
  return (
    <div>
      <div class="w-full" style="height: 100vh" ref={containerRef}></div>
      <div class="text-s text-gray-400" ref={coordRef} />
    </div>
  );
}

function launchCanvasWatcher(container, coord) {
  const timer = setInterval(() => {
    const canvas = container.querySelector("canvas");
    if (!canvas) {
      return;
    }
    clearInterval(timer);
    console.log("Found canvas", canvas);
    const width = container.clientWidth;
    const height = container.clientHeight;
    const wMult = width / canvas.width;
    const hMult = height / canvas.height;
    const mult = Math.min(wMult, hMult);
    canvas.style.width = `${canvas.width * mult}px`;
    canvas.style.height = `${canvas.height * mult}px`;
    coord.textContent = `Canvas size: ${canvas.width}x${canvas.height}`;
  }, 100);
}

let hasError = false;
let lastError = null;

window.onerror = (message, source, lineno, colno, error) => {
  console.log("Error", message, source, lineno, colno, error);
  hasError = true;
  lastError = {
    type: "error",
    message,
    source,
    lineno,
    colno,
    stack: error.stack,
    errorString: error.toString(),
  };
  if (parent) {
    parent.postMessage(lastError, location.origin);
    lastError = null;
  } else {
    console.warn("No parent to send error to");
  }
};

let parent;

window.addEventListener("message", function (event) {
  if (!parent) {
    parent = event.source;
    parent.postMessage("hello-back", location.origin);
    if (lastError) {
      parent.postMessage(lastError, location.origin);
      lastError = null;
    }
  }
});

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function captureScreenshot(container) {
  await wait(3000);
  const canvas = container.querySelector("canvas");
  if (hasError || !canvas) {
    return null;
  }
  const imageData = canvas.toDataURL("image/png");
  return imageData;
}

async function sendScreenshot(container) {
  const url = await captureScreenshot(container);
  if (!url) {
    console.warn("No screenshot image to send");
    return;
  }
  if (!parent) {
    console.warn("No parent to send screenshot to");
    return;
  }
  parent.postMessage(
    {
      type: "screenshot",
      url,
    },
    location.origin
  );
  console.log("sent screenshot");
}
