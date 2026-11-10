import type {World,Point,Projectile,WeaponKind,Zombie} from './types';
import {CITY_BUILDINGS} from './cityLayout';
import {structureFootprint} from './structureGeometry';
let sequence=0;
type V3=Point&{y:number};
export const WEAPONS:Record<WeaponKind,{speed:number;gravity:number;spread:number;blast:number;height:number;cooldown:number;color:string}>={
 rifle:{speed:85,gravity:4,spread:.014,blast:0,height:1.7,cooldown:.8,color:'#ffd18b'},
 sniper:{speed:130,gravity:3,spread:.004,blast:0,height:1.9,cooldown:1.25,color:'#e7f5c1'},
 machinegun:{speed:105,gravity:4,spread:.022,blast:0,height:2.7,cooldown:.38,color:'#ffca73'},
 tank:{speed:58,gravity:18,spread:.009,blast:7,height:3,cooldown:2.5,color:'#ffb65e'},
 mortar:{speed:25,gravity:24,spread:.026,blast:10,height:2,cooldown:4.5,color:'#f8d294'},
 artillery:{speed:28,gravity:28,spread:0,blast:25,height:72,cooldown:0,color:'#ff9e57'}
};
interface Box {min:V3;max:V3;id?:string}
export function segmentBox(a:V3,b:V3,box:Box):number|null{
 let enter=0,exit=1;for(const axis of ['x','y','z'] as const){const delta=b[axis]-a[axis];if(Math.abs(delta)<1e-9){if(a[axis]<box.min[axis]||a[axis]>box.max[axis])return null;continue;}let t1=(box.min[axis]-a[axis])/delta,t2=(box.max[axis]-a[axis])/delta;if(t1>t2)[t1,t2]=[t2,t1];enter=Math.max(enter,t1);exit=Math.min(exit,t2);if(enter>exit)return null;}return enter;
}
function inside(p:V3,b:Box){return p.x>=b.min.x&&p.x<=b.max.x&&p.z>=b.min.z&&p.z<=b.max.z&&p.y>=b.min.y&&p.y<=b.max.y;}
const CITY_COLLIDERS:Box[]=CITY_BUILDINGS.map(b=>({min:{x:b.x-b.width/2,y:0,z:b.z-b.depth/2},max:{x:b.x+b.width/2,y:b.height*(b.ruined?.65:1)+.4,z:b.z+b.depth/2}}));
const CITY_INDEX=new Map<string,Box[]>();
for(const box of CITY_COLLIDERS)for(let x=Math.floor(box.min.x/40);x<=Math.floor(box.max.x/40);x++)for(let z=Math.floor(box.min.z/40);z<=Math.floor(box.max.z/40);z++){const key=`${x},${z}`;const list=CITY_INDEX.get(key)||[];list.push(box);CITY_INDEX.set(key,list);}
function nearbyBoxes(a:V3,b:V3){const result=new Set<Box>();for(let x=Math.floor(Math.min(a.x,b.x)/40);x<=Math.floor(Math.max(a.x,b.x)/40);x++)for(let z=Math.floor(Math.min(a.z,b.z)/40);z<=Math.floor(Math.max(a.z,b.z)/40);z++)for(const box of CITY_INDEX.get(`${x},${z}`)||[])result.add(box);return result;}
const HEIGHT:Record<string,number>={hq:6.8,wall:4.1,barricade:2,tower:12,mg:2,mortar:1.2,medical:6.8,ammo:5.1,fuel:4.2,generator:3.3,workshop:8,checkpoint:4.2};
function structures(w:World):Box[]{return w.buildings.filter(b=>b.hp>0).map(b=>{const [sx,sz]=structureFootprint(b.kind,b.rotation);return {id:b.id,min:{x:b.x-sx/2,y:0,z:b.z-sz/2},max:{x:b.x+sx/2,y:(HEIGHT[b.kind]||5)*(b.construction?.3:1),z:b.z+sz/2}};});}
function obstacleHit(w:World,a:V3,b:V3,sourceId?:string):number|null{
 let earliest:number|null=null;
 for(const box of [...nearbyBoxes(a,b),...structures(w)]){
  if((sourceId!==undefined&&box.id===sourceId)||inside(a,box))continue;
  if(Math.max(a.x,b.x)<box.min.x||Math.min(a.x,b.x)>box.max.x||Math.max(a.z,b.z)<box.min.z||Math.min(a.z,b.z)>box.max.z)continue;
  const hit=segmentBox(a,b,box);if(hit!==null&&(earliest===null||hit<earliest))earliest=hit;
 }return earliest;
}
function segmentSphere(a:V3,b:V3,c:V3,r:number):number|null{
 const dx=b.x-a.x,dy=b.y-a.y,dz=b.z-a.z,ox=a.x-c.x,oy=a.y-c.y,oz=a.z-c.z;
 const aa=dx*dx+dy*dy+dz*dz,bb=2*(ox*dx+oy*dy+oz*dz),cc=ox*ox+oy*oy+oz*oz-r*r;
 if(cc<=0)return 0;if(aa<1e-12)return null;const disc=bb*bb-4*aa*cc;if(disc<0)return null;const t=(-bb-Math.sqrt(disc))/(2*aa);return t>=0&&t<=1?t:null;
}
export function muzzleHeight(kind:WeaponKind,sourceId?:string,w?:World){return sourceId&&w?.buildings.find(b=>b.id===sourceId)?.kind==='tower'?10.2:WEAPONS[kind].height;}
export function targetVisible(w:World,source:Point,target:Point,kind:WeaponKind,sourceId?:string):boolean{
 if(kind==='mortar'||kind==='artillery')return true;
 return obstacleHit(w,{...source,y:muzzleHeight(kind,sourceId,w)},{...target,y:1.2},sourceId)===null;
}
export function findFireTarget(w:World,source:Point,range:number,kind:WeaponKind,sourceId?:string){
 return w.zombies.filter(z=>z.hp>0&&Math.hypot(z.x-source.x,z.z-source.z)<range).sort((a,b)=>Math.hypot(a.x-source.x,a.z-source.z)-Math.hypot(b.x-source.x,b.z-source.z)).find(z=>targetVisible(w,source,z,kind,sourceId));
}
export function fireWeapon(w:World,source:Point,target:Point,kind:WeaponKind,damage:number,sourceId?:string,random= Math.random):Projectile{
 const spec=WEAPONS[kind],d=Math.hypot(target.x-source.x,target.z-source.z),flight=Math.max(.08,d/spec.speed);
 const moving=target as Partial<Zombie>;const error=d*spec.spread;
 const aim={x:target.x+(moving.vx||0)*flight+(random()-.5)*2*error,z:target.z+(moving.vz||0)*flight+(random()-.5)*2*error};
 const dx=aim.x-source.x,dz=aim.z-source.z,len=Math.max(.01,Math.hypot(dx,dz));const offset=kind==='tank'?3.8:kind==='artillery'?0:1.25;
 const y=muzzleHeight(kind,sourceId,w),x=source.x+dx/len*offset,z=source.z+dz/len*offset;
 const duration=Math.max(.08,Math.hypot(aim.x-x,aim.z-z)/spec.speed),aimY=kind==='mortar'||kind==='artillery'?0:1.2;
 const p:Projectile={id:`p-${Date.now().toString(36)}-${sequence++}`,kind,x,y,z,vx:(aim.x-x)/duration,vy:(aimY-y+.5*spec.gravity*duration*duration)/duration,vz:(aim.z-z)/duration,gravity:spec.gravity,damage,blastRadius:spec.blast,age:0,ttl:Math.max(duration+.4,kind==='artillery'?4:kind==='mortar'?3:.6),...(sourceId?{sourceId}:{})};
 w.projectiles.push(p);if(w.projectiles.length>256)w.projectiles.shift();
 w.shots.push({from:{x,z},to:{x:x+dx/len*.8,z:z+dz/len*.8},y,life:.1,color:spec.color});return p;
}
function impact(w:World,p:Projectile,kind:'flesh'|'spark'|'dust',direct?:Zombie){
 let hits=direct?1:0;if(direct)direct.hp-=p.damage;
 if(p.blastRadius){
  for(const z of w.zombies){if(z.hp<=0||z===direct)continue;const d=Math.hypot(z.x-p.x,z.z-p.z,1.2-p.y);if(d<p.blastRadius){z.hp-=p.damage*(1-d/p.blastRadius);hits++;}}
 }
 if(p.kind==='artillery'){w.log.unshift({time:w.time,text:`Огневая поддержка: попадание · поражено целей: ${hits}.`,type:'warn'});w.log=w.log.slice(0,45);}
 w.impacts.push({id:`i-${Date.now().toString(36)}-${sequence++}`,x:p.x,y:p.y,z:p.z,radius:p.blastRadius||1,age:0,life:p.blastRadius?1.3:.35,kind:p.blastRadius?'explosion':kind});if(w.impacts.length>128)w.impacts.shift();
}
export function advanceProjectiles(w:World,dt:number){
 w.impacts=w.impacts.filter(i=>(i.age+=dt)<i.life);w.shots=w.shots.filter(s=>(s.life-=dt)>0);
 const alive:Projectile[]=[];
 for(const p of w.projectiles){
  const a={x:p.x,y:p.y,z:p.z},b={x:p.x+p.vx*dt,y:p.y+p.vy*dt-.5*p.gravity*dt*dt,z:p.z+p.vz*dt};
  let earliest=obstacleHit(w,a,b,p.sourceId),hitKind:'spark'|'dust'|'flesh'='spark',victim:Zombie|undefined;
  if(b.y<=0){const t=a.y/(a.y-b.y);if(earliest===null||t<earliest){earliest=t;hitKind='dust';}}
  for(const z of w.zombies){if(z.hp<=0)continue;const scale=z.kind==='alpha'?2.3:z.kind==='heavy'?1.6:z.kind==='crawler'?.7:1;
   const t=segmentSphere(a,b,{x:z.x,y:1.2*scale,z:z.z},1.15*scale);if(t!==null&&(earliest===null||t<earliest)){earliest=t;victim=z;hitKind='flesh';}
  }
  if(earliest!==null){p.x=a.x+(b.x-a.x)*earliest;p.y=Math.max(0,a.y+(b.y-a.y)*earliest);p.z=a.z+(b.z-a.z)*earliest;impact(w,p,hitKind,victim);continue;}
  p.x=b.x;p.y=b.y;p.z=b.z;p.vy-=p.gravity*dt;p.age+=dt;if(p.age<p.ttl)alive.push(p);
 }w.projectiles=alive;
}
