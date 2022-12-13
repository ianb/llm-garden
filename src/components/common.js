import { useEffect, useRef } from "preact/hooks";
import { twMerge } from "tailwind-merge";

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

export const P = ({ children }) => <p class="">{children}</p>;

export const Card = ({ children }) => (
  <div class="p-6 max-w-sm mx-auto bg-white rounded-xl shadow-lg items-center m-2">
    {children}
  </div>
);

export const Card2 = ({ title, children, buttons, class: _class }) => {
  let buttonContainer = null;
  if (buttons && buttons.length) {
    buttonContainer = <div class="flex justify-end">{buttons}</div>;
  }
  _class = twMerge("relative w-72 p-2", _class);
  return (
    <div class={_class}>
      <div class="rounded drop-shadow-l w-full">
        <div class="bg-magenta p-1 rounded-t">
          <div class="flex items-center justify-between">
            <h3 class="text-lg text-ellipsis truncate whitespace-nowrap pl-2 font-semibold text-magenta-lighter">
              {title}
            </h3>
            {buttonContainer}
          </div>
        </div>
        <div class="p-1 bg-white rounded-b">{children}</div>
      </div>
    </div>
  );
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
    props
  );
  if (newProps.errored) {
    newProps.class += " border-red-500";
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
  return (
    <div class="mx-auto bg-blue-complement-light min-h-screen">{children}</div>
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
