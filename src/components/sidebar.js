const Sidebar = ({ children }) => (
  <div class="fixed sticky top-0 right-0 float-right p-3 bg-slate-100 border-2 rounded-sm w-1/3">
    {children}
  </div>
);

export default Sidebar;
