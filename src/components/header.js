import { signal } from "@preact/signals";
import { tokenCostTracker } from "../gptservice/tokencost";
import { useEffect } from "preact/hooks";
import { useState, useRef } from "preact/hooks";
// eslint-disable-next-line no-unused-vars
import * as icons from "./icons";

const tokenCost = signal(tokenCostTracker);

tokenCostTracker.addOnUpdate((tracker) => {
  tokenCost.value = tracker;
});

export const Header = ({
  title,
  section,
  sectionLink,
  trackerPaths,
  links,
  buttons,
  menu,
}) => {
  trackerPaths = trackerPaths || "all";
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);
  useEffect(() => {
    document.title = title;
  }, [title]);
  function onClickMenu() {
    if (menu) {
      setShowMenu(!showMenu);
    }
  }
  function onBackgroundClick(e) {
    if (menuRef.current && !menuRef.current.contains(e.target)) {
      setShowMenu(false);
    }
  }
  useEffect(() => {
    document.addEventListener("click", onBackgroundClick);
    return () => {
      document.removeEventListener("click", onBackgroundClick);
    };
  });
  let sectionTag;
  if (section) {
    if (sectionLink) {
      sectionTag = (
        <>
          <a href={sectionLink}>{section}</a>{" "}
          <icons.ChevronRight class="h-4 w-4 inline-block" />
        </>
      );
    } else {
      sectionTag = (
        <>
          {section} <icons.ChevronRight class="h-4 w-4 inline-block" />
        </>
      );
    }
  }
  return (
    <nav class="flex items-center justify-between flex-wrap bg-blue-complement pr-6 pl-6 pt-2 pb-2 sticky top-0 z-50">
      <div class="flex items-center flex-shrink-0 text-white mr-6">
        <a href="/">
          <icons.Home class="h-5 w-5 mr-2" />
        </a>
        <span class="font-semibold text-xl tracking-tight">
          {sectionTag}
          {title}
        </span>
      </div>
      <div class="block">
        <div class="flex items-center">
          <button
            disabled={!menu}
            class="border rounded px-3 py-2 text-teal-200 border-teal-400 hover:text-white hover:border-white"
            onClick={onClickMenu}
          >
            <svg
              class="fill-current h-3 w-3"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <title>Menu</title>
              <path d="M0 3h20v2H0V3zm0 6h20v2H0V9zm0 6h20v2H0v-2z" />
            </svg>
          </button>
          {showMenu ? (
            <div
              class="z-10 p-1 absolute left-72 top-8 w-64 bg-white rounded-lg shadow-xl"
              ref={menuRef}
            >
              <button
                onClick={onClickMenu}
                class="float-right text-gray-500 hover:text-black cursor-pointer mr-2"
              >
                ×
              </button>
              <div class="p-4">{menu}</div>
            </div>
          ) : null}
        </div>
      </div>
      <div class="w-full block flex-grow lg:flex lg:items-center lg:w-auto">
        <div class="text-sm text-gray-100 ml-3 lg:flex-grow">
          {tokenCostTracker.summarizePaths(trackerPaths)}
        </div>
        <div class="text-sm lg:flex-grow">{links}</div>
        <div>{buttons}</div>
      </div>
    </nav>
  );
};

export const HeaderLink = ({ href, children }) => {
  return (
    <a
      href={href}
      class="block mt-4 lg:inline-block lg:mt-0 text-teal-200 hover:text-white mr-4"
    >
      {children}
    </a>
  );
};

export const HeaderButton = ({ children, onClick }) => {
  return (
    <button
      class="inline-block text-sm px-4 py-2 leading-none border rounded text-white border-white hover:border-transparent hover:text-teal-500 hover:bg-white mt-4 lg:mt-0"
      onClick={onClick}
    >
      {children}
    </button>
  );
};
