// Story missions for Solmar City. Danny Reyes, ex-wheelman, owes the wrong people money
// and has one week to buy his way out. Each mission is a list of stages; a stage ends
// when the player reaches its target (or its condition fires).
export const HIDEOUT = { x: 480, y: 480, label: "Rosa's Garage" };
export const SPOTS = {
  deli: { x: 1120, y: 800, label: 'Marina Deli' },
  sportsCar: { x: 2080, y: 1120, label: 'Comet GT' },
  chopShop: { x: 2400, y: 1440, label: "Vic's Chop Shop" },
  bar: { x: 1760, y: 2080, label: 'The Rusty Anchor' },
  docks: { x: 2720, y: 2720, label: 'Solmar Docks' },
  hospital: { x: 800, y: 2400, label: 'St. Marina Hospital' },
};

export const MISSIONS = [
  {
    id: 0, title: 'The Pickup', reward: 500,
    intro: ['Rosa: "Danny. You are back. One job and the slate is clean — almost."',
            'Rosa: "Pick up the package at Marina Deli. Bring it home. No trouble."'],
    stages: [
      { text: 'Drive to Marina Deli and pick up the package', target: SPOTS.deli, radius: 90 },
      { text: 'Bring the package back to Rosa\'s Garage', target: HIDEOUT, radius: 90 },
    ],
    outro: 'Rosa: "Clean. The Marinos will hear you are reliable."',
  },
  {
    id: 1, title: 'Hot Wheels', reward: 900,
    intro: ['Vic: "A Comet GT is parked uptown, keys in it. I need it before sundown."',
            'Vic: "Steal it, lose the heat, bring it to my shop. Easy money."'],
    stages: [
      { text: 'Find the yellow Comet GT uptown', target: SPOTS.sportsCar, radius: 110, spawnCar: true },
      { text: 'Steal the Comet GT (press E beside it)', target: SPOTS.sportsCar, radius: 60, needCar: 'Comet GT' },
      { text: 'Deliver the Comet GT to Vic\'s Chop Shop', target: SPOTS.chopShop, radius: 90, needCar: 'Comet GT', wantedOnSteal: 2 },
    ],
    outro: 'Vic: "Beautiful. The Marinos pay fast when the goods are this pretty."',
  },
  {
    id: 2, title: 'Debt Collection', reward: 800,
    intro: ['Rosa: "Three punks at the Rusty Anchor owe the Marinos eight hundred."',
            'Rosa: "Collect it. They will not hand it over nicely."'],
    stages: [
      { text: 'Go to The Rusty Anchor', target: SPOTS.bar, radius: 100, spawnThugs: true },
      { text: 'Deal with the three thugs', target: SPOTS.bar, radius: 220, needThugsDead: true },
      { text: 'Collect the cash and return to Rosa\'s Garage', target: HIDEOUT, radius: 90 },
    ],
    outro: 'Rosa: "Eight hundred, in full. You are earning your name back."',
  },
  {
    id: 3, title: 'The Getaway', reward: 1200,
    intro: ['Marco: "The cops raided the stash house. I am pinned — get here NOW."',
            'Marco: "Ninety seconds. Every cruiser in Solmar will be on you."'],
    stages: [
      { text: 'Reach Marco at the hideout before time runs out — wanted level 3!', target: HIDEOUT, radius: 90, timer: 100, wanted: 3 },
    ],
    outro: 'Marco: "You drive like the devil himself. The Marinos owe you one."',
  },
  {
    id: 4, title: 'Harbor Heist', reward: 2500,
    intro: ['Rosa: "Last one, Danny. A truck full of cargo sits at the docks."',
            'Rosa: "Take it, outrun the whole department, and we are done."'],
    stages: [
      { text: 'Get to Solmar Docks', target: SPOTS.docks, radius: 120, spawnTruck: true },
      { text: 'Steal the cargo truck', target: SPOTS.docks, radius: 70, needCar: 'Cargo Truck' },
      { text: 'Lose the heat and deliver the truck to Rosa\'s Garage', target: HIDEOUT, radius: 110, needCar: 'Cargo Truck', wantedOnSteal: 4 },
    ],
    outro: 'Rosa: "It is done. The debt is paid. Solmar City is yours now, Danny."',
  },
];

