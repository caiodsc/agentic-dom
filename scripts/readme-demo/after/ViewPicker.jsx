import { useState } from "react";

export const ViewPicker = ({ views }) => {
  const [view, setView] = useState(views[0]);
  return views.map((v) => (
    <button
      key={v}
      aria-pressed={view === v}
      className={view === v ? "on" : ""}
      onClick={() => setView(v)}
    >
      {v}
    </button>
  ));
};
