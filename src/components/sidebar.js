const Sidebar = ({ children }) => {
  // FIXME: can't decide if "absolute" is helpful or harmful
  return (
    <aside class="h-screen sticky top-0 rounded-l drop-shadow-lg ml-2 bg-white p-2 pl-3">
      {children}
    </aside>
  );
};

export default Sidebar;
