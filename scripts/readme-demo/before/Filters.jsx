import { useState } from "react";
import { FilterPanel } from "./FilterPanel";

export const Filters = () => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(!open)}>Filters</button>
      {open && <FilterPanel />}
    </>
  );
};
