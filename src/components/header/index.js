import { h } from 'preact';
import { Link } from 'preact-router/match';
import style from './style.css';

const Header = ({title, status}) => (
	<header class={style.header}>
		<h1>{title}</h1>
		<nav>
      <div class="status">
        {status}
      </div>
		</nav>
	</header>
);

export default Header;
