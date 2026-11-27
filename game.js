/* =========================================================
   NEW MANAGEMENT — GAME SYSTEMS
   ========================================================= */
const $ = id => document.getElementById(id);
const state = {
  phase:"intro", shift:0, money:CONFIG.startingMoney, energy:0, quota:CONFIG.startingQuota,
  seconds:CONFIG.shiftDurationSeconds, selectedCrate:null, crates:[], employees:[],
  abnormalities:[], floors:1, selectedEntity:null, interval:null, lastTick:0,
  breachCount:0, gameOver:false, usedEmployeeNames:new Set(), usedAbnormalityNames:new Set(),
  logs:["SYSTEM INITIALISED."]
};

function uniqueEmployeeName(){
  for(let i=0;i<100;i++){
    const n=UTIL.pick(CONFIG.employeeFirstNames)+" "+UTIL.pick(CONFIG.employeeSurnames);
    if(!state.usedEmployeeNames.has(n)){state.usedEmployeeNames.add(n);return n;}
  }
  return "Employee-"+(state.employees.length+1);
}
function uniqueAbnormalityName(){
  for(let i=0;i<150;i++){
    const n=`${UTIL.pick(CONFIG.abnormalityNamePartsA)} ${UTIL.pick(CONFIG.abnormalityNamePartsB)} ${UTIL.pick(CONFIG.abnormalityNamePartsC)}`;
    if(!state.usedAbnormalityNames.has(n)){state.usedAbnormalityNames.add(n);return n;}
  }
  return `Uncatalogued Entity ${state.usedAbnormalityNames.size+1}`;
}
function createEmployee(role,name=""){
  const sin=UTIL.pick(CONFIG.sinNames);
  const finalName=name.trim()||uniqueEmployeeName();
  state.usedEmployeeNames.add(finalName);
  return {id:crypto.randomUUID(),name:finalName,role,emoji:UTIL.pick(role==="RESEARCHER"?CONFIG.researcherEmoji:CONFIG.suppressorEmoji),
    sin,hp:UTIL.rand(85,110),maxHp:110,sanity:UTIL.rand(35,50),maxSanity:50,
    damage:role==="SUPPRESSOR"?UTIL.rand(8,13):2,speed:UTIL.rand(75,95),floor:1,
    armour:0,weapon:0,status:"IDLE",target:null,alive:true};
}
function createAbnormality(cls){
  const t=CONFIG.classTemplates[cls];
  const likes=UTIL.shuffle(CONFIG.exerciseNames).slice(0,UTIL.rand(1,2));
  const sinLikes=UTIL.shuffle(CONFIG.sinNames).slice(0,UTIL.rand(1,2));
  const sinDislikes=UTIL.shuffle(CONFIG.sinNames.filter(s=>!sinLikes.includes(s))).slice(0,UTIL.rand(1,2));
  const sanityLoss=UTIL.rand(...t.sanityLoss);
  const id=crypto.randomUUID();
  const name=uniqueAbnormalityName();
  return {id,name,class:cls,emoji:UTIL.pick(["👁️","🪞","🕯️","🫀","🎭","🪆","🦴","🕷️","🫥","🪬","🐦‍⬛","🔔"]),
    maxHp:UTIL.rand(...t.hp),hp:UTIL.rand(...t.hp),speed:Number((Math.random()*(t.speed[1]-t.speed[0])+t.speed[0]).toFixed(1)),
    baseEnergy:UTIL.rand(...t.energy),breachable:t.breachable,breachChance:t.breachChance,
    damage:UTIL.rand(...t.damage),sanity:25,maxSanity:100,likes, sinLikes,sinDislikes,
    interactionSanityLoss:sanityLoss,containmentMultiplier:1,suppressorDamage:UTIL.rand(5+cls*2,8+cls*3),
    description:`A newly catalogued Class ${cls} entity. Its behaviour has not yet been fully understood.`,
    breached:false,room:null,work:null,energy:0};
}
function addLog(message){state.logs.unshift(message);state.logs=state.logs.slice(0,30);$("shift-message").textContent=message.toUpperCase();}
function showToast(message){const t=$("toast");t.textContent=message;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),1900);}
function showScreen(id){["intro-screen","start-screen","offtime-screen","shift-screen"].forEach(x=>$(x).classList.add("hidden"));$(id).classList.remove("hidden");}
function updateHeader(){
  $("phase-label").textContent=state.phase.toUpperCase();
  $("shift-label").textContent=`SHIFT ${state.shift}`;
  $("money-label").textContent=`$${state.money}`;
  $("quota-label").textContent=`ENERGY ${Math.floor(state.energy)} / ${state.quota}`;
  $("timer-label").textContent=state.phase==="shift"?formatTime(state.seconds):"--:--";
}
function formatTime(s){return `${Math.floor(s/60).toString().padStart(2,"0")}:${(s%60).toString().padStart(2,"0")}`;}
function startGame(){
  state.phase="offtime";state.shift=0;
  state.employees=[createEmployee("RESEARCHER",""),createEmployee("RESEARCHER",""),createEmployee("SUPPRESSOR","")];
  state.abnormalities=[structuredClone(CONFIG.startingAbnormality)];
  state.usedAbnormalityNames.add(CONFIG.startingAbnormality.name);
  state.floors=1;state.money=CONFIG.startingMoney;
  AudioManager.play("neutral");
  enterOfftime(true);
}
function enterOfftime(first=false){
  state.phase="offtime";state.selectedCrate=null;state.crates=[];
  if(!first){
    const wages=state.employees.filter(e=>e.alive).length*CONFIG.employeeWage;
    state.money-=wages;
    if(state.money<=0){lose("INSUFFICIENT FUNDS. THE FACILITY HAS BEEN PLACED INTO RECEIVERSHIP.");return;}
  }
  if(state.shift>0) state.abnormalities.forEach(a=>{a.sanity=25;a.breached=false;a.hp=a.maxHp;a.work=null;a.energy=0;});
  state.crates=[1,2,3].map(()=>({id:crypto.randomUUID(),class:UTIL.rand(1,5),abnormality:null}));
  renderOfftime();showScreen("offtime-screen");updateHeader();
}
function renderOfftime(){
  $("offtime-money").textContent=`$${state.money}`;
  $("employee-count").textContent=state.employees.filter(e=>e.alive).length;
  $("wages").textContent=`$${state.employees.filter(e=>e.alive).length*CONFIG.employeeWage}`;
  $("staff-list").innerHTML=state.employees.map(e=>`<div class="staff-item"><span>${e.emoji} ${escapeHtml(e.name)} <span class="muted">${e.role}</span></span><span>${e.sin} · ${e.hp} HP</span></div>`).join("");
  $("crate-list").innerHTML=state.crates.map((c,i)=>`<button class="crate ${state.selectedCrate===c.id?"selected":""}" data-crate="${c.id}" style="--class-color:${CONFIG.classColors[c.class]}"><span class="crate-label">SEALED SHIPMENT / ${String(i+1).padStart(2,"0")}</span><span class="seal">▣</span><span class="class-name">CLASS ${c.class}</span><span class="crate-label">CONTENTS UNKNOWN</span></button>`).join("");
  document.querySelectorAll("[data-crate]").forEach(b=>b.addEventListener("click",()=>selectCrate(b.dataset.crate)));
  $("begin-shift-button").disabled=!state.selectedCrate;
  $("crate-status").textContent=state.selectedCrate?"SHIPMENT SELECTED — CONFIRM TO PROCEED":"AWAITING SELECTION";
}
function selectCrate(id){
  if(state.selectedCrate)return;
  const c=state.crates.find(x=>x.id===id);if(!c)return;
  state.selectedCrate=id;c.abnormality=createAbnormality(c.class);
  $("begin-shift-button").disabled=false;renderOfftime();
}
function hireEmployee(){
  const name=$("employee-name").value.trim();
  if(state.money<CONFIG.employeeHireCost){showToast("INSUFFICIENT FUNDS.");return;}
  if(name && state.usedEmployeeNames.has(name)){showToast("THAT NAME IS ALREADY IN USE.");return;}
  state.money-=CONFIG.employeeHireCost;
  const role=state.employees.filter(e=>e.alive).length%3===2?"SUPPRESSOR":"RESEARCHER";
  const e=createEmployee(role,name);state.employees.push(e);
  $("employee-name").value="";renderOfftime();updateHeader();showToast(`${e.name.toUpperCase()} HIRED.`);
}
function beginShift(){
  const crate=state.crates.find(c=>c.id===state.selectedCrate);if(!crate)return;
  state.abnormalities.push(crate.abnormality);
  state.shift++;state.energy=0;state.quota=CONFIG.startingQuota+(state.shift-1)*CONFIG.quotaPerShift;
  state.seconds=CONFIG.shiftDurationSeconds;state.floors=Math.max(1,Math.ceil(state.abnormalities.length/2));
  state.abnormalities.forEach((a,i)=>{a.room=i;a.energy=0;a.work=null;a.breached=false;});
  state.phase="shift";showScreen("shift-screen");renderFacility();updateShiftUI();AudioManager.play("neutral");
  clearInterval(state.interval);state.interval=setInterval(tick,1000);
  addLog(`SHIFT ${state.shift} COMMENCED.`);
}
function renderFacility(){
  const world=$("facility-world");world.innerHTML="";
  for(let f=state.floors;f>=1;f--){
    const floor=document.createElement("section");floor.className="floor";
    const left=state.abnormalities[(f-1)*2],right=state.abnormalities[(f-1)*2+1];
    floor.innerHTML=`<div class="floor-label">FACILITY LEVEL ${f.toString().padStart(2,"0")}</div>
      <div class="floor-layout">
        <div class="containment left">${left?roomMarkup(left):'<div class="room-empty">NO CONTAINMENT</div>'}</div>
        <div class="containment right">${right?roomMarkup(right):'<div class="room-empty">NO CONTAINMENT</div>'}</div>
        <div class="hall left"><span class="hall-label">HALL 1</span></div>
        <div class="hall right"><span class="hall-label">HALL 2</span></div>
        <div class="main-room"><strong>MAIN ROOM</strong><span class="muted">PERSONNEL HUB</span><div class="employee-row">${state.employees.filter(e=>e.alive&&e.floor===f).map(e=>e.emoji).join(" ")}</div></div>
        <div class="floor-link">${f===state.floors?"EXIT FROM LAST FLOOR":"ENTRANCE TO NEXT FLOOR"}<br>⇅</div>
      </div>`;
    world.appendChild(floor);
  }
  world.querySelectorAll("[data-abno]").forEach(el=>el.addEventListener("click",()=>openAbnormality(el.dataset.abno)));
}
function roomMarkup(a){
  const pct=UTIL.clamp(a.sanity,0,100);
  return `<div class="room" data-abno="${a.id}" style="--class-color:${CONFIG.classColors[a.class]}">
    <div class="room-name">${escapeHtml(a.name)}</div><div class="room-emoji">${a.breached?"🚨":a.emoji}</div>
    <div class="room-bottom"><span class="sanity">${Math.round(a.sanity)}</span><span class="energy"><i style="width:${Math.min(100,a.energy*5)}%"></i></span></div>
  </div>`;
}
function updateShiftUI(){
  $("shift-number").textContent=state.shift;
  $("quota-copy").textContent=`${Math.floor(state.energy)} / ${state.quota}`;
  $("quota-fill").style.width=`${Math.min(100,state.energy/state.quota*100)}%`;
  updateHeader();
}
function tick(){
  if(state.phase!=="shift")return;
  state.seconds--;
  for(const a of state.abnormalities){
    if(a.breached){a.energy=0;continue;}
    const assigned=state.employees.find(e=>e.alive&&e.target===a.id&&e.status==="WORKING");
    if(assigned){
      const likedExercise=a.work&&a.likes.includes(a.work.exercise);
      const sinLiked=a.sinLikes.includes(assigned.sin),sinHated=a.sinDislikes.includes(assigned.sin);
      let change=likedExercise?3: a.work? -2:0;
      if(sinLiked)change*=a.containmentMultiplier;
      if(sinHated)change-=2;
      a.sanity=UTIL.clamp(a.sanity+change,0,100);
      if(a.work)assigned.sanity=UTIL.clamp(assigned.sanity-a.interactionSanityLoss,0,50);
      if(assigned.sanity<=0){killEmployee(assigned,"SANITY COLLAPSE");}
      if(a.work) a.energy=Math.max(0,a.baseEnergy*(a.sanity/100)*(likedExercise?1.35:.7));
    }else a.energy=Math.max(0,a.baseEnergy*(a.sanity/100)*.18);
    if(a.sanity<=0&&a.breachable){breach(a);}
    state.energy+=a.energy/10;
  }
  for(const e of state.employees.filter(e=>e.alive&&e.status==="SUPPRESSING")){
    if(e.target){const a=state.abnormalities.find(x=>x.id===e.target);if(a&&a.breached){a.hp-=e.damage;if(a.hp<=0)suppress(a);}}
  }
  if(state.seconds<=0){if(state.energy>=state.quota)completeShift();else lose("SHIFT TIME EXPIRED. ENERGY QUOTA NOT MET.");return;}
  if(state.employees.filter(e=>e.alive).length===0){lose("ALL PERSONNEL LOST.");return;}
  if(state.money<=0){lose("INSUFFICIENT FUNDS.");return;}
  updateShiftUI();renderFacility();
}
function breach(a){
  a.breached=true;a.work=null;a.energy=0;state.breachCount++;
  addLog(`CLASS ${a.class} BREACH: ${a.name}`);
  AudioManager.effect("breach");AudioManager.setPanic(state.breachCount>=3?3:state.breachCount>=2?2:1);
  showToast(`${a.name.toUpperCase()} HAS BREACHED.`);
  state.employees.forEach(e=>{if(e.alive&&e.status==="WORKING"&&e.target===a.id){e.status="IDLE";e.target=null;}});
}
function suppress(a){
  a.breached=false;a.hp=a.maxHp;a.sanity=25;a.work=null;a.energy=0;
  state.employees.forEach(e=>{if(e.target===a.id){e.target=null;e.status="IDLE";}});
  state.breachCount=Math.max(0,state.breachCount-1);
  addLog(`${a.name} SUPPRESSED. CONTAINMENT RESTORED.`);
  AudioManager.setPanic(state.breachCount>=3?3:state.breachCount>=2?2:state.breachCount>=1?1:0);
  renderFacility();closeDetail();showToast("ABNORMALITY SUPPRESSED.");
}
function killEmployee(e,reason){
  if(!e.alive)return;e.alive=false;e.hp=0;e.status="DEAD";e.target=null;
  state.money-=CONFIG.employeeDeathFee;addLog(`${e.name} LOST: ${reason}. $${CONFIG.employeeDeathFee} FEE.`);
  AudioManager.effect("death");
}
function completeShift(){
  clearInterval(state.interval);
  const bonus=Math.floor(state.energy*3);
  state.money+=bonus;
  state.abnormalities.forEach(a=>{a.work=null;a.sanity=25;a.breached=false;a.hp=a.maxHp;a.energy=0;});
  addLog(`SHIFT COMPLETE. ENERGY BONUS: $${bonus}.`);
  state.breachCount=0;AudioManager.setPanic(0);
  showModal(`<div class="eyebrow">OPERATIONS REPORT</div><h2>SHIFT ${state.shift} COMPLETE</h2><p>Energy produced: <strong>${Math.floor(state.energy)}</strong></p><p>Performance bonus: <strong>$${bonus}</strong></p><p>Personnel remaining: <strong>${state.employees.filter(e=>e.alive).length}</strong></p><button class="primary" id="report-continue">CONTINUE TO OFFTIME</button>`);
  $("report-continue").onclick=()=>{closeModal();enterOfftime();};
}
function lose(reason){
  clearInterval(state.interval);state.phase="lost";state.gameOver=true;AudioManager.stopMusic();
  showModal(`<div class="eyebrow">CORPORATE NOTICE</div><h2>EMPLOYMENT TERMINATED</h2><p>${escapeHtml(reason)}</p><p>Final shift: ${state.shift}</p><button class="primary" onclick="location.reload()">RESTART FACILITY</button>`);
}
function openAbnormality(id){
  const a=state.abnormalities.find(x=>x.id===id);if(!a)return;state.selectedEntity=id;
  const likes=a.likes.join(", "),sinLikes=a.sinLikes.join(", "),sinDislikes=a.sinDislikes.join(", ");
  $("detail-content").innerHTML=`<div class="eyebrow">ABNORMALITY RECORD / CLASS ${a.class}</div><div class="detail-title">${a.emoji} ${escapeHtml(a.name)}</div><p>${escapeHtml(a.description)}</p>
    <div class="stat-grid">
      <div class="stat"><span>SANITY</span><strong>${Math.round(a.sanity)} / 100</strong></div>
      <div class="stat"><span>ENERGY OUTPUT</span><strong>${a.baseEnergy}</strong></div>
      <div class="stat"><span>HEALTH</span><strong>${a.hp} / ${a.maxHp}</strong></div>
      <div class="stat"><span>BREACH DAMAGE</span><strong>${a.damage}</strong></div>
      <div class="stat"><span>MOVEMENT SPEED</span><strong>${a.speed}</strong></div>
      <div class="stat"><span>BREACH CHANCE</span><strong>${Math.round(a.breachChance*100)}%</strong></div>
    </div>
    <p><b>Preferred exercises:</b> ${likes||"None known"}</p><p><b>Favoured sins:</b> ${sinLikes}</p><p><b>Disliked sins:</b> ${sinDislikes}</p>
    <p><b>Employee interaction penalty:</b> ${a.interactionSanityLoss} sanity</p>
    <div class="action-stack">${a.breached?`<button id="suppress-open">ORDER SUPPRESSION</button>`:`<button id="exercise-open">ASSIGN EXERCISE</button><button id="sacrifice-open">SACRIFICE EMPLOYEE</button>`}</div>`;
  $("detail-panel").classList.remove("hidden");
  if(a.breached)$("suppress-open").onclick=()=>chooseEmployee(a.id,"SUPPRESS");
  else{
    $("exercise-open").onclick=()=>chooseExercise(a.id);
    $("sacrifice-open").onclick=()=>chooseEmployee(a.id,"SACRIFICE");
  }
}
function chooseExercise(id){
  const a=state.abnormalities.find(x=>x.id===id);
  const researchers=state.employees.filter(e=>e.alive&&e.role==="RESEARCHER"&&e.floor===Math.ceil((a.room+1)/2));
  if(!researchers.length){showToast("NO AVAILABLE RESEARCHERS ON THIS FLOOR.");return;}
  showModal(`<h2>ASSIGN EXERCISE</h2><p>Select an exercise and researcher.</p><div class="action-stack">${CONFIG.exerciseNames.map(x=>`<button data-exercise="${x}">${x}</button>`).join("")}</div><div class="action-stack">${researchers.map(e=>`<button data-worker="${e.id}">${e.emoji} ${escapeHtml(e.name)} — ${e.sin}</button>`).join("")}</div>`);
  let exercise=null;
  document.querySelectorAll("[data-exercise]").forEach(b=>b.onclick=()=>{exercise=b.dataset.exercise;showToast(`${exercise} SELECTED. NOW SELECT A RESEARCHER.`);});
  document.querySelectorAll("[data-worker]").forEach(b=>b.onclick=()=>{if(!exercise){showToast("SELECT AN EXERCISE FIRST.");return;}const e=state.employees.find(x=>x.id===b.dataset.worker);e.status="WORKING";e.target=id;const ab=state.abnormalities.find(x=>x.id===id);ab.work={exercise};closeModal();closeDetail();addLog(`${e.name} ASSIGNED TO ${ab.name}.`);});
}
function chooseEmployee(id,mode){
  const a=state.abnormalities.find(x=>x.id===id);
  const eligible=state.employees.filter(e=>e.alive&&(mode==="SUPPRESS"?e.role==="SUPPRESSOR":true));
  if(!eligible.length){showToast("NO ELIGIBLE EMPLOYEES.");return;}
  showModal(`<h2>${mode==="SUPPRESS"?"ORDER SUPPRESSION":"SACRIFICE EMPLOYEE"}</h2><p>Select personnel.</p><div class="action-stack">${eligible.map(e=>`<button data-worker="${e.id}">${e.emoji} ${escapeHtml(e.name)} — ${e.role} / ${e.hp} HP / ${e.sin}</button>`).join("")}</div>`);
  document.querySelectorAll("[data-worker]").forEach(b=>b.onclick=()=>{
    const e=state.employees.find(x=>x.id===b.dataset.worker);
    if(mode==="SUPPRESS"){e.status="SUPPRESSING";e.target=id;addLog(`${e.name} ORDERED TO SUPPRESS ${a.name}.`);}
    else{a.sanity=100;a.energy=a.baseEnergy;killEmployee(e,"SACRIFICE");addLog(`${e.name} SACRIFICED TO ${a.name}.`);}
    closeModal();closeDetail();renderFacility();
  });
}
function showInfo(){
  showModal(`<div class="eyebrow">FACILITY STATUS</div><h2>MANAGEMENT RECORD</h2><div class="stat-grid"><div class="stat"><span>SHIFT</span><strong>${state.shift}</strong></div><div class="stat"><span>FUNDS</span><strong>$${state.money}</strong></div><div class="stat"><span>ENERGY</span><strong>${Math.floor(state.energy)}</strong></div><div class="stat"><span>QUOTA</span><strong>${state.quota}</strong></div><div class="stat"><span>PERSONNEL</span><strong>${state.employees.filter(e=>e.alive).length}</strong></div><div class="stat"><span>ABNORMALITIES</span><strong>${state.abnormalities.length}</strong></div></div><h3>ABNORMALITIES</h3>${state.abnormalities.map(a=>`<p>${a.emoji} ${escapeHtml(a.name)} — CLASS ${a.class} / SANITY ${a.sanity}</p>`).join("")}<h3>PERSONNEL</h3>${state.employees.map(e=>`<p>${e.emoji} ${escapeHtml(e.name)} — ${e.alive?e.role:"DECEASED"} / ${e.hp} HP / ${e.sanity} SAN / ${e.sin}</p>`).join("")}<h3>RECENT LOG</h3>${state.logs.slice(0,10).map(x=>`<p class="muted">${escapeHtml(x)}</p>`).join("")}`);
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
$("info-button").onclick=showInfo;
$("close-detail").onclick=closeDetail;
$("close-modal").onclick=closeModal;
$("modal-backdrop").addEventListener("click",e=>{if(e.target===$("modal-backdrop"))closeModal();});
updateHeader();
