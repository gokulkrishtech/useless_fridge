import { useEffect, useMemo, useRef, useState } from 'react';

const GROCERIES = [
  { id: 'milk', name: 'Milk', emoji: '🥛', spoilDays: 6 },
  { id: 'eggs', name: 'Eggs', emoji: '🥚', spoilDays: 21 },
  { id: 'cheese', name: 'Cheese', emoji: '🧀', spoilDays: 16 },
  { id: 'butter', name: 'Butter', emoji: '🧈', spoilDays: 30 },
  { id: 'yogurt', name: 'Yogurt', emoji: '🍶', spoilDays: 12 },
  { id: 'apple', name: 'Apple', emoji: '🍎', spoilDays: 18 },
  { id: 'banana', name: 'Banana', emoji: '🍌', spoilDays: 6 },
  { id: 'lettuce', name: 'Lettuce', emoji: '🥬', spoilDays: 7 },
  { id: 'carrot', name: 'Carrot', emoji: '🥕', spoilDays: 24 },
  { id: 'tomato', name: 'Tomato', emoji: '🍅', spoilDays: 8 },
  { id: 'pizza', name: 'Leftover pizza', emoji: '🍕', spoilDays: 4 },
  { id: 'juice', name: 'Juice', emoji: '🧃', spoilDays: 10 },
  { id: 'soda', name: 'Soda', emoji: '🥤', spoilDays: 90 },
  { id: 'ketchup', name: 'Ketchup', emoji: '🍶', spoilDays: 180 },
];

const TEMP_LABELS = {
  1: 'Set to 1 - near-freezing. Food barely ages.',
  2: 'Set to 2 - very cold. Food ages slowly.',
  3: 'Set to 3 - cold. Food ages a little slower than normal.',
  4: 'Set to 4 - food ages at a normal rate.',
  5: 'Set to 5 - mild. Food ages a bit faster.',
  6: 'Set to 6 - warm. Food ages quickly.',
  7: 'Set to 7 - warm. Food spoils fast.',
};

const TEMP_MULTIPLIER = { 1: 0.4, 2: 0.6, 3: 0.8, 4: 1, 5: 1.3, 6: 1.7, 7: 2.2 };
const INITIAL_ITEMS = [
  ['milk', 'top'],
  ['eggs', 'top'],
  ['lettuce', 'bottom'],
  ['apple', 'bottom'],
  ['cheese', 'middle'],
];

function getFreshness(item, day, multiplier) {
  const definition = GROCERIES.find((grocery) => grocery.id === item.defId);
  const age = (day - item.addedDay) * multiplier;
  const ratio = age / definition.spoilDays;
  const stage = ratio >= 1 ? 'rotten' : ratio >= 0.55 ? 'aging' : 'fresh';
  return { stage, daysLeft: Math.max(0, Math.ceil(definition.spoilDays - age)) };
}

function FoodItem({ item, definition, freshness, onDragStart, onDragEnd }) {
  return (
    <div
      className={`item ${freshness.stage}`}
      draggable
      title={`${definition.name} - ${freshness.stage === 'rotten' ? 'spoiled' : `${freshness.daysLeft} day(s) left`}`}
      onDragStart={(event) => onDragStart(event, item.uid)}
      onDragEnd={onDragEnd}
    >
      {definition.emoji}
      <span className="item-age">{freshness.stage === 'rotten' ? 'spoiled' : `${freshness.daysLeft}d`}</span>
    </div>
  );
}

