import { TrashIcon } from "./icons";

export const DeleteButton = ({ onDelete }) => (
  <button onClick={onDelete}>
    <TrashIcon />
  </button>
);
