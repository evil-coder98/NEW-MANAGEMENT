/* =========================================================
   NEW MANAGEMENT — FACILITY SIMULATION
   Employees use a waypoint graph and continuous movement.
   ========================================================= */
const $=id=>document.getElementById(id);
const state={
  phase:"intro",shift:0,money:CONFIG.startingMoney,energy:0,quota:CONFIG.startingQuota,
  seconds:CONFIG.shiftDurationSeconds,selectedCrate:null,crates:[],employees:[],abnormalities:[],
  floors:1,selectedEntity:null,interval:null,raf:null,lastFrame:0,breachCount:0,gameOver:false,
  usedEmployeeNames:new Set(),usedAbnormalityNames:new Set(),logs:["SYSTEM INITIALISED."],
  applications:[],inventory:{"EGO Weapons":[],"EGO Gear":[],"ARMORS":[],"EGO Gifts":[]},corpses:[],activeInventoryTab:"EGO Weapons",
  firstShiftPending:true
};

function uniqueEmployeeName(){
  for(let i=0;i<500;i++){const n=`${UTIL.pick(CONFIG.employeeFirstNames)} ${UTIL.pick(CONFIG.employeeSurnames)}`;if(!state.usedEmployeeNames.has(n.toLowerCase())){state.usedEmployeeNames.add(n.toLowerCase());return n;}}
  return `Employee-${state.usedEmployeeNames.size+1}`;
}
function uniqueAbnormalityName(){
  for(let i=0;i<1000;i++){const n=`${UTIL.pick(CONFIG.abnormalityNamePartsA)} ${UTIL.pick(CONFIG.abnormalityNamePartsB)} ${UTIL.pick(CONFIG.abnormalityNamePartsC)}`;if(!state.usedAbnormalityNames.has(n)){state.usedAbnormalityNames.add(n);return n;}}
  return `Uncatalogued Entity ${state.usedAbnormalityNames.size+1}`;
}
function uniqueVariantName(base,suffix){let n=`${base} — ${suffix}`,i=2;while(state.usedAbnormalityNames.has(n))n=`${base} — ${suffix} ${i++}`;state.usedAbnormalityNames.add(n);return n;}
function createEmployee(role,name=""){
  const finalName=name.trim()||uniqueEmployeeName();state.usedEmployeeNames.add(finalName.toLowerCase());
  const emoji=UTIL.pick(role==="RESEARCHER"?CONFIG.researcherEmoji:role==="SUPPRESSOR"?CONFIG.suppressorEmoji:CONFIG.janitorEmoji);
  return {id:UTIL.uid(),name:finalName,role,emoji,sin:UTIL.pick(CONFIG.sinNames),hp:UTIL.rand(85,110),maxHp:110,
    sanity:CONFIG.startingEmployeeSanity,maxSanity:CONFIG.employeeSanityMaximum,
    damage:role==="SUPPRESSOR"?UTIL.rand(8,13):role==="JANITOR"?1:2,speed:UTIL.rand(...CONFIG.employeeWalkSpeed),
    floor:1,armour:0,armourId:null,weapon:0,weaponId:null,gearId:null,giftId:null,
    status:"IDLE",task:null,target:null,alive:true,node:"main",x:50,y:37,path:[],pathIndex:0,
    workTimer:0,nextWanderAt:0,el:null,preferredExerciseCount:{}};
}
function createApplication(){
  const role=UTIL.pick(CONFIG.employeeRoles),e=createEmployee(role);
  return {id:UTIL.uid(),employee:e};
}

