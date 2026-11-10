import type {World,Unit,UnitKind} from './types';
import {MAP} from './mapConfig';
import {DISTRICT_NAMES,UNIT_STATS, ZOMBIE_STATS} from './data';
let seq=0;
export const uid=()=>`${Date.now().toString(36)}-${seq++}`;
export function makeUnit(kind:UnitKind,x:number,z:number,name?:string):Unit { const s=UNIT_STATS[kind];return {id:uid(),name:name||s.label,kind,x,z,hp:s.hp,maxHp:s.hp,soldiers:s.men,ammo:100,morale:100,order:'hold',cooldown:0}; }
export function makeZombie(x:number,z:number,kind:keyof typeof ZOMBIE_STATS='walker'){return {id:uid(),x,z,kind,hp:ZOMBIE_STATS[kind].hp,cooldown:0};}
const OUTER_NAMES=['Hollywood','Echo Park','Silver Lake','Koreatown','East Hollywood','Chinatown','Lincoln Heights','El Sereno','Mid City','Harvard Heights','Kensington','East LA','Palms','Baldwin Hills','Jefferson Park','Central Alameda','Leimert Park','Crenshaw','Huntington Park','Maywood','Culver East','Hyde Park','Florence','South Gate','Inglewood','Watts','Lynwood','Commerce'];
export function createDistricts(){
 const districts=DISTRICT_NAMES.map((name,id)=>({id,name,x:-120+(id%4)*80,z:-80+Math.floor(id/4)*80,survivors:id===5?0:12+id*3,stock:100+id*12,rescued:0,status:(id===5?'controlled':'lost') as World['districts'][number]['status'],infrastructure:45+id*3}));
 let index=0;for(let z=MAP.minZ+40;z<MAP.maxZ;z+=80)for(let x=MAP.minX+40;x<MAP.maxX;x+=80){if(districts.some(d=>d.x===x&&d.z===z))continue;districts.push({id:districts.length,name:OUTER_NAMES[index++],x,z,survivors:20+index%9*4,stock:140+index*5,rescued:0,status:'lost',infrastructure:35+index%12*4});}
 return districts;
}
export function outerHordes(){let seed=887;const rand=()=>{seed=seed*16807%2147483647;return seed/2147483647;};const result=[];while(result.length<360){const x=MAP.minX+10+rand()*(MAP.width-20),z=MAP.minZ+10+rand()*(MAP.depth-20);if(Math.abs(x)<160&&Math.abs(z)<120)continue;result.push(makeZombie(x,z,result.length%43===0?'heavy':result.length%11===0?'runner':result.length%17===0?'crawler':'walker'));}return result;}
export function createWorld():World {
 const districts=createDistricts();
 let seed=612; const rand=()=>{seed=(seed*16807)%2147483647;return seed/2147483647};
 const zombies=[];for(let i=0;i<240;i++){let x=rand()*300-150,z=rand()*220-110;if(Math.hypot(x+40,z)<48){x+=85;} zombies.push(makeZombie(x,z,i%39===0?'heavy':i%13===0?'runner':i%19===0?'crawler':'walker'));}
 return {version:2,time:0,speed:1,paused:false,resources:{fuel:400,ammo:700,food:320,medicine:120,materials:420,power:100},units:[makeUnit('infantry',-46,4,'ALPHA · 01'),makeUnit('infantry',-32,8,'BRAVO · 02'),makeUnit('humvee',-42,-10,'VIKING · 03'),makeUnit('engineer',-55,-8,'PIONEER · 04'),makeUnit('medic',-52,14,'ANGEL · 05'),makeUnit('scout',-28,-6,'GHOST · 06')],zombies:[...zombies,...outerHordes()],buildings:[{id:uid(),kind:'hq',x:-40,z:0,hp:1000,maxHp:1000,level:1},{id:uid(),kind:'tower',x:-60,z:-20,hp:280,maxHp:280,level:1}],districts,log:[{time:0,text:'OVERLORD: закрепитесь в Downtown. Найдите и эвакуируйте 40 гражданских.',type:'info'}],shots:[],projectiles:[],impacts:[],kills:0,rescued:0,nextEvent:75,phase:0,outcome:'',selected:[],groups:{},buildMode:null,sound:false,weather:true};
}

// Version 1 saves retain their original units, construction and twelve district IDs.
export function restoreWorld(value:unknown):World {
 if(!value||typeof value!=='object')throw new Error('Invalid save');
 const data=value as Omit<World,'version'>&{version:number};
 if(![1,2].includes(data.version)||!Array.isArray(data.units)||!Array.isArray(data.buildings)||!Array.isArray(data.districts)||!Array.isArray(data.zombies)||!data.resources)throw new Error('Invalid save');
 if(data.version===1){const existing=new Set(data.districts.map(d=>d.id));data.districts.push(...createDistricts().filter(d=>!existing.has(d.id)));data.zombies.push(...outerHordes());data.projectiles=[];data.impacts=[];data.shots=[];}
 data.groups??={};const alive=new Set(data.units.filter(u=>u.hp>0).map(u=>u.id));for(const key of Object.keys(data.groups))data.groups[key]=[...new Set(data.groups[key])].filter(id=>alive.has(id));
 data.version=2;data.projectiles??=[];data.impacts??=[];data.buildMode=null;return data as World;
}
