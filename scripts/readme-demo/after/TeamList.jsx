export const TeamList = ({ users }) =>
  users.map((user) => (
    <li key={user.id}>
      {user.name}
      <button aria-label={`Edit ${user.name}`}>
        Edit
      </button>
    </li>
  ));
