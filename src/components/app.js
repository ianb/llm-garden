import { h } from 'preact';
import { Router } from 'preact-router';
import Header from './header';
import Story from '../routes/story/index';
import { stories } from '../routes/story/storyloader';
import { holder } from "../key";
import { signal } from "@preact/signals";

const hasKeySignal = signal(holder.hasKey());
const keyError = signal("");

const App = () => {
  let u = (new URL(location.href)).searchParams;
  if (!hasKeySignal.value) {
    return <div id="app">
      <Header />
      <RequestKey />
    </div>;
  }
  if (u.get("story")) {
    return <div id="app">
      <Story filename={u.get("story")} />
    </div>;
  } else {
  	return <div id="app">
	  	<Header />
		  <Intro />
  	</div>;
  }
};

const Intro = () => {
  return <div class="home">
    <h1>Choose a game to play:</h1>
    <ul>
      {Object.keys(stories).map(key => (
    		<li key={key}>
    			<a href={`./?story=${key}`}>{stories[key].title}</a>
    		</li>
      ))}
    </ul>
  </div>
}

const RequestKey = () => {
  function onSubmit(e) {
    e.preventDefault();
    let textInput = e.target.querySelector("input").value;
    let setKey = holder.setKeyFromText(textInput);
    if (setKey) {
      hasKeySignal.value = true;
      keyError.value = "";
    } else {
      keyError.value = "Invalid key";
    }
    return false;
  }
  return <div class={style.home}>
    <h1>Required API key:</h1>
    <p>This application requires a GPT-3 key. To use it you must enter one here; it will be stored locally in this browser and be used only to make requests from this browser to GPT-3 directly.</p>
    {keyError.value ? <p>{keyError.value}</p> : null}
    <form onSubmit={onSubmit}>
      <label>
        GPT key:
        <input type="text" autoFocus size="64" />
      </label>
      </form>
  </div>;
}

export default App;
