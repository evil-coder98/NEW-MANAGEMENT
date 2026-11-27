/* =========================================================
   AUDIO CONFIGURATION
   Put audio file paths in CONFIG.audio in data.js.
   Empty paths are intentionally silent. Browsers require a user
   gesture before audio can begin.
   ========================================================= */
const AudioManager = {
  tracks:{}, current:null, currentKey:null, enabled:true,
  init(){
    for(const [key,path] of Object.entries(CONFIG.audio)){
      if(!path) continue;
      const audio=new Audio(path); audio.preload="auto";
      if(["inactive","neutral","trumpet1","trumpet2","trumpet3"].includes(key)){
        audio.loop=true; audio.volume=.35;
      } else audio.volume=.65;
      this.tracks[key]=audio;
    }
  },
  play(key){
    if(!this.enabled || !this.tracks[key]) return;
    if(this.currentKey===key && !this.current.paused) return;
    this.stopMusic();
    const a=this.tracks[key]; this.current=a; this.currentKey=key;
    a.currentTime=0; a.play().catch(()=>{});
  },
  stopMusic(){
    if(this.current){this.current.pause();this.current.currentTime=0;}
    this.current=null;this.currentKey=null;
  },
  effect(key){
    if(!this.enabled || !this.tracks[key]) return;
    const a=this.tracks[key].cloneNode();a.volume=this.tracks[key].volume;a.play().catch(()=>{});
  },
  setPanic(level){
    const key=level>=3?"trumpet3":level===2?"trumpet2":level===1?"trumpet1":"neutral";
    this.play(key);
  }
};
AudioManager.init();
