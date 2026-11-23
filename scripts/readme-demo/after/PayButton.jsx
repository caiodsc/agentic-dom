export const PayButton = ({ hasCard }) => (
  <>
    <button disabled={!hasCard} aria-describedby="why">
      Pay
    </button>
    {!hasCard && <p id="why">Add a card to pay.</p>}
  </>
);
