const Sidebar = ({ children }) => {
  return (
    <div class="absolute">
      <div class="absolute sticky top-0 right-0 float-right w-1/3 rounded-l drop-shadow-l ml-2 bg-white p-2 pl-3">
        {children}
      </div>
    </div>
  );
};

export default Sidebar;
