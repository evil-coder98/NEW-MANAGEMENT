/* =========================================================
   NEW MANAGEMENT — CONTENT & BALANCE CONFIGURATION
   All class ranges, names, colours and audio paths are editable here.
   Energy values are ENERGY PER MINUTE (not raw arbitrary points).
   ========================================================= */
const CONFIG = {
  intro: "You have been appointed as the acting manager of an energy production facility. Your responsibility is to maintain containment, direct personnel, and meet the company's energy requirements. The company expects results. The company does not accept excuses.",
  startingMoney: 650,
  shiftDurationSeconds: 600,
  employeeHireCost: 100,
  employeeWage: 15,
  employeeDeathFee: 500,
  startingEmployeeSanity: 25,
  employeeSanityMaximum: 50,
  employeeWalkSpeed: [62, 82],
  startingQuota: 35,
  quotaPerShift: 25,
  maxEnergyPerMinute: 1500,
  exerciseDurationSeconds: 30,
  classColors: {1:"#4b91d1",2:"#55b978",3:"#d6c24f",4:"#df873f",5:"#c84b4b"},
  palette: {background:"#080808",panel:"#171717",text:"#f1f1f1"},
  sinNames:["PRIDE","GREED","LUST","ENVY","GLUTTONY","WRATH","SLOTH"],
  exerciseNames:["KNOWLEDGE","DETERMINATION","EXPERIENCE","BRAVERY"],
  researcherEmoji:["🧑‍🔬","👩‍🔬","👨‍🔬"],
  suppressorEmoji:["🛡️","⚔️","👮"],
  employeeFirstNames:["Alex","Morgan","Jamie","Taylor","Riley","Jordan","Casey","Avery","Sam","Robin","Cameron","Drew","Elliot","Harper","Quinn","Rowan","Skyler","Reese","Parker","Sasha","Mika","Noah","Mara","Iris","Felix","Nina","Theo","June","Ezra","Milo","Ada","Vera","Otto","Lena","Arlo","Mina"],
  employeeSurnames:["Vale","Cross","Morrow","Reed","Hale","Voss","Grey","Wick","Mercer","Holloway","Pike","Ashford","Bell","Crowe","Sato","Keller","Wren","Locke","Frost","Ellis","Shaw","Rook","Mills","Keene"],
  abnormalityNamePartsA:["The","A","An","Little","Last","Pale","Quiet","Hollow","Forgotten","Patient","Hungry","Borrowed","Uninvited","Kindly","Second"],
  abnormalityNamePartsB:["Choir","Witness","Gardener","Passenger","Lantern","Mouth","Puppet","Caretaker","Visitor","Widow","Clock","Saint","Hound","Child","Mirror","Usher","Doll","Bell","Orchard","King"],
  abnormalityNamePartsC:["Beneath Glass","Without a Face","In the Walls","Of the Deep","At Closing Time","With Open Hands","That Waits","In Bloom","From Upstairs","Of Empty Rooms","After Midnight","With No Shadow"],
  startingAbnormality:{
    id:"one-sin", name:"One Sin, One Hundred Good Deeds", class:1, emoji:"✝️",
    maxHp:100, hp:100, speed:0, energyPerMinute:8, breachable:false,
    damage:0, description:"A quiet, low-risk abnormality. It cannot breach containment. Its sanity is unmeasurable, and it produces a small but reliable amount of energy.",
    likes:["KNOWLEDGE"], sinLikes:["PRIDE"], sinDislikes:["WRATH"],
    interactionSanityLoss:0, containmentMultiplier:1.2, suppressorDamage:0,
    sanity:null, breached:false, room:0, work:null, energy:0
  },
  classTemplates:{
    1:{energy:[3,12],hp:[80,120],damage:[0,0],speed:[0,0],sanityLoss:[0,2],breachable:false,idleDrain:0,exerciseGain:0.8,exerciseLoss:0.5},
    2:{energy:[15,55],hp:[90,150],damage:[2,5],speed:[.5,1],sanityLoss:[1,3],breachable:true,idleDrain:.12,exerciseGain:1.1,exerciseLoss:.8},
    3:{energy:[70,180],hp:[130,210],damage:[5,10],speed:[.8,1.5],sanityLoss:[5,5],breachable:true,idleDrain:.3,exerciseGain:1.25,exerciseLoss:1.2},
    4:{energy:[200,500],hp:[220,340],damage:[10,18],speed:[1.2,2],sanityLoss:[10,10],breachable:true,idleDrain:.8,exerciseGain:1.5,exerciseLoss:2.2},
    5:{energy:[500,1500],hp:[350,600],damage:[18,35],speed:[1.8,3],sanityLoss:[15,25],breachable:true,idleDrain:2.1,exerciseGain:1.8,exerciseLoss:4.2}
  },
  audio:{inactive:"",neutral:"",trumpet1:"",trumpet2:"",trumpet3:"",click:"",breach:"",death:"",success:""}
};
const UTIL={
  rand(min,max){return Math.floor(Math.random()*(max-min+1))+min},
  pick(a){return a[Math.floor(Math.random()*a.length)]},
  clamp(n,min,max){return Math.max(min,Math.min(max,n))},
  finite(n,fallback=0){return Number.isFinite(Number(n))?Number(n):fallback},
  shuffle(a){const out=[...a];for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;},
  uid(){return globalThis.crypto?.randomUUID?.()||`id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`}
};
