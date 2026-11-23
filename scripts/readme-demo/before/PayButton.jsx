export const PayButton = ({ hasCard }) => (
  <button disabled={!hasCard}>Pay</button>
);
