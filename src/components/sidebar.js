const Sidebar = ({ children }) => {
  // FIXME: can't decide if "absolute" is helpful or harmful
  return (
    <div class="x-absolute">
      <div class="absolute sticky top-0 right-0 float-right w-1/3 rounded-l drop-shadow-l ml-2 bg-white p-2 pl-3">
        {children}
      </div>
    </div>
  );
};

export default Sidebar;
