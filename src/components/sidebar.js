import { twMerge } from "tailwind-merge";

const Sidebar = ({ children, class: className }) => {
  // FIXME: can't decide if "absolute" is helpful or harmful
  className = twMerge(
    "h-screen sticky top-0 rounded-l drop-shadow-lg ml-2 bg-white p-2 pl-3 overflow-y-scroll",
    className
  );
  return <aside class={className}>{children}</aside>;
};

export default Sidebar;
