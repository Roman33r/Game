import type {World,Unit,UnitKind} from './types';
import {DISTRICT_NAMES,UNIT_STATS, ZOMBIE_STATS} from './data';
let seq=0;
export const uid=()=>`${Date.now().toString(36)}-${seq++}`;
export function makeUnit(kind:UnitKind,x:number,z:number,name?:string):Unit { const s=UNIT_STATS[kind];return {id:uid(),name:name||s.label,kind,x,z,hp:s.hp,maxHp:s.hp,soldiers:s.men,ammo:100,morale:100,order:'hold',cooldown:0}; }
export function makeZombie(x:number,z:number,kind:keyof typeof ZOMBIE_STATS='walker'){return {id:uid(),x,z,kind,hp:ZOMBIE_STATS[kind].hp,cooldown:0};}
export function createWorld():World {
 const districts=DISTRICT_NAMES.map((name,id)=>({id,name,x:-120+(id%4)*80,z:-80+Math.floor(id/4)*80,survivors: id===5?0:12+id*3,stock:100+id*12,rescued:0,status:(id===5?'controlled':'lost') as World['districts'][number]['status'],infrastructure:45+id*3}));
 let seed=612; const rand=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};
 const zombies=[];for(let i=0;i<240;i++){let x=rand()*300-150,z=rand()*220-110;if(Math.hypot(x+40,z)<48){x+=85;} zombies.push(makeZombie(x,z,i%39===0?'heavy':i%13===0?'runner':i%19===0?'crawler':'walker'));}
 return {version:1,time:0,speed:1,paused:false,resources:{fuel:400,ammo:700,food:320,medicine:120,materials:420,power:100},units:[makeUnit('infantry',-46,4,'ALPHA · 01'),makeUnit('infantry',-32,8,'BRAVO · 02'),makeUnit('humvee',-42,-10,'VIKING · 03'),makeUnit('engineer',-55,-8,'PIONEER · 04'),makeUnit('medic',-52,14,'ANGEL · 05'),makeUnit('scout',-28,-6,'GHOST · 06')],zombies,buildings:[{id:uid(),kind:'hq',x:-40,z:0,hp:1000,maxHp:1000,level:1},{id:uid(),kind:'tower',x:-60,z:-20,hp:280,maxHp:280,level:1}],districts,log:[{time:0,text:'OVERLORD: закрепитесь в Downtown. Найдите и эвакуируйте 40 гражданских.',type:'info'}],shots:[],kills:0,rescued:0,nextEvent:75,phase:0,outcome:'',selected:[],buildMode:null,sound:false,weather:true};
}