function DropZone({ shelf, items, definitions, day, multiplier, onDrop, onDragStart, onDragEnd, className = '' }) {
  const [dragOver, setDragOver] = useState(false);
  const shelfItems = items.filter((item) => item.shelf === shelf);

  return (
    <div
      className={`${className} ${dragOver ? 'drag-over' : ''}`}
      onDragOver={(event) => { event.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(event) => { event.preventDefault(); setDragOver(false); onDrop(shelf); }}
    >
      {shelfItems.map((item) => (
        <FoodItem
          key={item.uid}
          item={item}
          definition={definitions[item.defId]}
          freshness={getFreshness(item, day, multiplier)}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        />
      ))}
    </div>
  );
}

function App() {
  const [day, setDay] = useState(1);
  const [temperature, setTemperature] = useState(4);
  const [doorOpen, setDoorOpen] = useState(false);
  const [items, setItems] = useState(() => INITIAL_ITEMS.map(([defId, shelf], index) => ({
    uid: `i${index}`,
    defId,
    shelf,
    addedDay: 1,
  })));
  const [draggedUid, setDraggedUid] = useState(null);
  const [toast, setToast] = useState('');
  const toastTimer = useRef(null);
  const multiplier = TEMP_MULTIPLIER[temperature];
  const definitions = useMemo(() => Object.fromEntries(GROCERIES.map((grocery) => [grocery.id, grocery])), []);

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const showToast = (message) => {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2200);
  };

  const addItem = (defId) => {
    const definition = definitions[defId];
    setItems((currentItems) => [...currentItems, {
      uid: `i${Date.now()}-${Math.random()}`,
      defId,
      shelf: 'top',
      addedDay: day,
    }]);
    showToast(`${definition.emoji} ${definition.name} added to the fridge.`);
  };

  const moveItem = (shelf) => {
    if (!draggedUid) return;
    setItems((currentItems) => currentItems.map((item) => (
      item.uid === draggedUid ? { ...item, shelf } : item
    )));
    setDraggedUid(null);
  };

  const tossItem = () => {
    if (!draggedUid) return;
    const item = items.find((currentItem) => currentItem.uid === draggedUid);
    if (item) showToast(`${definitions[item.defId].name} tossed.`);
    setItems((currentItems) => currentItems.filter((currentItem) => currentItem.uid !== draggedUid));
    setDraggedUid(null);
  };

  const advanceDay = () => {
    const rottenBefore = items.filter((item) => getFreshness(item, day, multiplier).stage === 'rotten').length;
    const nextDay = day + 1;
    setDay(nextDay);
    const rottenAfter = items.filter((item) => getFreshness(item, nextDay, multiplier).stage === 'rotten').length;
    showToast(rottenAfter > rottenBefore ? `Day ${nextDay} - something in there just went bad.` : `Day ${nextDay}.`);
  };

  const startDrag = (event, uid) => {
    setDraggedUid(uid);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="wrap">
      <header className="site-head">
        <h1>The Fridge</h1>
        <p className="tagline">Stock it, forget about it, pay the price.</p>
      </header>

      <main className="app">
        <section className="fridge-stage" aria-label="Fridge">
          <div className={`fridge ${doorOpen ? 'open' : ''}`}>
            <div className="fridge-shadow" />
            <div className="fridge-body">
              <div className="freezer"><div className="freezer-handle" /><div className="freezer-label">FREEZER</div></div>
              <div className="interior">
                <div className="bulb" />
                {[['top', 'Top shelf'], ['middle', 'Middle shelf'], ['bottom', 'Crisper drawer']].map(([shelf, label], index) => (
                  <div className="shelf-space" key={shelf}>
                    <div className="shelf-label">{label}</div>
                    <DropZone shelf={shelf} items={items} definitions={definitions} day={day} multiplier={multiplier} className="items-row" onDrop={moveItem} onDragStart={startDrag} onDragEnd={() => setDraggedUid(null)} />
                    {index < 2 && <div className="glass-shelf" />}
                  </div>
                ))}
              </div>
              <div className="door">
                <button className="door-face" type="button" onClick={() => setDoorOpen((open) => !open)} aria-label="Toggle fridge door">
                  <span className="brand-badge">GLACIER<span>&nbsp;700</span></span>
                  <span className="handle" />
                </button>
                <div className="door-inner" aria-hidden={!doorOpen}>
                  {['door-top', 'door-mid', 'door-bottom'].map((shelf) => (
                    <DropZone key={shelf} shelf={shelf} items={items} definitions={definitions} day={day} multiplier={multiplier} className="bin" onDrop={moveItem} onDragStart={startDrag} onDragEnd={() => setDraggedUid(null)} />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <button className="door-toggle" type="button" onClick={() => setDoorOpen((open) => !open)}>{doorOpen ? 'Close door' : 'Open door'}</button>
        </section>

        <aside className="panel">
          <div className="panel-block">
            <div className="panel-row"><h2>Day <span>{day}</span></h2><button className="btn primary" type="button" onClick={advanceDay}>Next day &rarr;</button></div>
            <p className="hint">Time only passes when you say so. Everything ages while you're not looking.</p>
          </div>
          <div className="panel-block">
            <h2>Thermostat</h2>
            <div className="thermo"><span className="thermo-cold">Cold</span><input type="range" min="1" max="7" value={temperature} step="1" onChange={(event) => setTemperature(Number(event.target.value))} /><span className="thermo-warm">Warm</span></div>
            <p className="hint">{TEMP_LABELS[temperature]}</p>
          </div>
          <div className="panel-block">
            <h2>Add groceries</h2>
            <div className="grocery-grid">{GROCERIES.map((grocery) => <button className="grocery-item" type="button" key={grocery.id} onClick={() => addItem(grocery.id)}><span className="grocery-emoji">{grocery.emoji}</span><span className="grocery-name">{grocery.name}</span></button>)}</div>
          </div>
          <div className="panel-block">
            <h2>Contents</h2>
            <ul className="legend"><li><span className="dot fresh" /> Fresh</li><li><span className="dot aging" /> Ageing</li><li><span className="dot rotten" /> Spoiled - toss it</li></ul>
            <p className="hint">Drag anything onto the bin to throw it out.</p>
          </div>
        </aside>
      </main>

      <div className="trash" aria-label="Throw away" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); tossItem(); }}><div className="trash-icon">🗑</div><div className="trash-label">Drop to toss</div></div>
      <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>
    </div>
  );
}

export default App;
