import { useEffect, useRef } from "preact/hooks";
import { twMerge } from "tailwind-merge";

export const mergeProps = (defaultProps, props, special) => {
  special = special || [];
  const newProps = Object.assign({}, defaultProps);
  if (special.length) {
    newProps.special = {};
  }
  for (const id in props) {
    if (id === "class" && newProps.class) {
      continue;
    }
    if (special.includes(id)) {
      newProps.special[id] = props[id];
    }
    newProps[id] = props[id];
  }
  if (props.class && newProps.class) {
    newProps.class = twMerge(newProps.class, props.class);
  }
  return newProps;
};

export const P = ({ children }) => <p class="">{children}</p>;

export const Card = ({ children }) => (
  <div class="p-6 max-w-sm mx-auto bg-white rounded-xl shadow-lg items-center m-2">
    {children}
  </div>
);

export const H1 = ({ children }) => (
  <div class="text-xl font-medium text-black">{children}</div>
);

export const Field = ({ children }) => {
  if (children.length !== 2) {
    throw new Error(
      `Expected exactly two children to <Field>, not {children.length}`
    );
  }
  const label = children[0];
  const input = children[1];
  return (
    <div class="mb-4">
      <label>
        <div class="block text-gray-700 text-sm font-bold mb-2">{label}</div>
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
    props,
    ["errored"]
  );
  if (newProps.special.errored) {
    newProps.class += " border-red-500";
  }
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
  return (
    <textarea
      {...newProps}
      ref={textRef}
      onKeyUp={onKeyUp}
      onKeyDown={onKeyDown}
    />
  );
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
  return <div id="container mx-auto flex">{children}</div>;
};

export const Pre = (props) => {
  const p = mergeProps({ class: "whitespace-pre-wrap" }, props);
  return <pre {...p}>{props.children}</pre>;
};
