export const TeamList = ({ users }) =>
  users.map((user) => (
    <li key={user.id}>
      {user.name} <button>Edit</button>
    </li>
  ));
