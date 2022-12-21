/* eslint-disable no-unused-vars */
/* globals webkitSpeechRecognition */
import { useState, useEffect } from "preact/hooks";
import * as icons from "./icons";
import { signal } from "@preact/signals";
import { twMerge } from "tailwind-merge";
import { Button } from "./common";

let recognition;

export const SpeechButton = ({
  onSpeech,
  onUtterance,
  syncToRef,
  class: className,
}) => {
  const [listening, setListening] = useState(false);
  const [paused, setPaused] = useState(false);
  function onClick() {
    setPaused(false);
    setListening(!listening);
  }
  const isSpeaking = speaking.value;
  useEffect(() => {
    if (listening && recognition && isSpeaking && !paused) {
      console.log("pausing recognition");
      recognition.stop();
      setPaused(true);
    } else if (listening && recognition && !isSpeaking && paused) {
      console.log("resuming recognition");
      recognition.start();
      setPaused(false);
    } else if (listening && !recognition) {
      console.log("starting recognition");
      recognition = new webkitSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognition.onresult = (event) => {
        const results = event.results;
        const last = results[results.length - 1];
        let text = last[0].transcript;
        if (!last.isFinal) {
          text = "";
          for (const item of results) {
            text += item[0].transcript;
          }
        }
        if (onSpeech) {
          onSpeech(text);
        }
        if (syncToRef && syncToRef.current) {
          syncToRef.current.value = text;
        }
        if (last.isFinal) {
          if (onUtterance) {
            onUtterance(text);
          }
        }
      };
      recognition.start();
    } else if (!listening && recognition) {
      console.log("stopping recognition");
      recognition.stop();
      recognition = null;
    }
  }, [listening, paused, onSpeech, onUtterance, syncToRef, isSpeaking]);
  if (listening && !paused) {
    return (
      <Button class={className} onClick={onClick}>
        <icons.Stop class="w-6 h-6" />
      </Button>
    );
  } else if (listening && paused) {
    return (
      <Button class={className} onClick={onClick}>
        <icons.Pause class="w-6 h-6" />
      </Button>
    );
  }
  return (
    <Button class={className} onClick={onClick}>
      <icons.Mic class="w-6 h-6" />
    </Button>
  );
};

export const voicesSignal = signal([]);
voicesSignal.value = speechSynthesis.getVoices();
speechSynthesis.addEventListener("voiceschanged", () => {
  voicesSignal.value = speechSynthesis.getVoices();
});

export const speak = async (text, voice, lang = "en-US") => {
  if (!text) {
    throw new Error("No text to speak");
  }
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = lang;
  utt.voice = speechSynthesis.getVoices().find((v) => v.name === voice);
  let resolve, reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  utt.onend = () => {
    resolve();
    checkVoice();
  };
  utt.onerror = (err) => {
    console.log("Error for speech:", err);
    reject(err);
    checkVoice();
  };
  speechSynthesis.speak(utt);
  speaking.value = true;
  return promise;
};

export const speaking = signal(false);

function checkVoice(checkAgain = true) {
  const isSpeaking =
    speechSynthesis.speaking ||
    speechSynthesis.pending ||
    speechSynthesis.paused;
  if (isSpeaking !== speaking.value) {
    speaking.value = isSpeaking;
  }
  if (checkAgain) {
    setTimeout(() => {
      checkVoice(false);
    }, 100);
  }
}

export const SpeechControlButton = ({ value, onChange }) => {
  if (value) {
    return (
      <Button onClick={() => onChange(false)}>
        <icons.SpeakerPlaying class="h-4 w-4" />
      </Button>
    );
  } else {
    return (
      <Button onClick={() => onChange(true)}>
        <icons.SpeakerMute class="h-4 w-4" />
      </Button>
    );
  }
};