export function startMission(G, idx, api) {
  const def = MISSIONS[idx];
  G.mission = { def, stage: 0, timer: 0, startedAt: G.time, active: true };
  api.banner(def.title, 'New mission');
  api.sayLines(def.intro);
  applyStage(G, api);
}

export function applyStage(G, api) {
  const m = G.mission; if (!m) return;
  const stage = m.def.stages[m.stage];
  if (!stage) return;
  m.timer = stage.timer || 0;
  if (stage.wanted) api.setWanted(stage.wanted);
  if (stage.spawnThugs) api.spawnThugs(SPOTS.bar.x, SPOTS.bar.y);
  if (stage.spawnCar) api.spawnMissionCar(SPOTS.sportsCar.x, SPOTS.sportsCar.y, 'Comet GT', '#e8c53d');
  if (stage.spawnTruck) api.spawnMissionCar(SPOTS.docks.x, SPOTS.docks.y, 'Cargo Truck', '#7a5a2e');
  G.objective = stage.text;
  G.objectiveTarget = stage.target;
}

export function updateMission(G, api, dt) {
  const m = G.mission; if (!m || !m.active) return;
  const stage = m.def.stages[m.stage];
  if (!stage) return;
  if (m.timer > 0) {
    m.timer -= dt;
    if (m.timer <= 0) { failMission(G, api, 'Out of time.'); return; }
  }
  const p = G.player;
  const dx = p.x - stage.target.x, dy = p.y - stage.target.y;
  const near = dx * dx + dy * dy < stage.radius * stage.radius;
  if (stage.needThugsDead) {
    if (G.thugs.length > 0 && G.thugs.every((t) => t.dead)) advanceMission(G, api);
    return;
  }
  if (stage.needCar) {
    const inCar = p.car && p.car.name === stage.needCar;
    if (stage.spawnCar || stage.spawnTruck) { /* handled by steal stage */ }
    if (inCar && near) { advanceMission(G, api); return; }
    if (!inCar && stage.needCar && m.stage > 0 && near) { /* waiting in the car */ }
    return;
  }
  if (near) advanceMission(G, api);
}

export function advanceMission(G, api) {
  const m = G.mission;
  m.stage++;
  api.blip();
  if (m.stage >= m.def.stages.length) {
    completeMission(G, api);
  } else {
    applyStage(G, api);
  }
}

export function completeMission(G, api) {
  const m = G.mission;
  G.cash += m.def.reward;
  G.missionsDone++;
  api.banner('Mission complete', `+$${m.def.reward}  —  ${m.def.title}`);
  api.sayLines([m.def.outro]);
  api.missionDoneSound();
  G.mission = null;
  G.objective = 'Free roam — press M for the next job';
  G.objectiveTarget = null;
  if (G.missionsDone >= MISSIONS.length) {
    G.storyDone = true;
    api.banner('SOLMAR CITY IS YOURS', 'Story complete — side jobs pay from here on');
  }
  api.save();
}

export function failMission(G, api, reason) {
  const m = G.mission;
  api.banner('Mission failed', reason);
  api.failSound();
  G.mission = null;
  G.objective = 'Free roam — press M for the next job';
  G.objectiveTarget = null;
}

// Repeatable courier side jobs after a mission ends (or from the menu key M).
export function startSideJob(G, api) {
  const spots = Object.values(SPOTS);
  const a = spots[Math.floor(Math.random() * spots.length)];
  let b = spots[Math.floor(Math.random() * spots.length)];
  if (b === a) b = HIDEOUT;
  const reward = 150 + Math.floor(Math.random() * 3) * 100;
  G.sideJob = { from: a, to: b, reward, timer: 90 };
  G.objective = `Courier run: deliver the package to ${b.label} ($${reward})`;
  G.objectiveTarget = b;
  api.banner('Courier run', `Deliver to ${b.label} — $${reward}`);
}
