/* globals webkitSpeechRecognition */
import { useState, useEffect } from "preact/hooks";

let recognition;

export const SpeechButton = ({ onSpeech, onUtterance, syncToRef }) => {
  const [listening, setListening] = useState(false);
  function onClick() {
    setListening(!listening);
  }
  useEffect(() => {
    if (listening && recognition !== null) {
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
    }
    if (!listening && recognition) {
      recognition.stop();
      recognition = null;
    }
  }, [listening, onSpeech, onUtterance, syncToRef]);
  if (listening) {
    // tailwind HTML for a stop mic button
    return (
      <button
        class="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
        onClick={onClick}
      >
        wavy mic
      </button>
    );
  }
  return (
    <button
      class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      onClick={onClick}
    >
      mic
    </button>
  );
};
