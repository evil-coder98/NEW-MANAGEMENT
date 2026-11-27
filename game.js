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
function createEmployee(role,name=""){
  const finalName=name.trim()||uniqueEmployeeName();state.usedEmployeeNames.add(finalName.toLowerCase());
  return {id:UTIL.uid(),name:finalName,role,emoji:UTIL.pick(role==="RESEARCHER"?CONFIG.researcherEmoji:CONFIG.suppressorEmoji),
    sin:UTIL.pick(CONFIG.sinNames),hp:UTIL.rand(85,110),maxHp:110,sanity:CONFIG.startingEmployeeSanity,maxSanity:CONFIG.employeeSanityMaximum,
    damage:role==="SUPPRESSOR"?UTIL.rand(8,13):2,speed:UTIL.rand(...CONFIG.employeeWalkSpeed),floor:1,armour:0,weapon:0,
    status:"IDLE",task:null,target:null,alive:true,node:"main",x:50,y:37,path:[],pathIndex:0,
    workTimer:0,nextWanderAt:0,el:null};
}
function createAbnormality(cls){
  const t=CONFIG.classTemplates[cls],hp=UTIL.rand(...t.hp);
  const likes=UTIL.shuffle(CONFIG.exerciseNames).slice(0,UTIL.rand(1,2));
  const sinLikes=UTIL.shuffle(CONFIG.sinNames).slice(0,UTIL.rand(1,2));
  const sinDislikes=UTIL.shuffle(CONFIG.sinNames.filter(s=>!sinLikes.includes(s))).slice(0,UTIL.rand(1,2));
  const dislikes=UTIL.shuffle(CONFIG.exerciseNames.filter(x=>!likes.includes(x))).slice(0,UTIL.rand(1,2));
  return {id:UTIL.uid(),name:uniqueAbnormalityName(),class:cls,emoji:UTIL.pick(["👁️","🪞","🕯️","🫀","🎭","🪆","🦴","🕷️","🫥","🪬","🐦‍⬛","🔔"]),
    maxHp:hp,hp,speed:Number((Math.random()*(t.speed[1]-t.speed[0])+t.speed[0]).toFixed(1)),
    energyPerMinute:UTIL.rand(...t.energy),breachable:t.breachable,damage:UTIL.rand(...t.damage),
    sanity:cls===1?null:25,maxSanity:100,likes,dislikes,sinLikes,sinDislikes,interactionSanityLoss:UTIL.rand(...t.sanityLoss),
    containmentMultiplier:1,description:`A newly catalogued Class ${cls} entity. Its behaviour has not yet been fully understood.`,
    breached:false,room:null,floor:1,side:"left",work:null,energy:0,energyRate:0,idleDrain:t.idleDrain,exerciseGain:t.exerciseGain,exerciseLoss:t.exerciseLoss};
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
  const first=structuredClone(CONFIG.startingAbnormality);first.id="one-sin";first.floor=1;first.side="left";first.room=0;first.sanity=null;first.dislikes=[];first.breached=false;first.work=null;first.energy=0;first.energyRate=0;
  state.abnormalities=[first];state.usedAbnormalityNames.add(first.name);state.floors=1;
  state.energy=0;state.quota=CONFIG.startingQuota;state.seconds=CONFIG.shiftDurationSeconds;
  AudioManager.play("neutral");showScreen("shift-screen");renderFacility();updateShiftUI();startSimulation();addLog("SHIFT 1 COMMENCED. INITIAL CONTAINMENT: ONE SIN, ONE HUNDRED GOOD DEEDS.");
}
function enterOfftime(){
  state.phase="offtime";const wages=state.employees.filter(e=>e.alive).length*CONFIG.employeeWage;state.money-=wages;
  if(state.money<=0){lose("INSUFFICIENT FUNDS. THE FACILITY HAS BEEN PLACED INTO RECEIVERSHIP.");return;}
  state.selectedCrate=null;state.crates=[1,2,3].map(()=>({id:UTIL.uid(),class:UTIL.rand(1,5),abnormality:null}));
  state.abnormalities.forEach(a=>{a.work=null;a.breached=false;a.hp=a.maxHp;a.energy=0;a.energyRate=0;if(a.class!==1)a.sanity=25;});
  renderOfftime();showScreen("offtime-screen");updateHeader();
}
function renderOfftime(){
  $("offtime-money").textContent=`$${Math.floor(state.money)}`;$("employee-count").textContent=state.employees.filter(e=>e.alive).length;
  $("wages").textContent=`$${state.employees.filter(e=>e.alive).length*CONFIG.employeeWage}`;
  $("staff-list").innerHTML=state.employees.map(e=>`<div class="staff-item"><span>${e.emoji} ${escapeHtml(e.name)} <span class="muted">${e.role}</span></span><span>${e.sin} · ${e.hp} HP · ${e.sanity} SAN</span></div>`).join("");
  $("crate-list").innerHTML=state.crates.map((c,i)=>`<button class="crate ${state.selectedCrate===c.id?"selected":""}" data-crate="${c.id}" style="--class-color:${CONFIG.classColors[c.class]}"><span class="crate-label">SEALED SHIPMENT / ${String(i+1).padStart(2,"0")}</span><span class="seal">▣</span><span class="class-name">CLASS ${c.class}</span><span class="crate-label">CONTENTS UNKNOWN</span></button>`).join("");
  document.querySelectorAll("[data-crate]").forEach(b=>b.addEventListener("click",()=>selectCrate(b.dataset.crate)));
  $("begin-shift-button").disabled=!state.selectedCrate;$("crate-status").textContent=state.selectedCrate?"SHIPMENT SELECTED — CONFIRM TO PROCEED":"AWAITING SELECTION";
}
function selectCrate(id){if(state.selectedCrate)return;const c=state.crates.find(x=>x.id===id);if(!c)return;state.selectedCrate=id;c.abnormality=createAbnormality(c.class);renderOfftime();}
function hireEmployee(){
  const name=$("employee-name").value.trim();if(state.money<CONFIG.employeeHireCost){showToast("INSUFFICIENT FUNDS.");return;}
  if(name&&state.usedEmployeeNames.has(name.toLowerCase())){showToast("THAT NAME IS ALREADY IN USE.");return;}
  state.money-=CONFIG.employeeHireCost;const role=state.employees.filter(e=>e.alive).length%3===2?"SUPPRESSOR":"RESEARCHER";
  const e=createEmployee(role,name);e.floor=Math.max(1,Math.ceil((state.abnormalities.length+1)/2));e.node="main";state.employees.push(e);
  $("employee-name").value="";renderOfftime();updateHeader();showToast(`${e.name.toUpperCase()} HIRED.`);
}
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
  for(let f=state.floors;f>=1;f--){
    const floor=document.createElement("section");floor.className="floor";floor.dataset.floor=f;
    const left=state.abnormalities.find(a=>a.floor===f&&a.side==="left"),right=state.abnormalities.find(a=>a.floor===f&&a.side==="right");
    floor.innerHTML=`<div class="floor-label">FACILITY LEVEL ${f.toString().padStart(2,"0")}</div><div class="floor-layout">
      <div class="containment left">${left?roomMarkup(left):'<div class="room-empty">NO CONTAINMENT</div>'}</div>
      <div class="containment right">${right?roomMarkup(right):'<div class="room-empty">NO CONTAINMENT</div>'}</div>
      <div class="hall left"><span class="hall-label">HALL 1</span></div><div class="hall right"><span class="hall-label">HALL 2</span></div>
      <div class="main-room"><strong>MAIN ROOM</strong><span class="muted">PERSONNEL HUB</span></div>
      <div class="floor-link">${f===state.floors?"EXIT FROM LAST FLOOR":"ENTRANCE TO NEXT FLOOR"}<br>⇅</div>
      <div class="employee-layer"></div></div>`;
    world.appendChild(floor);
  }
  world.querySelectorAll("[data-abno]").forEach(el=>el.addEventListener("click",()=>openAbnormality(el.dataset.abno)));
  world.querySelectorAll("[data-worker]").forEach(el=>el.addEventListener("click",()=>openEmployee(el.dataset.worker)));
  state.employees.filter(e=>e.alive).forEach(createEmployeeSprite);updateFacilityUI();
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
  for(const a of state.abnormalities){
    if(a.breached){a.energyRate=0;continue;}
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
      a.sanity=UTIL.clamp(UTIL.finite(a.sanity,25)-a.idleDrain,0,100);
      if(a.sanity<=0&&a.breachable)breach(a);
    }
    if(a.breached){a.energyRate=0;continue;}
    const sanityFactor=a.class===1?1:UTIL.clamp(UTIL.finite(a.sanity)/100,.05,1);
    const working=!!a.work;const workFactor=working?(a.likes.includes(a.work.exercise)?1.35:.45):.65;
    a.energyRate=UTIL.clamp(UTIL.finite(a.energyPerMinute)*sanityFactor*workFactor,0,CONFIG.maxEnergyPerMinute);
    state.energy+=a.energyRate/60;
  }
  for(const e of state.employees.filter(x=>x.alive&&x.status==="SUPPRESSING"&&x.target)){
    const a=state.abnormalities.find(x=>x.id===e.target);if(!a||!a.breached){sendEmployeeHome(e);continue;}
    a.hp=Math.max(0,a.hp-e.damage);if(a.hp<=0)suppress(a);
    else if(Math.random()<.08){e.hp=Math.max(0,e.hp-a.damage*.35);if(e.hp<=0)killEmployee(e,"SUPPRESSION CASUALTY");}
  }
  if(state.seconds<=0){if(state.energy>=state.quota)completeShift();else lose("SHIFT TIME EXPIRED. ENERGY QUOTA NOT MET.");return;}
  if(state.employees.filter(e=>e.alive).length===0){lose("ALL PERSONNEL LOST.");return;}
  if(state.money<=0){lose("INSUFFICIENT FUNDS.");return;}
  updateShiftUI();
}
function finishExercise(a,e,liked,disliked){
  a.work=null;e.status="IDLE";e.target=null;e.task=null;e.nextWanderAt=performance.now()/1000+2;
  if(a.class>3&&disliked){e.sanity=Math.max(0,e.sanity-a.interactionSanityLoss);if(e.sanity<=0){killEmployee(e,`${a.name} REJECTED THE EMPLOYEE`);}}
  else if(a.class===3||a.class===4||a.class===5){e.sanity=Math.max(1,e.sanity-a.interactionSanityLoss);}
  addLog(`${e.name} COMPLETED EXERCISE WITH ${a.name}.`);
}
function breach(a){if(a.breached||!a.breachable)return;a.breached=true;a.work=null;a.energyRate=0;state.breachCount++;
  addLog(`CLASS ${a.class} BREACH: ${a.name}`);AudioManager.effect("breach");AudioManager.setPanic(state.breachCount>=3?3:state.breachCount>=2?2:1);
  showToast(`${a.name.toUpperCase()} HAS BREACHED.`);state.employees.filter(e=>e.alive&&e.status==="WORKING"&&e.target===a.id).forEach(sendEmployeeHome);updateFacilityUI();
}
function suppress(a){a.breached=false;a.hp=a.maxHp;a.sanity=a.class===1?null:25;a.work=null;a.energyRate=0;
  state.employees.filter(e=>e.target===a.id).forEach(sendEmployeeHome);state.breachCount=Math.max(0,state.breachCount-1);
  addLog(`${a.name} SUPPRESSED. CONTAINMENT RESTORED.`);AudioManager.setPanic(state.breachCount>=3?3:state.breachCount>=2?2:state.breachCount>=1?1:0);closeDetail();showToast("ABNORMALITY SUPPRESSED.");updateFacilityUI();
}
function killEmployee(e,reason){if(!e.alive)return;e.alive=false;e.hp=0;e.status="DEAD";e.target=null;e.el?.remove();state.money-=CONFIG.employeeDeathFee;addLog(`${e.name} LOST: ${reason}. $${CONFIG.employeeDeathFee} FEE.`);AudioManager.effect("death");}
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
    <p><b>Preferred exercises:</b> ${a.likes.join(", ")}</p><p><b>Disliked exercises:</b> ${a.dislikes.join(", ")}</p><p><b>Favoured sins:</b> ${a.sinLikes.join(", ")}</p><p><b>Disliked sins:</b> ${a.sinDislikes.join(", ")}</p><p><b>Employee interaction penalty:</b> ${a.interactionSanityLoss} sanity per exercise</p>
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
  $("modal-content").querySelectorAll("[data-worker]").forEach(b=>b.onclick=()=>{const e=state.employees.find(x=>x.id===b.dataset.worker);if(mode==="SUPPRESS"){if(!a.breached){showToast("THE ABNORMALITY IS NOT BREACHED.");return;}moveToNode(e,targetNode(a),"SUPPRESS",id);addLog(`${e.name} ORDERED TO SUPPRESS ${a.name}.`);}else{a.sanity=a.class===1?null:100;a.energyRate=a.energyPerMinute;killEmployee(e,"SACRIFICE");addLog(`${e.name} SACRIFICED TO ${a.name}.`);updateFacilityUI();}closeModal();closeDetail();});
}
function openEmployee(id){const e=state.employees.find(x=>x.id===id);if(!e)return;showModal(`<div class="eyebrow">PERSONNEL RECORD</div><h2>${e.emoji} ${escapeHtml(e.name)}</h2><div class="stat-grid"><div class="stat"><span>ROLE</span><strong>${e.role}</strong></div><div class="stat"><span>SIN AFFINITY</span><strong>${e.sin}</strong></div><div class="stat"><span>HEALTH</span><strong>${e.hp} / ${e.maxHp}</strong></div><div class="stat"><span>SANITY</span><strong>${e.sanity} / 50</strong></div></div><p>Current status: ${e.status}</p><p>Floor: ${e.floor}</p>`);}
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
$("hire-button").onclick=hireEmployee;
$("begin-shift-button").onclick=beginShift;
$("end-shift-button").onclick=()=>{if(state.energy>=state.quota)completeShift();else lose("MANAGEMENT ENDED THE SHIFT BEFORE THE REQUIRED ENERGY QUOTA WAS MET.");};
$("info-button").onclick=showInfo;$("close-detail").onclick=closeDetail;$("close-modal").onclick=closeModal;
$("modal-backdrop").addEventListener("click",e=>{if(e.target===$("modal-backdrop"))closeModal();});
updateHeader();
