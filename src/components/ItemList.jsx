export default function ItemList({ items = [] }) {
  return (
    <section aria-label="Inventory">
      <h2>Your items</h2>
      {items.length ? (
        <ul>
          {items.map((item, i) => (
            <li key={`${item.name}-${i}`}>
              <strong>{item.name}</strong> — {item.quantity} ({item.category}
              {item.meals ? `, about ${Math.round(item.meals)} meals` : ""}
              {item.liters
                ? `, about ${Math.round(item.liters * 10) / 10} L`
                : ""}
              )
            </li>
          ))}
        </ul>
      ) : (
        <p>No items identified. Try manual entry or a clearer photo.</p>
      )}
    </section>
  );
}
