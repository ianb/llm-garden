import { h } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { Router } from 'preact-router';
import style from '../routes/home/style.css';
import Header from './header';
import Story from '../routes/story/index';
import { stories } from '../routes/story/storyloader';

// Code-splitting is automated for `routes` directory
// import Home from '../routes/home';
import Profile from '../routes/profile';


const App = () => (
	<div id="app">
		<Header />
		<Router>
      <Intro path="/" />
			<Story path="/story/:filename" />
		</Router>
	</div>
);

const Intro = () => {
  return <div class={style.home}>
    <h1>Choose a game to play:</h1>
    <ul>
      {Object.keys(stories).map(key => (
    		<li key={key}>
    			<a href={`/stories/${key}`}>{stories[key].title}</a>
    		</li>
      ))}
    </ul>
  </div>
}

export default App;
