import { useState, useEffect } from "preact/hooks";
import { A } from "../components/common";
import Sidebar from "../components/sidebar";
import { twMerge } from "tailwind-merge";

export const Page = ({ title, background, saturated, children }) => {
  useEffect(() => {
    document.title = title || "City";
  }, [title]);
  if (!Array.isArray(children)) {
    if (!children) {
      children = [];
    } else {
      children = [children];
    }
  }
  const sidebar = children.find((child) => child.type === Sidebar);
  const rest = children.filter(
    (child) => child.type !== Sidebar
  );
  let style = "";
  if (background) {
    style = `background-image: url(${background}); background-repeat: no-repeat; background-size: cover; background-position: center;`;
  }
  let saturationStyle = "background-color: rgba(255, 255, 255, 0.3)";
  if (saturated) {
    saturationStyle = null;
  }
  return <div class="flex flex-col bg-blue-complement-light min-h-screen" style={style}>
    <div class="flex items-center justify-between px-4 py-2 shadow-md" style="background-color: rgba(0, 0, 0, 0.3)">
      <h1 class="text-2xl font-semibold text-gray-200">{title || "??"}</h1>
    </div>
    <div class="flex grow flex-row w-full" style={saturationStyle}>
      <div class="flex-2">{rest}</div>
      {sidebar ? <div class="flex-1">{sidebar}</div> : null}
    </div>
    <footer class="flex items-center justify-center h-16 bg-gray-800 text-white">
      City by <A class="px-1" href="https://ianbicking.org">Ian Bicking</A>
    </footer>
  </div>
};

export const SiteImage = ({ src, class: _class, ...props }) => {
  const [zooming, setZooming] = useState(false);
  if (!src) {
    return null;
  }
  _class = twMerge("block w-full m-2 rounded-lg shadow-md shadow-slate-800", _class);
  if (zooming) {
    return ZoomedImage({ src, onDone: () => setZooming(false), ...props });
  }
  return (
    <div class="lg:float-right lg:w-1/2 md:clear-both w-full">
      <img src={src} class={_class} {...props} onClick={() => setZooming(true)} />
    </div>
  );
};

export const ZoomedImage = ({ src, onDone, ...props }) => {
  /* Show the src image zoomed in with a dark overlay behind it. */
  return (
    <div class="fixed inset-0 flex items-center justify-center">
      <div class="fixed inset-0 bg-black opacity-75" onClick={onDone} />
      <div class="relative">
        <img src={src} class="max-h-screen max-w-screen" {...props} />
      </div>
    </div>
  );
};


export const InsetImage = ({ src, class: _class, ...props }) => {
  if (!src) {
    return null;
  }
  _class = twMerge("block w-full m-2", _class);
  return (
    <div class="float-right lg:w-36 w-24">
      <img src={src} class={_class} {...props} />
    </div>
  );
};

export const TextBox = ({ children, class: _class, ...props }) => {
  _class = twMerge("text-gray-900 lg:w-1/3 p-3 rounded m-4 leading-relaxed shadow-md shadow-slate-800", _class);
  return <div style="background-color: rgba(255, 255, 255, 0.7)" class={_class} {...props}>{children}</div>;
};

export const ChoiceList = ({ children, intro, class: _class, ...props }) => {
  _class = twMerge("m-4 rounded lg:w-1/3 p-2", _class);
  return <div style="background-color: rgba(255, 255, 255, 0.7" class={_class} {...props}>
    <div>{intro}</div>
    <ul class="block">{children}</ul>
  </div>;
};

export const Choice = ({ children, href, class: _class, ...props }) => {
  _class = twMerge("m-2 p-2 hover:bg-gray-400 rounded", _class);
  if (Array.isArray(href)) {
    href = "#/" + href.map(x => encodeURIComponent(x)).join("/");
  }
  return (
    <li class="list-none m-4">
      <a href={href} class={_class} {...props}>{children}</a>
    </li>
  );
};

export const H2 = ({ children, class: _class, ...props }) => {
  _class = twMerge("text-xl font-semibold", _class);
  return <h2 class={_class} {...props}>{children}</h2>;
};
