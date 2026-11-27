/* =========================================================
   NEW MANAGEMENT — CONTENT & BALANCE CONFIGURATION
   Add/edit names, traits, colours, stats and audio asset paths here.
   ========================================================= */
const CONFIG = {
  intro: "You have been appointed as the acting manager of an energy production facility. Your responsibility is to maintain containment, direct personnel, and meet the company's energy requirements. The company expects results. The company does not accept excuses.",
  startingMoney: 650,
  shiftDurationSeconds: 600,
  employeeHireCost: 100,
  employeeWage: 15,
  employeeDeathFee: 500,
  startingQuota: 8,
  quotaPerShift: 5,
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
    id:"one-sin",
    name:"One Sin, One Hundred Good Deeds",
    class:1, emoji:"✝️", maxHp:100, speed:0, baseEnergy:2,
    breachable:false, breachChance:0, damage:0, description:"A quiet, low-risk abnormality. It cannot breach containment and produces very little energy. A reliable first assignment.",
    exerciseLikes:["KNOWLEDGE"], sinLikes:["PRIDE"], sinDislikes:["WRATH"],
    interactionSanityLoss:0, containmentMultiplier:1.2, suppressorDamage:0
  },
  classTemplates:{
    1:{energy:[1,3],hp:[80,120],breachChance:0,damage:[0,0],speed:[0,0],sanityLoss:[0,2],breachable:false},
    2:{energy:[3,6],hp:[90,150],breachChance:.025,damage:[2,5],speed:[.5,1],sanityLoss:[1,3],breachable:true},
    3:{energy:[6,11],hp:[130,210],breachChance:.10,damage:[5,10],speed:[.8,1.5],sanityLoss:[5,5],breachable:true},
    4:{energy:[11,18],hp:[220,340],breachChance:.18,damage:[10,18],speed:[1.2,2],sanityLoss:[10,10],breachable:true},
    5:{energy:[20,35],hp:[350,600],breachChance:.32,damage:[18,35],speed:[1.8,3],sanityLoss:[15,25],breachable:true}
  },
  audio:{
    inactive:"", neutral:"", trumpet1:"", trumpet2:"", trumpet3:"",
    click:"", breach:"", death:"", success:""
  }
};

const UTIL = {
  rand(min,max){return Math.floor(Math.random()*(max-min+1))+min},
  pick(a){return a[Math.floor(Math.random()*a.length)]},
  clamp(n,min,max){return Math.max(min,Math.min(max,n))},
  shuffle(a){return [...a].sort(()=>Math.random()-.5)}
};
