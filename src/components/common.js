/* eslint-disable no-unused-vars */
import { useEffect, useRef } from "preact/hooks";
import { twMerge } from "tailwind-merge";
import { Header } from "./header";
import Sidebar from "./sidebar";
import * as icons from "./icons";

export const mergeProps = (defaultProps, props) => {
  const newProps = Object.assign({}, defaultProps);
  for (const id in props) {
    if (id === "class" && newProps.class) {
      continue;
    }
    newProps[id] = props[id];
  }
  if (props.class && newProps.class) {
    newProps.class = twMerge(newProps.class, props.class);
  }
  return newProps;
};

export const P = ({ children, class: _class }) => {
  _class = twMerge("py-1", _class);
  return <div class={_class}>{children}</div>;
};

export const Code = ({ children, class: _class }) => {
  _class = twMerge("bg-gray-200 font-mono p-x-1", _class);
  return <code class={_class}>{children}</code>;
};

export const A = ({ children, class: _class, ...props }) => {
  _class = twMerge("text-blue-500 underline hover:text-blue-700", _class);
  return (
    <a class={_class} {...props}>
      {children}
    </a>
  );
};

export const Card = ({ title, children, buttons, class: _class }) => {
  let buttonContainer = null;
  if (buttons && buttons.length) {
    buttonContainer = <div class="flex justify-end">{buttons}</div>;
  }
  _class = twMerge("relative w-72 p-2", _class);
  const footer = Array.isArray(children)
    ? children.find((c) => c.type === CardFooter)
    : null;
  if (footer) {
    children = children.filter((c) => c.type !== CardFooter);
  }
  const innerClass = footer
    ? "min-h-2 p-1 bg-white"
    : "min-h-2 p-1 bg-white rounded-b";
  return (
    <div class={_class}>
      <div class="rounded drop-shadow-lg w-full">
        <div class="bg-magenta p-1 rounded-t">
          <div class="flex items-center justify-between">
            <h3 class="text-lg text-ellipsis truncate whitespace-nowrap pl-2 font-semibold text-magenta-lighter">
              {title}
            </h3>
            {buttonContainer}
          </div>
        </div>
        <div class={innerClass}>{children}</div>
        {footer ? (
          <div class="bg-magenta-lighter px-1 rounded-b text-magenta">
            <div class="flex items-center justify-between">{footer}</div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export const CardFooter = ({ children }) => {
  return <>{children}</>;
};

export const CardButton = (props) => {
  const p = mergeProps(
    {
      class:
        "text-white bg-magenta hover:bg-magenta-light rounded-lg p-2 hover:bg-magenta-light border border-magenta-light m-1",
    },
    props
  );
  return <button {...p}>{props.children}</button>;
};

export const H1 = ({ class: className, children }) => (
  <div class={twMerge("text-xl font-medium text-black", className)}>
    {children}
  </div>
);

export const Field = ({ sideBySide, children }) => {
  if (children.length !== 2) {
    throw new Error(
      `Expected exactly two children to <Field>, not {children.length}`
    );
  }
  const label = children[0];
  const input = children[1];
  let divClass = "block text-gray-700 text-sm font-bold mb-2";
  if (sideBySide) {
    divClass += " inline pr-2";
  }
  return (
    <div class="mb-4">
      <label>
        <div class={divClass}>{label}</div>
        {input}
      </label>
    </div>
  );
};

export const TextInput = (props) => {
  const newProps = mergeProps(
    {
      type: "text",
      class:
        "shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline",
    },
    props
  );
  if (newProps.errored) {
    newProps.class += " border-red-500";
  }
  if (newProps.inputRef) {
    newProps.ref = newProps.inputRef;
    delete newProps.inputRef;
  }
  delete newProps.errored;
  return <input {...newProps} />;
};

export const TextArea = (props) => {
  const newProps = mergeProps(
    {
      class:
        "w-full border rounded p-3 focus:outline-none focus:shadow-outline",
    },
    props
  );
  const textRef = useRef();
  let setterRef = textRef;
  if (props.textareaRef) {
    setterRef = (element) => {
      props.textareaRef.current = element;
      textRef.current = element;
    };
  }
  function onKeyUp(event) {
    if (event.key === "Up" && !event.target.value.trim()) {
      if (props.onGoBackInHistory) {
        props.onGoBackInHistory(event.target);
        event.preventDefault();
        return false;
      }
    }
    if (event.key === "Enter" && !event.shiftKey) {
      if (props.onSubmit) {
        props.onSubmit(event.target);
        event.preventDefault();
        return false;
      }
    }
    return undefined;
  }
  function onKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      if (props.onSubmit) {
        event.preventDefault();
        return false;
      }
    }
    setTimeout(() => {
      fixHeight(event.target);
    });
    return undefined;
  }
  const prevOnInput = props.onInput;
  delete props.onInput;
  function onInput(event) {
    setTimeout(() => {
      fixHeight(event.target);
    });
    if (prevOnInput) {
      prevOnInput(event);
    }
  }
  function fixHeight(el) {
    const prevLength = el.getAttribute("data-prev-length");
    if (!prevLength || parseInt(prevLength, 10) > el.value.length) {
      el.style.height = "0";
    }
    el.style.height = `${el.scrollHeight}px`;
    el.setAttribute("data-prev-length", el.value.length);
  }
  useEffect(() => {
    if (textRef.current) {
      fixHeight(textRef.current);
    }
  });
  useEffect(() => {
    if (textRef.current) {
      fixHeight(textRef.current);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textRef.current]);
  const autoFocus = newProps.autoFocus;
  delete newProps.autoFocus;
  useEffect(() => {
    if (autoFocus && textRef.current) {
      textRef.current.focus();
      const len = textRef.current.value.length;
      textRef.current.setSelectionRange(len, len);
    }
  });
  return (
    <textarea
      {...newProps}
      ref={setterRef}
      onKeyUp={onKeyUp}
      onKeyDown={onKeyDown}
      onInput={onInput}
    />
  );
};

export const Select = (props) => {
  const newProps = mergeProps(
    {
      class:
        "bg-white border rounded py-2 px-3 leading-tight focus:outline-none focus:shadow-outline",
    },
    props
  );
  const options = newProps.options;
  delete newProps.options;
  let children;
  if (Array.isArray(options)) {
    children = options.map((option) => (
      <option value={option}>{option}</option>
    ));
  } else {
    children = Object.keys(options).map((key) => (
      <option value={key}>{options[key]}</option>
    ));
  }
  return <select {...newProps}>{children}</select>;
};

export const Form = ({ children, onSubmit }) => {
  function suppressOnSubmit(event) {
    event.preventDefault();
    const el = event.target.querySelector("input");
    onSubmit(el.value);
    return false;
  }
  return <form onSubmit={suppressOnSubmit}>{children}</form>;
};

export const Alert = ({ title, children }) => {
  return (
    <div
      class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
      role="alert"
    >
      {title ? <strong class="font-bold">{title}</strong> : null}
      <span class="block sm:inline">{children}</span>
    </div>
  );
};

export const PageContainer = ({ children }) => {
  const header = children.find((child) => child.type === Header);
  const sidebar = children.find((child) => child.type === Sidebar);
  const rest = children.filter(
    (child) => child.type !== Header && child.type !== Sidebar
  );
  return (
    <div class="flex flex-col bg-blue-complement-light min-h-screen">
      <div class="shrink-0">{header}</div>
      <div class="flex grow flex-row w-full">
        <div class="flex-2">{rest}</div>
        {sidebar ? <div class="flex-1">{sidebar}</div> : null}
      </div>
      <div class="shrink-0 mx-auto opacity-75">
        LLM Garden by <A href="https://ianbicking.org">Ian Bicking</A> |{" "}
        <A href="https://github.com/ianb/llm-garden">GitHub</A>
      </div>
    </div>
  );
};

export const Pre = (props) => {
  const p = mergeProps({ class: "whitespace-pre-wrap" }, props);
  return <pre {...p}>{props.children}</pre>;
};

export const Button = (props) => {
  const p = mergeProps(
    {
      class: "bg-magenta hover:bg-blue-700 text-white py-2 px-4 rounded-lg m-5",
    },
    props
  );
  return <button {...p}>{props.children}</button>;
};

export const DateView = ({ timestamp, class: _class }) => {
  if (!timestamp) {
    return null;
  }
  const date = new Date(timestamp);
  const dateString = date.toLocaleString();
  return <span class={_class}>{dateString}</span>;
};

export const InfoHeader = ({ title, children }) => {
  return (
    <div class="w-full">
      <div class="max-w-2xl mx-auto bg-aqua-dark text-white m-5 rounded drop-shadow-lg p-4">
        <H1 class="text-aqua-lightest">
          <icons.Info class="h-6 w-6 inline-block mr-1 mb-1 text-aqua-light" />
          {title}
        </H1>
        <div class="text-white">{children}</div>
      </div>
    </div>
  );
};