function createAbnormality(cls){
  const t=CONFIG.classTemplates[cls],hp=UTIL.rand(...t.hp);
  const likes=UTIL.shuffle(CONFIG.exerciseNames).slice(0,UTIL.rand(1,2));
  const sinLikes=UTIL.shuffle(CONFIG.sinNames).slice(0,UTIL.rand(1,2));
  const sinDislikes=UTIL.shuffle(CONFIG.sinNames.filter(s=>!sinLikes.includes(s))).slice(0,UTIL.rand(1,2));
  const dislikes=UTIL.shuffle(CONFIG.exerciseNames.filter(x=>!likes.includes(x))).slice(0,UTIL.rand(1,2));
  const abnormality={id:UTIL.uid(),name:uniqueAbnormalityName(),class:cls,emoji:UTIL.pick(["👁️","🪞","🕯️","🫀","🎭","🪆","🦴","🕷️","🫥","🪬","🐦‍⬛","🔔"]),
    maxHp:hp,hp,speed:Number((Math.random()*(t.speed[1]-t.speed[0])+t.speed[0]).toFixed(1)),
    energyPerMinute:UTIL.rand(...t.energy),breachable:t.breachable,damage:UTIL.rand(...t.damage),
    sanity:cls===1?null:25,maxSanity:100,likes,dislikes,sinLikes,sinDislikes,interactionSanityLoss:UTIL.rand(...t.sanityLoss),
    containmentMultiplier:1,description:`A newly catalogued Class ${cls} entity. Its behaviour has not yet been fully understood.`,
    breached:false,room:null,floor:1,side:"left",work:null,energy:0,energyRate:0,idleDrain:t.idleDrain,exerciseGain:t.exerciseGain,exerciseLoss:t.exerciseLoss,
    quirks:cls>=3?UTIL.shuffle(CONFIG.egoQuirks).slice(0,(Math.random()<(cls===5?.72:cls===4?.48:.25)?1:0)+(cls===5&&Math.random()<.18?1:0)):[],
    egoClaimed:false,giftClaimed:false,giftProgress:{}};
  const replication=abnormality.quirks.find(q=>q.id==="exercise-duplicate");
  if(replication)replication.triggerExercise=UTIL.pick(CONFIG.exerciseNames);
  return abnormality;
}
function addLog(message){state.logs.unshift(message);state.logs=state.logs.slice(0,30);if($("shift-message"))$("shift-message").textContent=message.toUpperCase();}
function showToast(message){const t=$("toast");t.textContent=message;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),1900);}
function showScreen(id){["intro-screen","start-screen","offtime-screen","shift-screen"].forEach(x=>$(x).classList.add("hidden"));$(id).classList.remove("hidden");}
function formatTime(s){s=Math.max(0,Math.floor(s));return `${Math.floor(s/60).toString().padStart(2,"0")}:${(s%60).toString().padStart(2,"0")}`;}
function updateHeader(){
  $("phase-label").textContent=state.phase.toUpperCase();$("shift-label").textContent=`SHIFT ${state.shift}`;
  $("money-label").textContent=`$${Math.floor(state.money)}`;$("quota-label").textContent=`ENERGY ${Math.floor(state.energy)} / ${state.quota}`;
  $("timer-label").textContent=state.phase==="shift"?formatTime(state.seconds):"--:--";
}
function startGame(){
  state.phase="shift";state.shift=1;state.firstShiftPending=false;state.money=CONFIG.startingMoney;
  state.employees=[createEmployee("RESEARCHER"),createEmployee("RESEARCHER"),createEmployee("SUPPRESSOR")];
  state.inventory={"EGO Weapons":[],"EGO Gear":[],"ARMORS":[],"EGO Gifts":[]};state.corpses=[];
  const first=structuredClone(CONFIG.startingAbnormality);first.id="one-sin";first.floor=1;first.side="left";first.room=0;first.sanity=null;first.dislikes=[];first.breached=false;first.work=null;first.energy=0;first.energyRate=0;
  state.abnormalities=[first];state.usedAbnormalityNames.add(first.name);state.floors=1;
  state.energy=0;state.quota=CONFIG.startingQuota;state.seconds=CONFIG.shiftDurationSeconds;
  AudioManager.play("neutral");showScreen("shift-screen");renderFacility();updateShiftUI();startSimulation();addLog("SHIFT 1 COMMENCED. INITIAL CONTAINMENT: ONE SIN, ONE HUNDRED GOOD DEEDS.");
}
function enterOfftime(){
  state.phase="offtime";const wages=state.employees.filter(e=>e.alive).length*CONFIG.employeeWage;state.money-=wages;
  if(state.money<=0){lose("INSUFFICIENT FUNDS. THE FACILITY HAS BEEN PLACED INTO RECEIVERSHIP.");return;}
  state.employees.filter(e=>e.alive).forEach(e=>e.sanity=UTIL.clamp(e.sanity+5,0,50));
  state.selectedCrate=null;state.crates=[1,2,3].map(()=>({id:UTIL.uid(),class:UTIL.rand(1,5),abnormality:null}));
  state.applications=Array.from({length:4},createApplication);
  state.abnormalities.forEach(a=>{a.work=null;a.breached=false;a.hp=a.maxHp;a.energy=0;a.energyRate=0;if(a.class!==1)a.sanity=25;});
  renderOfftime();showScreen("offtime-screen");updateHeader();
}
function renderOfftime(){
  $("offtime-money").textContent=`$${Math.floor(state.money)}`;$("employee-count").textContent=state.employees.filter(e=>e.alive).length;
  $("wages").textContent=`$${state.employees.filter(e=>e.alive).length*CONFIG.employeeWage}`;
  $("staff-list").innerHTML=state.employees.map(e=>`<div class="staff-item"><span>${e.emoji} ${escapeHtml(e.name)} <span class="muted">${e.role}</span></span><span>${e.sin} · ${e.hp} HP · ${e.sanity} SAN</span></div>`).join("");
  $("application-list").innerHTML=state.applications.map(app=>{const e=app.employee;return `<div class="application-card"><div><strong>${e.emoji} ${escapeHtml(e.name)} — ${e.role}</strong><small>${e.sin} affinity · ${e.hp} HP · ${e.sanity} SAN · ${e.speed} speed · ${e.damage} damage</small></div><button data-hire="${app.id}">HIRE $100</button></div>`}).join("");
  document.querySelectorAll("[data-hire]").forEach(b=>b.onclick=()=>hireEmployee(b.dataset.hire));
  $("crate-list").innerHTML=state.crates.map((c,i)=>`<button class="crate ${state.selectedCrate===c.id?"selected":""}" data-crate="${c.id}" style="--class-color:${CONFIG.classColors[c.class]}"><span class="crate-label">SEALED SHIPMENT / ${String(i+1).padStart(2,"0")}</span><span class="seal">▣</span><span class="class-name">CLASS ${c.class}</span><span class="crate-label">CONTENTS UNKNOWN</span></button>`).join("");
  document.querySelectorAll("[data-crate]").forEach(b=>b.addEventListener("click",()=>selectCrate(b.dataset.crate)));
  $("begin-shift-button").disabled=!state.selectedCrate;$("crate-status").textContent=state.selectedCrate?"SHIPMENT SELECTED — CONFIRM TO PROCEED":"AWAITING SELECTION";
  renderInventory();
}
function hireEmployee(applicationId){
  if(state.money<CONFIG.employeeHireCost){showToast("INSUFFICIENT FUNDS.");return;}
  const index=state.applications.findIndex(a=>a.id===applicationId);if(index<0)return;
  const app=state.applications.splice(index,1)[0],e=app.employee;state.money-=CONFIG.employeeHireCost;
  e.floor=1;e.node="main";e.x=50;e.y=37;e.status="IDLE";state.employees.push(e);
  renderOfftime();updateHeader();showToast(`${e.name.toUpperCase()} HIRED AS ${e.role}.`);
}
function renderInventory(){
  document.querySelectorAll(".inventory-tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===state.activeInventoryTab));
  const category=state.activeInventoryTab,items=state.inventory[category]||[];
  let rows=[];
  if(category==="ARMORS"){
    rows=CONFIG.armourShop.map(shop=>`<div class="inventory-item"><span><b>${escapeHtml(shop.name)}</b><small>${escapeHtml(shop.description)} · +${shop.hp} HP</small></span><button data-buyarmor="${shop.id}">BUY $${shop.price}</button></div>`);
    rows.push(...items.map(item=>{const owner=item.ownerId?state.employees.find(e=>e.id===item.ownerId):null;return `<div class="inventory-item"><span><b>${escapeHtml(item.name)}</b><small>Owned · +${item.hp} HP</small></span>${owner?`<small>EQUIPPED: ${escapeHtml(owner.name)}</small>`:`<button data-equip="${item.id}">EQUIP</button>`}</div>`;}));
  }else{
    rows=items.map(item=>{
      const owner=item.ownerId?state.employees.find(e=>e.id===item.ownerId):null;
      const action=category==="EGO Gifts"?`<small>BOUND TO ${escapeHtml(item.boundName||owner?.name||"RECIPIENT")}</small>`:owner?`<small>EQUIPPED: ${escapeHtml(owner.name)}</small>`:`<button data-equip="${item.id}">EQUIP</button>`;
      return `<div class="inventory-item"><span><b>${escapeHtml(item.name)}</b><small>${escapeHtml(item.description||"")}</small></span>${action}</div>`;
    });
  }
  $("inventory-list").innerHTML=rows.length?rows.join(""):"<div class='muted small'>NO ITEMS IN THIS CATEGORY.</div>";
  document.querySelectorAll("[data-buyarmor]").forEach(b=>b.onclick=()=>buyArmour(b.dataset.buyarmor));
  document.querySelectorAll("[data-equip]").forEach(b=>b.onclick=()=>chooseEquipmentRecipient(b.dataset.equip));
}

function buyArmour(armourId){const a=CONFIG.armourShop.find(x=>x.id===armourId);if(!a||state.money<a.price){showToast("INSUFFICIENT FUNDS.");return;}state.money-=a.price;state.inventory.ARMORS.push({...a,id:UTIL.uid(),ownerId:null});renderOfftime();updateHeader();}
function chooseEquipmentRecipient(itemId){
  const category=state.activeInventoryTab,item=state.inventory[category].find(x=>x.id===itemId);if(!item)return;
  const staff=state.employees.filter(e=>e.alive&&(category!=="EGO Weapons"||e.role==="SUPPRESSOR"));
  if(!staff.length){showToast("NO ELIGIBLE SUPPRESSORS AVAILABLE.");return;}
  showModal(`<h2>EQUIP ${escapeHtml(item.name)}</h2><p>Select one employee. Each equipment slot accepts one item.</p><div class="action-stack">${staff.map(e=>`<button data-recipient="${e.id}">${e.emoji} ${escapeHtml(e.name)} — ${e.role}</button>`).join("")}</div>`);
  $("modal-content").querySelectorAll("[data-recipient]").forEach(b=>b.onclick=()=>{
    const e=state.employees.find(x=>x.id===b.dataset.recipient);if(!e)return;
    if(category==="ARMORS"){
      const old=e.armourId?state.inventory.ARMORS.find(x=>x.id===e.armourId):null;
      if(old){old.ownerId=null;e.maxHp-=old.hp;e.hp=Math.min(e.hp,e.maxHp);e.armour=Math.max(0,e.armour-old.hp);}
      e.armourId=item.id;e.armour+=item.hp;e.maxHp+=item.hp;e.hp+=item.hp;item.ownerId=e.id;
    }else if(category==="EGO Weapons"){
      const old=e.weaponId?state.inventory["EGO Weapons"].find(x=>x.id===e.weaponId):null;
      if(old){old.ownerId=null;e.damage=Math.max(1,Math.round(e.damage/(old.damageMultiplier||1)));}
      e.weaponId=item.id;e.damage=Math.round(e.damage*(item.damageMultiplier||1));item.ownerId=e.id;
    }else if(category==="EGO Gear"){
      const old=e.gearId?state.inventory["EGO Gear"].find(x=>x.id===e.gearId):null;
      if(old){old.ownerId=null;e.maxHp-=old.hpBonus||0;e.hp=Math.min(e.hp,e.maxHp);e.armour=Math.max(0,e.armour-(old.armourBonus||0));}
      e.gearId=item.id;e.maxHp+=item.hpBonus||0;e.hp+=item.hpBonus||0;e.armour+=item.armourBonus||0;item.ownerId=e.id;
    }
    closeModal();renderInventory();showToast(`${item.name.toUpperCase()} EQUIPPED.`);
  });
}

function selectCrate(id){if(state.selectedCrate)return;const c=state.crates.find(x=>x.id===id);if(!c)return;state.selectedCrate=id;c.abnormality=createAbnormality(c.class);renderOfftime();}
function beginShift(){
  if(state.firstShiftPending)return;
  const crate=state.crates.find(c=>c.id===state.selectedCrate);if(!crate)return;
  state.abnormalities.push(crate.abnormality);state.shift++;state.energy=0;state.quota=CONFIG.startingQuota+(state.shift-1)*CONFIG.quotaPerShift;
  state.seconds=CONFIG.shiftDurationSeconds;state.floors=Math.max(1,Math.ceil(state.abnormalities.length/2));
  state.abnormalities.forEach((a,i)=>{a.room=i;a.floor=Math.floor(i/2)+1;a.side=i%2===0?"left":"right";a.energy=0;a.energyRate=0;a.work=null;a.breached=false;if(a.class!==1)a.sanity=25;});
  state.employees.filter(e=>e.alive).forEach(e=>{e.status="IDLE";e.task=null;e.target=null;e.workTimer=0;e.floor=Math.min(e.floor,state.floors);e.node="main";e.x=50;e.y=37;e.path=[];});
  state.breachCount=0;state.phase="shift";showScreen("shift-screen");renderFacility();updateShiftUI();AudioManager.play("neutral");startSimulation();addLog(`SHIFT ${state.shift} COMMENCED.`);
}

/* Facility waypoint graph. Coordinates are percentages of the floor layout. */
const NODES={
  main:{x:50,y:37,links:["mainDoorL","mainDoorR","stairs"]},
  mainDoorL:{x:34,y:54,links:["main","hallL"]},
  hallL:{x:17,y:54,links:["mainDoorL","hallLTop"]},
  hallLTop:{x:17,y:33,links:["hallL","roomL"]},
  roomL:{x:17,y:17,links:["hallLTop"]},
  mainDoorR:{x:66,y:54,links:["main","hallR"]},
  hallR:{x:83,y:54,links:["mainDoorR","hallRTop"]},
  hallRTop:{x:83,y:33,links:["hallR","roomR"]},
  roomR:{x:83,y:17,links:["hallRTop"]},
  stairs:{x:50,y:91,links:["main"]}
};
function shortestPath(from,to){
  if(from===to)return [];const queue=[[from]],seen=new Set([from]);
  while(queue.length){const path=queue.shift(),last=path[path.length-1];for(const next of NODES[last]?.links||[]){if(seen.has(next))continue;const p=[...path,next];if(next===to)return p;seen.add(next);queue.push(p);}}
  return [to];
}
function targetNode(a){return a.side==="left"?"roomL":"roomR";}
function floorElement(f){return document.querySelector(`.floor[data-floor="${f}"] .floor-layout`);}
function renderFacility(){
  const world=$("facility-world");world.innerHTML="";
  for(let f=1;f<=state.floors;f++){
    const floor=document.createElement("section");floor.className="floor";floor.dataset.floor=f;
    const left=state.abnormalities.find(a=>a.floor===f&&a.side==="left"),right=state.abnormalities.find(a=>a.floor===f&&a.side==="right");
    floor.innerHTML=`<div class="floor-label">FACILITY LEVEL ${f.toString().padStart(2,"0")}</div><div class="floor-layout">
      <div class="containment left">${left?roomMarkup(left):'<div class="room-empty">NO CONTAINMENT</div>'}</div>
      <div class="containment right">${right?roomMarkup(right):'<div class="room-empty">NO CONTAINMENT</div>'}</div>
      <div class="hall left"><span class="hall-label">HALL 1</span></div><div class="hall right"><span class="hall-label">HALL 2</span></div>
      <div class="main-room"><strong>MAIN ROOM</strong><span class="muted">PERSONNEL HUB</span></div>
      <div class="floor-link">${f===1?"DESCEND TO LOWER LEVEL":"ACCESS UPPER LEVEL"}<br>⇅</div>
      <div class="employee-layer"></div></div>`;
    world.appendChild(floor);
  }
  world.querySelectorAll("[data-abno]").forEach(el=>el.addEventListener("click",()=>openAbnormality(el.dataset.abno)));
  world.querySelectorAll("[data-worker]").forEach(el=>el.addEventListener("click",()=>openEmployee(el.dataset.worker)));
  state.employees.filter(e=>e.alive).forEach(createEmployeeSprite);renderCorpses();updateFacilityUI();
}
function roomMarkup(a){
  const sanity=a.class===1?"???":`${Math.round(UTIL.clamp(UTIL.finite(a.sanity,25),0,100))}`;
  return `<div class="room" data-abno="${a.id}" style="--class-color:${CONFIG.classColors[a.class]}"><div class="room-name">${escapeHtml(a.name)}</div><div class="room-emoji">${a.breached?"🚨":a.emoji}</div><div class="room-bottom"><span class="sanity">${sanity}</span><span class="energy"><i id="energybar-${a.id}" style="width:0%"></i></span></div><div class="room-meter"><span id="rate-${a.id}">0 / 1500 E/MIN</span><span id="worktimer-${a.id}"></span></div></div>`;
}
function updateFacilityUI(){
  for(const a of state.abnormalities){
    const bar=$(`energybar-${a.id}`),rate=$(`rate-${a.id}`),timer=$(`worktimer-${a.id}`),room=document.querySelector(`[data-abno="${a.id}"]`);
    const epm=UTIL.clamp(UTIL.finite(a.energyRate),0,CONFIG.maxEnergyPerMinute);
    if(bar)bar.style.width=`${epm/CONFIG.maxEnergyPerMinute*100}%`;
    if(rate)rate.textContent=`${Math.round(epm)} / 1500 E/MIN`;
    if(timer)timer.textContent=a.work?`EXERCISE ${Math.ceil(UTIL.clamp(UTIL.finite(a.work.remaining),0,CONFIG.exerciseDurationSeconds))}s`:a.breached?"BREACHED":"";
    if(room){const sanity=room.querySelector(".sanity");if(sanity)sanity.textContent=a.class===1?"???":Math.round(UTIL.clamp(UTIL.finite(a.sanity,25),0,100));const emoji=room.querySelector(".room-emoji");if(emoji)emoji.textContent=a.breached?"🚨":a.emoji;}
  }
}
function updateShiftUI(){
  $("shift-number").textContent=state.shift;$("quota-copy").textContent=`${Math.floor(state.energy)} / ${state.quota}`;
  $("quota-fill").style.width=`${Math.min(100,state.energy/state.quota*100)}%`;updateHeader();updateFacilityUI();
}
function createEmployeeSprite(e){
  const layout=floorElement(e.floor);if(!layout)return;
  const layer=layout.querySelector(".employee-layer");if(!layer)return;
  const el=document.createElement("button");el.className=`employee-sprite ${e.role.toLowerCase()}`;el.type="button";el.textContent=e.emoji;el.title=`${e.name} — ${e.role}`;el.dataset.worker=e.id;
  layer.appendChild(el);e.el=el;positionEmployee(e);
}
function renderCorpses(){
  document.querySelectorAll(".corpse-sprite").forEach(el=>el.remove());
  for(const c of state.corpses){const layout=floorElement(c.floor);const layer=layout?.querySelector(".employee-layer");if(!layer)continue;const el=document.createElement("span");el.className="corpse-sprite";el.textContent="☠";el.style.left=`${c.x}%`;el.style.top=`${c.y}%`;el.title="Uncleaned employee remains";layer.appendChild(el);}
}
function positionEmployee(e){if(e.el){e.el.style.left=`${e.x}%`;e.el.style.top=`${e.y}%`;e.el.classList.toggle("moving",e.status==="WALKING");}}
function nearestWaypoint(e){
  const layout=floorElement(e.floor),rect=layout?.getBoundingClientRect();
  let nearest=e.node,best=Infinity;
  for(const [name,n] of Object.entries(NODES)){
    if(name==="stairs")continue;
    const dx=(n.x-e.x)*(rect?.width||1)/100,dy=(n.y-e.y)*(rect?.height||1)/100;
    const d=dx*dx+dy*dy;if(d<best){best=d;nearest=name;}
  }
  return nearest;
}
function moveToNode(e,node,task=null,target=null){
  const wasWalking=e.status==="WALKING";
  if(wasWalking)e.node=nearestWaypoint(e);
  e.path=shortestPath(e.node,node);
  if(e.node===node){const n=NODES[node],dx=n.x-e.x,dy=n.y-e.y;if(Math.hypot(dx,dy)>.5)e.path=[node];}
  e.pathIndex=0;e.status="WALKING";e.task=task;e.target=target;e.nextWanderAt=0;positionEmployee(e);
  if(e.path.length===0)arriveAtDestination(e);
}
function arriveAtDestination(e){
  if(e.task==="CLEAN"){
    const corpse=state.corpses.find(c=>c.id===e.target);if(corpse){state.corpses=state.corpses.filter(c=>c.id!==corpse.id);addLog(`${e.name} CLEANED AN EMPLOYEE REMAINS.`);renderCorpses();}
    e.status="IDLE";e.task=null;e.target=null;e.nextWanderAt=performance.now()/1000+3;return;
  }
  if(e.task==="EXERCISE"){
    const a=state.abnormalities.find(x=>x.id===e.target);if(!a||a.breached){sendEmployeeHome(e);return;}
    a.work={employeeId:e.id,exercise:e.exercise,remaining:CONFIG.exerciseDurationSeconds};e.status="WORKING";e.path=[];addLog(`${e.name} BEGAN ${e.exercise} WITH ${a.name}.`);
  }else if(e.task==="SUPPRESS"){
    const a=state.abnormalities.find(x=>x.id===e.target);if(!a||!a.breached){sendEmployeeHome(e);return;}e.status="SUPPRESSING";e.path=[];addLog(`${e.name} ENGAGED ${a.name}.`);
  }else{e.status="IDLE";e.task=null;e.target=null;e.nextWanderAt=performance.now()/1000+UTIL.rand(2,6);}
}
function sendEmployeeHome(e){e.task=null;e.target=null;moveToNode(e,"main",null,null);}
function updateMovement(dt){
  for(const e of state.employees){if(!e.alive)continue;
    if(e.status==="IDLE"&&e.role==="JANITOR"){
      const corpse=state.corpses.find(c=>c.floor===e.floor&&!c.cleaning);
      if(corpse){corpse.cleaning=true;moveToNode(e,corpse.node||"main","CLEAN",corpse.id);continue;}
    }
    if(e.status==="IDLE"&&performance.now()/1000>=e.nextWanderAt){const options=["main","hallL","hallR"].filter(n=>n!==e.node);moveToNode(e,UTIL.pick(options));}
    if(e.status!=="WALKING"||!e.path.length)continue;
    const nextName=e.path[e.pathIndex],target=NODES[nextName];if(!target){e.status="IDLE";continue;}
    const layout=floorElement(e.floor);const rect=layout?.getBoundingClientRect();if(!rect)continue;
    const dx=(target.x-e.x)*rect.width/100,dy=(target.y-e.y)*rect.height/100,dist=Math.hypot(dx,dy),step=e.speed*dt;
    if(dist<=step||dist<1){e.x=target.x;e.y=target.y;e.node=nextName;e.pathIndex++;if(e.pathIndex>=e.path.length)arriveAtDestination(e);}
    else{const ratio=step/dist;e.x+=dx*ratio*100/rect.width;e.y+=dy*ratio*100/rect.height;}
    positionEmployee(e);
  }
}
function frame(now){if(state.phase!=="shift")return;const dt=Math.min(.05,(now-state.lastFrame)/1000||0);state.lastFrame=now;updateMovement(dt);state.raf=requestAnimationFrame(frame);}
function startSimulation(){clearInterval(state.interval);cancelAnimationFrame(state.raf);state.lastFrame=performance.now();state.raf=requestAnimationFrame(frame);state.interval=setInterval(tick,1000);}

function tick(){
  if(state.phase!=="shift")return;state.seconds=Math.max(0,state.seconds-1);
  for(const e of state.employees.filter(x=>x.alive)){
    if(e.role==="SUPPRESSOR")e.sanity=UTIL.clamp(e.sanity+0.1,0,50);
    if(e.role==="RESEARCHER"&&state.corpses.some(c=>c.floor===e.floor&&Math.hypot(c.x-e.x,c.y-e.y)<24))e.sanity=Math.max(0,e.sanity-1);
    if(e.sanity<=0)killEmployee(e,"SANITY COLLAPSE");
  }
  for(const a of state.abnormalities){
    if(a.breached){
      a.energyRate=0;
      if(a.quirks?.some(q=>q.id==="regenerator"))a.hp=Math.min(a.maxHp,a.hp+Math.max(1,a.maxHp*.002));
      if(a.quirks?.some(q=>q.id==="panic-aura"))state.employees.filter(e=>e.alive&&e.role==="RESEARCHER"&&e.floor===a.floor).forEach(e=>{e.sanity=Math.max(0,e.sanity-.15);if(e.sanity<=0)killEmployee(e,"CONTAGIOUS DREAD");});
      continue;
    }
    const worker=a.work?state.employees.find(e=>e.id===a.work.employeeId&&e.alive):null;
    if(a.work&&!worker)a.work=null;
    if(a.class===1)a.sanity=null;
    if(worker){
      const liked=a.likes.includes(a.work.exercise),disliked=a.dislikes.includes(a.work.exercise);
      if(a.class!==1){
        const sinLike=a.sinLikes.includes(worker.sin),sinHate=a.sinDislikes.includes(worker.sin);
        let delta=liked?a.exerciseGain:disliked?-a.exerciseLoss:-(a.exerciseLoss*.35);
        if(sinLike)delta*=a.containmentMultiplier;if(sinHate)delta-=.5;
        a.sanity=UTIL.clamp(UTIL.finite(a.sanity,25)+delta,0,100);
      }
      a.work.remaining=Math.max(0,a.work.remaining-1);
      if(a.work.remaining<=0)finishExercise(a,worker,liked,disliked);
      if(a.class!==1&&a.sanity<=0&&a.breachable)breach(a);
    }else if(a.class!==1){
      const drain=a.idleDrain*(a.quirks?.some(q=>q.id==="fast-decay")?2:1);
      a.sanity=UTIL.clamp(UTIL.finite(a.sanity,25)-drain,0,100);
      if(a.sanity<=0&&a.breachable)breach(a);
    }
    if(a.breached){a.energyRate=0;continue;}
    const sanityFactor=a.class===1?1:UTIL.clamp(UTIL.finite(a.sanity)/100,.05,1);
    const working=!!a.work;const workFactor=working?(a.likes.includes(a.work.exercise)?1.35:.45):.65;
    a.energyRate=UTIL.clamp(UTIL.finite(a.energyPerMinute)*sanityFactor*workFactor,0,CONFIG.maxEnergyPerMinute);
    state.energy+=a.energyRate/60;
  }
  for(const a of state.abnormalities.filter(x=>x.breached)){
    a.attackCooldown=Math.max(0,(a.attackCooldown||0)-1);
    if(a.attackCooldown>0)continue;
    const targets=state.employees.filter(e=>e.alive&&e.floor===a.floor);
    if(!targets.length)continue;
    targets.sort((x,y)=>Math.hypot(x.x-(a.side==="left"?17:83),x.y-17)-Math.hypot(y.x-(a.side==="left"?17:83),y.y-17));
    const victim=targets[0],psychic=a.quirks?.some(q=>q.id==="sp-damage"),pierce=a.quirks?.some(q=>q.id==="armour-pierce");
    const raw=a.damage,amount=raw*(pierce?1:Math.max(.25,1-victim.armour/100));
    if(psychic)victim.sanity=Math.max(0,victim.sanity-amount);else victim.hp=Math.max(0,victim.hp-amount);
    victim.sanity=Math.max(0,victim.sanity-1);
    addLog(`${a.name} ATTACKED ${victim.name}${psychic?"'S SANITY":""}.`);
    if(victim.hp<=0||victim.sanity<=0){
      killEmployee(victim,`${a.name} KILLED THEM`,a);
      if(a.quirks?.some(q=>q.id==="adaptive-kill")){const next=UTIL.pick(CONFIG.egoQuirks.filter(q=>!a.quirks.some(old=>old.id===q.id)));if(next){a.quirks.push({...next});addLog(`${a.name} GAINED A NEW QUIRK: ${next.name}.`);}}
    }
    a.attackCooldown=3;
  }
  for(const e of state.employees.filter(x=>x.alive&&x.status==="SUPPRESSING"&&x.target)){
    const a=state.abnormalities.find(x=>x.id===e.target);if(!a||!a.breached){sendEmployeeHome(e);continue;}
    a.hp=Math.max(0,a.hp-e.damage);if(a.hp<=0)suppress(a);
    else if(Math.random()<.08){
      const psychic=a.quirks?.some(q=>q.id==="sp-damage"),raw=a.damage*.35;
      const pierce=a.quirks?.some(q=>q.id==="armour-pierce");
      const mitigated=raw*(pierce?1:Math.max(.25,1-e.armour/100));
      if(psychic)e.sanity=Math.max(0,e.sanity-mitigated);else e.hp=Math.max(0,e.hp-mitigated);
      e.sanity=Math.max(0,e.sanity-1);
      if(e.hp<=0||e.sanity<=0)killEmployee(e,"SUPPRESSION CASUALTY");
    }
  }
  if(state.seconds<=0){if(state.energy>=state.quota)completeShift();else lose("SHIFT TIME EXPIRED. ENERGY QUOTA NOT MET.");return;}
  if(state.employees.filter(e=>e.alive).length===0){lose("ALL PERSONNEL LOST.");return;}
  if(state.money<=0){lose("INSUFFICIENT FUNDS.");return;}
  updateShiftUI();
}
function finishExercise(a,e,liked,disliked){
  const performedExercise=a.work?.exercise;
  a.work=null;e.status="IDLE";e.target=null;e.task=null;e.nextWanderAt=performance.now()/1000+2;
  if(a.class===1){e.sanity=25;}
  else if(liked){e.sanity=UTIL.clamp(e.sanity+5,0,50);}
  else if(a.class>=4&&disliked){e.sanity=Math.max(0,e.sanity-a.interactionSanityLoss);if(e.sanity<=0)killEmployee(e,`${a.name} REJECTED THE EMPLOYEE`);}
  if(a.sinLikes.includes(e.sin)&&liked){e.preferredExerciseCount[a.id]=(e.preferredExerciseCount[a.id]||0)+1;if(e.preferredExerciseCount[a.id]>=3&&!a.giftClaimed){grantEgoGift(a,e);}}
  const replicationQuirk=a.quirks?.find(q=>q.id==="exercise-duplicate");
  if(replicationQuirk&&performedExercise===replicationQuirk.triggerExercise){const clone=createAbnormality(a.class);clone.name=uniqueVariantName(a.name,"ECHO");clone.floor=a.floor;clone.side=a.side;clone.breached=true;clone.sanity=0;clone.hp=clone.maxHp;clone.quirks=[];clone.isDuplicate=true;state.abnormalities.push(clone);state.floors=Math.max(state.floors,clone.floor);addLog(`${a.name} DUPLICATED. ITS ECHO HAS BREACHED.`);renderFacility();}
  addLog(`${e.name} COMPLETED EXERCISE WITH ${a.name}.`);
}
function makeEgoItems(a){
  const tier=a.class;
  const weapon={id:UTIL.uid(),name:`${a.name} — EGO Weapon`,sourceId:a.id,description:`Class ${tier} weapon · ${1+tier*.12}x damage`,damageMultiplier:1+tier*.12,ownerId:null};
  const gear={id:UTIL.uid(),name:`${a.name} — EGO Suit`,sourceId:a.id,description:`Class ${tier} suit · +${tier*18} HP · +${tier*3} protection`,hpBonus:tier*18,armourBonus:tier*3,ownerId:null};
  return {weapon,gear};
}
function grantEgoGift(a,e){
  if(a.giftClaimed)return;a.giftClaimed=true;const gift={id:UTIL.uid(),name:`${a.name} — EGO Gift`,sourceId:a.id,description:`Exclusive gift for ${e.name}. Grants ${1+a.class*.1}x damage and ${a.class*5} maximum HP.`,damageMultiplier:1+a.class*.1,hpBonus:a.class*5,ownerId:e.id,boundName:e.name};
  state.inventory["EGO Gifts"].push(gift);e.giftId=gift.id;e.maxHp+=gift.hpBonus;e.hp+=gift.hpBonus;e.damage=Math.round(e.damage*gift.damageMultiplier);
  addLog(`${a.name} BESTOWED AN EGO GIFT UPON ${e.name}.`);showToast(`${e.name.toUpperCase()} RECEIVED AN EGO GIFT.`);
}

function breach(a){if(a.breached||!a.breachable)return;a.breached=true;a.work=null;a.energyRate=0;a.attackCooldown=2;state.breachCount++;
  addLog(`CLASS ${a.class} BREACH: ${a.name}`);
  state.employees.filter(e=>e.alive&&e.role==="RESEARCHER").forEach(e=>e.sanity=Math.max(0,e.sanity-10));
  state.employees.filter(e=>e.alive&&e.role==="RESEARCHER"&&e.sanity<=0).forEach(e=>killEmployee(e,"SANITY COLLAPSE"));AudioManager.effect("breach");AudioManager.setPanic(state.breachCount>=3?3:state.breachCount>=2?2:1);
  showToast(`${a.name.toUpperCase()} HAS BREACHED.`);state.employees.filter(e=>e.alive&&e.status==="WORKING"&&e.target===a.id).forEach(sendEmployeeHome);updateFacilityUI();
}
function suppress(a){a.breached=false;a.hp=a.maxHp;a.sanity=a.class===1?null:25;a.work=null;a.energyRate=0;
  state.employees.filter(e=>e.target===a.id).forEach(e=>{e.sanity=UTIL.clamp(e.sanity+10,0,50);sendEmployeeHome(e);});state.breachCount=Math.max(0,state.breachCount-1);
  addLog(`${a.name} SUPPRESSED. CONTAINMENT RESTORED.`);AudioManager.setPanic(state.breachCount>=3?3:state.breachCount>=2?2:state.breachCount>=1?1:0);closeDetail();showToast("ABNORMALITY SUPPRESSED.");updateFacilityUI();
}
function killEmployee(e,reason,killerAbnormality=null){if(!e.alive)return;
  if(e.task==="CLEAN"){const pending=state.corpses.find(c=>c.id===e.target);if(pending)pending.cleaning=false;}
  state.corpses.push({id:UTIL.uid(),floor:e.floor,x:e.x,y:e.y,node:e.node||"main",cleaning:false});
  e.alive=false;e.hp=0;e.status="DEAD";e.target=null;e.el?.remove();
  if(e.giftId){state.inventory["EGO Gifts"]=state.inventory["EGO Gifts"].filter(g=>g.id!==e.giftId);e.giftId=null;}
  for(const category of ["EGO Weapons","EGO Gear","ARMORS"]){for(const item of state.inventory[category])if(item.ownerId===e.id)item.ownerId=null;}
  state.money-=CONFIG.employeeDeathFee;addLog(`${e.name} LOST: ${reason}. $${CONFIG.employeeDeathFee} FEE.`);AudioManager.effect("death");renderCorpses();
  if(killerAbnormality?.quirks?.some(q=>q.id==="kill-duplicate")){
    const clone=createAbnormality(killerAbnormality.class);clone.name=uniqueVariantName(killerAbnormality.name,"AFTERIMAGE");clone.floor=killerAbnormality.floor;clone.side=killerAbnormality.side;clone.breached=true;clone.sanity=0;clone.isDuplicate=true;clone.quirks=[];state.abnormalities.push(clone);state.floors=Math.max(state.floors,Math.ceil(state.abnormalities.length/2));addLog(`${killerAbnormality.name} LEFT AN AFTERIMAGE. ANOTHER ENTITY HAS BREACHED.`);renderFacility();
  }
}
function completeShift(){clearInterval(state.interval);cancelAnimationFrame(state.raf);
  const bonus=Math.floor(state.energy*3);state.money+=bonus;state.breachCount=0;AudioManager.setPanic(0);
  showModal(`<div class="eyebrow">OPERATIONS REPORT</div><h2>SHIFT ${state.shift} COMPLETE</h2><p>Energy produced: <strong>${Math.floor(state.energy)}</strong></p><p>Performance bonus: <strong>$${bonus}</strong></p><p>Personnel remaining: <strong>${state.employees.filter(e=>e.alive).length}</strong></p><button class="primary" id="report-continue">CONTINUE TO OFFTIME</button>`);
  $("report-continue").onclick=()=>{closeModal();enterOfftime();};
}
function lose(reason){clearInterval(state.interval);cancelAnimationFrame(state.raf);state.phase="lost";state.gameOver=true;AudioManager.stopMusic();showModal(`<div class="eyebrow">CORPORATE NOTICE</div><h2>EMPLOYMENT TERMINATED</h2><p>${escapeHtml(reason)}</p><p>Final shift: ${state.shift}</p><button class="primary" onclick="location.reload()">RESTART FACILITY</button>`);}
function openAbnormality(id){
  const a=state.abnormalities.find(x=>x.id===id);if(!a)return;state.selectedEntity=id;
  const sanity=a.class===1?"??? (PERMANENT)":`${Math.round(UTIL.clamp(UTIL.finite(a.sanity,25),0,100))} / 100`;
  $("detail-content").innerHTML=`<div class="eyebrow">ABNORMALITY RECORD / CLASS ${a.class}</div><div class="detail-title">${a.emoji} ${escapeHtml(a.name)}</div><p>${escapeHtml(a.description)}</p>
    <div class="stat-grid"><div class="stat"><span>SANITY</span><strong>${sanity}</strong></div><div class="stat"><span>ENERGY / MIN</span><strong>${Math.round(a.energyRate)} / 1500</strong></div><div class="stat"><span>HEALTH</span><strong>${a.hp} / ${a.maxHp}</strong></div><div class="stat"><span>BREACH DAMAGE</span><strong>${a.damage}</strong></div><div class="stat"><span>MOVEMENT SPEED</span><strong>${a.speed}</strong></div><div class="stat"><span>BREACHABLE</span><strong>${a.breachable?"YES":"NO"}</strong></div></div>
    <p><b>Preferred exercises:</b> ${a.likes.join(", ")}</p><p><b>Disliked exercises:</b> ${a.dislikes.join(", ")}</p><p><b>Favoured sins:</b> ${a.sinLikes.join(", ")}</p><p><b>Disliked sins:</b> ${a.sinDislikes.join(", ")}</p><p><b>Employee interaction penalty:</b> ${a.interactionSanityLoss} sanity per exercise</p><p><b>Quirks:</b> ${a.quirks?.length?a.quirks.map(q=>`${q.name}${q.id==="exercise-duplicate"?` (TRIGGER: ${q.triggerExercise||"UNDISCLOSED"})`:""}: ${q.description}`).join("<br>"):"No known quirks"}</p>
    <div class="action-stack">${a.breached?'<button id="suppress-open">ORDER SUPPRESSION</button>':'<button id="exercise-open">ASSIGN EXERCISE</button><button id="sacrifice-open">SACRIFICE EMPLOYEE</button>'}</div>`;
  $("detail-panel").classList.remove("hidden");
  if(a.breached)$("suppress-open").onclick=()=>chooseEmployee(a.id,"SUPPRESS");
  else{$("exercise-open").onclick=()=>chooseExercise(a.id);$("sacrifice-open").onclick=()=>chooseEmployee(a.id,"SACRIFICE");}
}
function chooseExercise(id){
  const a=state.abnormalities.find(x=>x.id===id);const floor=a.floor;
  const researchers=state.employees.filter(e=>e.alive&&e.role==="RESEARCHER"&&e.floor===floor&&(e.status==="IDLE"||e.status==="WALKING"));
  if(a.work){showToast("AN EMPLOYEE IS ALREADY EXERCISING THIS ABNORMALITY.");return;}
  if(!researchers.length){showToast("NO AVAILABLE RESEARCHERS ON THIS FLOOR.");return;}
  showModal(`<h2>ASSIGN EXERCISE</h2><p>Exercise duration: ${CONFIG.exerciseDurationSeconds} seconds. Select an exercise, then a researcher.</p><div class="action-stack">${CONFIG.exerciseNames.map(x=>`<button data-exercise="${x}">${x}${a.likes.includes(x)?" — PREFERRED":""}</button>`).join("")}</div><div class="action-stack">${researchers.map(e=>`<button data-worker="${e.id}">${e.emoji} ${escapeHtml(e.name)} — ${e.sin}</button>`).join("")}</div>`);
  let exercise=null;document.querySelectorAll("[data-exercise]").forEach(b=>b.onclick=()=>{exercise=b.dataset.exercise;document.querySelectorAll("[data-exercise]").forEach(x=>x.classList.toggle("selected",x===b));});
  $("modal-content").querySelectorAll("[data-worker]").forEach(b=>b.onclick=()=>{if(!exercise){showToast("SELECT AN EXERCISE FIRST.");return;}const e=state.employees.find(x=>x.id===b.dataset.worker);if(!e||!e.alive||!(e.status==="IDLE"||e.status==="WALKING")){showToast("EMPLOYEE IS NO LONGER AVAILABLE.");return;}e.exercise=exercise;moveToNode(e,targetNode(a),"EXERCISE",a.id);closeModal();closeDetail();addLog(`${e.name} DISPATCHED TO ${a.name}.`);});
}
function chooseEmployee(id,mode){
  const a=state.abnormalities.find(x=>x.id===id);const eligible=state.employees.filter(e=>e.alive&&(mode==="SUPPRESS"?e.role==="SUPPRESSOR":true)&&(e.status==="IDLE"||e.status==="WALKING"));
  if(!eligible.length){showToast("NO ELIGIBLE EMPLOYEES.");return;}
  showModal(`<h2>${mode==="SUPPRESS"?"ORDER SUPPRESSION":"SACRIFICE EMPLOYEE"}</h2><p>Select personnel.</p><div class="action-stack">${eligible.map(e=>`<button data-worker="${e.id}">${e.emoji} ${escapeHtml(e.name)} — ${e.role} / ${e.hp} HP / ${e.sin}</button>`).join("")}</div>`);
  $("modal-content").querySelectorAll("[data-worker]").forEach(b=>b.onclick=()=>{const e=state.employees.find(x=>x.id===b.dataset.worker);if(mode==="SUPPRESS"){if(!a.breached){showToast("THE ABNORMALITY IS NOT BREACHED.");return;}moveToNode(e,targetNode(a),"SUPPRESS",id);addLog(`${e.name} ORDERED TO SUPPRESS ${a.name}.`);}else{const eligible=a.class!==1&&a.sanity>50&&!a.egoClaimed;killEmployee(e,"SACRIFICE");if(eligible){a.egoClaimed=true;const items=makeEgoItems(a);state.inventory["EGO Weapons"].push(items.weapon);state.inventory["EGO Gear"].push(items.gear);addLog(`${a.name} YIELDED EGO EQUIPMENT.`);showToast("EGO EQUIPMENT RECOVERED.");}else if(a.class===1){a.sanity=null;}addLog(`${e.name} SACRIFICED TO ${a.name}.`);updateFacilityUI();}closeModal();closeDetail();});
}
function openEmployee(id){const e=state.employees.find(x=>x.id===id);if(!e)return;showModal(`<div class="eyebrow">PERSONNEL RECORD</div><h2>${e.emoji} ${escapeHtml(e.name)}</h2><div class="stat-grid"><div class="stat"><span>ROLE</span><strong>${e.role}</strong></div><div class="stat"><span>SIN AFFINITY</span><strong>${e.sin}</strong></div><div class="stat"><span>HEALTH</span><strong>${Math.ceil(e.hp)} / ${e.maxHp}</strong></div><div class="stat"><span>SANITY</span><strong>${Math.ceil(e.sanity)} / 50</strong></div><div class="stat"><span>MOVE SPEED</span><strong>${e.speed}</strong></div><div class="stat"><span>DAMAGE</span><strong>${e.damage}</strong></div><div class="stat"><span>PROTECTION</span><strong>${e.armour}</strong></div><div class="stat"><span>FLOOR</span><strong>${e.floor}</strong></div></div><p><b>Armour:</b> ${e.armourId?escapeHtml(state.inventory.ARMORS.find(x=>x.id===e.armourId)?.name||"Equipped"):"None"}</p><p><b>EGO Weapon:</b> ${e.weaponId?escapeHtml(state.inventory["EGO Weapons"].find(x=>x.id===e.weaponId)?.name||"Equipped"):"None"}</p><p><b>EGO Gear:</b> ${e.gearId?escapeHtml(state.inventory["EGO Gear"].find(x=>x.id===e.gearId)?.name||"Equipped"):"None"}</p><p><b>EGO Gift:</b> ${e.giftId?escapeHtml(state.inventory["EGO Gifts"].find(x=>x.id===e.giftId)?.name||"Gift"):"None"}</p><p>Current status: ${e.status}</p>`);}
function showInfo(){
  showModal(`<div class="eyebrow">FACILITY STATUS</div><h2>MANAGEMENT RECORD</h2><div class="stat-grid"><div class="stat"><span>SHIFT</span><strong>${state.shift}</strong></div><div class="stat"><span>FUNDS</span><strong>$${Math.floor(state.money)}</strong></div><div class="stat"><span>ENERGY</span><strong>${Math.floor(state.energy)}</strong></div><div class="stat"><span>QUOTA</span><strong>${state.quota}</strong></div><div class="stat"><span>PERSONNEL</span><strong>${state.employees.filter(e=>e.alive).length}</strong></div><div class="stat"><span>ABNORMALITIES</span><strong>${state.abnormalities.length}</strong></div></div><h3>ABNORMALITIES</h3>${state.abnormalities.map(a=>`<p>${a.emoji} ${escapeHtml(a.name)} — CLASS ${a.class} / SANITY ${a.class===1?"???":Math.round(a.sanity)} / ${Math.round(a.energyRate)} E/MIN</p>`).join("")}<h3>PERSONNEL</h3>${state.employees.map(e=>`<p>${e.emoji} ${escapeHtml(e.name)} — ${e.alive?e.role:"DECEASED"} / ${e.hp} HP / ${e.sanity} SAN / ${e.sin}</p>`).join("")}<h3>RECENT LOG</h3>${state.logs.slice(0,10).map(x=>`<p class="muted">${escapeHtml(x)}</p>`).join("")}`);
}
function showModal(html){$("modal-content").innerHTML=html;$("modal-backdrop").classList.remove("hidden");}
function closeModal(){$("modal-backdrop").classList.add("hidden");}
function closeDetail(){$("detail-panel").classList.add("hidden");}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}

$("intro-copy").textContent=CONFIG.intro;
$("intro-confirm").onclick=()=>{showScreen("start-screen");AudioManager.play("inactive");};
$("start-button").onclick=()=>{AudioManager.stopMusic();startGame();};
document.querySelectorAll(".inventory-tab").forEach(b=>b.onclick=()=>{state.activeInventoryTab=b.dataset.tab;renderInventory();});
$("begin-shift-button").onclick=beginShift;
$("end-shift-button").onclick=()=>{if(state.energy>=state.quota)completeShift();else lose("MANAGEMENT ENDED THE SHIFT BEFORE THE REQUIRED ENERGY QUOTA WAS MET.");};
$("info-button").onclick=showInfo;$("close-detail").onclick=closeDetail;$("close-modal").onclick=closeModal;
$("modal-backdrop").addEventListener("click",e=>{if(e.target===$("modal-backdrop"))closeModal();});
updateHeader();
