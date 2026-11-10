import type {World,Point,Unit,Structure,WeaponKind} from './types';
import {BUILDINGS,UNIT_STATS,ZOMBIE_STATS} from './data';
import {normalizeRotation} from './structureGeometry';
import {pruneGroups} from './commands';
import {unitWeapon,unitDamage,unitVision} from './intel';
import {MAP,clampToMap} from './mapConfig';
import {advanceProjectiles,findFireTarget,fireWeapon,WEAPONS} from './ballistics';
import {makeZombie,uid} from './world';
import {placementError,isReady,advanceConstruction} from './construction';
export const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);
export const report=(w:World,text:string,type='info')=>{w.log.unshift({time:w.time,text,type});w.log=w.log.slice(0,45);};
const districtIndexes=new WeakMap<World,{count:number;cells:Map<string,World['districts'][number]>}>();
export function districtAt(w:World,p:Point){
 let index=districtIndexes.get(w);if(!index||index.count!==w.districts.length){index={count:w.districts.length,cells:new Map(w.districts.map(d=>[`${Math.floor((d.x-MAP.minX)/80)},${Math.floor((d.z-MAP.minZ)/80)}`,d]))};districtIndexes.set(w,index);}
 const column=Math.max(0,Math.min(MAP.columns-1,Math.floor((p.x-MAP.minX)/80))),row=Math.max(0,Math.min(MAP.rows-1,Math.floor((p.z-MAP.minZ)/80)));
 return index.cells.get(`${column},${row}`)||w.districts[0];
}
export const visible=(w:World,p:Point)=>w.units.some(u=>distance(u,p)<unitVision(u.kind))||w.buildings.some(b=>isReady(b)&&b.kind==='hq'&&distance(b,p)<55);
function move(p:Point,to:Point,speed:number,dt:number){const d=distance(p,to);if(d<.5)return;const f=Math.min(1,speed*dt/d);p.x+=(to.x-p.x)*f;p.z+=(to.z-p.z)*f;}
export function build(w:World,kind:string,p:Point,rotation=w.buildRotation||0){
 const error=placementError(w,kind,p,rotation);if(error){report(w,error,'warn');return false;}
 const def=BUILDINGS[kind];w.resources.materials-=def.cost;
 const site:Structure={id:uid(),kind,...p,rotation:normalizeRotation(rotation),hp:def.hp*.2,maxHp:def.hp,level:1,construction:{elapsed:0,duration:def.buildTime}};
 w.buildings.push(site);w.selected=[site.id];report(w,`${def.label}: стройка начата · ${def.buildTime} сек.`);return true;
}
export function tick(w:World,dt:number){
 if(w.paused||w.outcome)return;
 const elapsed=Math.min(Math.max(dt,0),.25)*w.speed,end=w.time+elapsed;let remaining=elapsed;
 // Fixed physics steps keep trajectories and collision results consistent at 1x, 2x and 4x.
 while(remaining>1e-9&&!w.outcome){const step=Math.min(1/30,remaining);simulateStep(w,step);remaining-=step;}
 if(!w.outcome)w.time=end;
}
function simulateStep(w:World,dt:number){
 w.time+=dt;
 for(const b of advanceConstruction(w,dt))report(w,`${BUILDINGS[b.kind].label}: строительство завершено.`,'good');
 // Unit controller, combat, rescue and logistics all operate on the same world.
 for(const u of w.units){
  if(u.hp<=0)continue;
  if(u.order==='escort'){const truck=w.units.find(t=>t.kind==='truck'&&!t.delivered);u.target=truck?clampToMap({x:truck.x+(u.escortOffset?.x??-9),z:truck.z+(u.escortOffset?.z??5)}):undefined;}
  const s=UNIT_STATS[u.kind];u.cooldown-=dt;
  if(u.target){if(!['humvee','tank','truck'].includes(u.kind)||w.resources.fuel>0){move(u,u.target,s.speed,dt);if(['humvee','tank','truck'].includes(u.kind))w.resources.fuel=Math.max(0,w.resources.fuel-dt*.14);}if(distance(u,u.target)<2){u.target=undefined;if(u.order==='move'||u.order==='retreat')u.order='hold';}}
  const weapon:WeaponKind=unitWeapon(u.kind);
  const enemy=u.cooldown<=0&&u.ammo>0&&s.damage?findFireTarget(w,u,s.range,weapon,u.id):undefined;
  if(enemy&&u.cooldown<=0&&u.ammo>0&&s.damage){u.facing=Math.atan2(enemy.x-u.x,enemy.z-u.z)+Math.PI;fireWeapon(w,u,enemy,weapon,unitDamage(u),u.id);u.ammo=Math.max(0,u.ammo-1);u.cooldown=WEAPONS[weapon].cooldown;u.morale=Math.max(20,u.morale-.04);}
  if(u.order==='rescue'){const d=districtAt(w,u);if(distance(d,u)<21&&d.survivors>0&&!w.zombies.some(z=>distance(z,u)<18)&&u.cooldown<=0){d.survivors=Math.max(0,d.survivors-1);d.rescued++;w.rescued++;w.resources.food+=3;u.cooldown=1.5;if(d.survivors===0)report(w,`${d.name}: все гражданские эвакуированы.`);}}
  const safe=w.buildings.find(b=>isReady(b)&&['hq','ammo'].includes(b.kind)&&distance(b,u)<22);
  if(safe&&u.ammo<100&&w.resources.ammo>0){const n=Math.min(dt*5,100-u.ammo,w.resources.ammo);u.ammo+=n;w.resources.ammo-=n;}
  if(u.kind==='medic'&&w.resources.medicine>0){for(const ally of w.units){if(ally.hp>0&&distance(ally,u)<17&&ally.hp<ally.maxHp){const n=Math.min(dt*3,ally.maxHp-ally.hp,w.resources.medicine*5);ally.hp+=n;w.resources.medicine=Math.max(0,w.resources.medicine-n/5);}}}
  if(u.kind==='truck'&&u.cargo&&!u.delivered&&distance(u,{x:-40,z:0})<12){w.resources.materials+=u.cargo;w.resources.ammo+=u.cargo;u.cargo=0;u.delivered=true;report(w,'Конвой доставил материалы и боеприпасы.','good');}
 }
 // Enemy awareness includes weapon noise; larger groups are attracted to firefights.
 for(const z of w.zombies){const oldX=z.x,oldZ=z.z;z.vx=0;z.vz=0;z.cooldown-=dt;let target:Unit|Structure|undefined;let best=Infinity;for(const u of w.units){const d=distance(z,u);if(d<best&&d<(u.cooldown>0?63:40)){target=u;best=d;}}for(const b of w.buildings){const d=distance(z,b);if(d<best&&d<50){target=b;best=d;}}if(!target){const d=districtAt(w,z);if(d.survivors>0&&distance(z,d)>10)move(z,d,ZOMBIE_STATS[z.kind].speed*.25,dt);z.vx=(z.x-oldX)/dt;z.vz=(z.z-oldZ)/dt;continue;}if(best>3.5)move(z,target,ZOMBIE_STATS[z.kind].speed,dt);else if(z.cooldown<=0){const cover='soldiers' in target&&target.order==='garrison'&&w.buildings.some(b=>isReady(b)&&distance(b,target!)<15);target.hp-=ZOMBIE_STATS[z.kind].damage*(cover?.5:1);z.cooldown=1.4;}z.vx=(z.x-oldX)/dt;z.vz=(z.z-oldZ)/dt;}
 for(const b of w.buildings){if(!isReady(b)||b.hp<=0)continue;const def=BUILDINGS[b.kind];const weapon:WeaponKind=b.kind==='mortar'?'mortar':b.kind==='mg'?'machinegun':'rifle';
  if(def.range&&w.resources.power>0&&Math.floor((w.time-dt)/WEAPONS[weapon].cooldown)!==Math.floor(w.time/WEAPONS[weapon].cooldown)&&w.resources.ammo>=1){const enemy=findFireTarget(w,b,def.range,weapon,b.id);if(enemy){fireWeapon(w,b,enemy,weapon,(def.damage||10)*b.level,b.id);w.resources.ammo--;}}
  if(b.kind==='medical'&&w.resources.medicine>0)for(const u of w.units)if(u.hp>0&&distance(b,u)<18&&u.hp<u.maxHp){u.hp=Math.min(u.maxHp,u.hp+dt*2);w.resources.medicine=Math.max(0,w.resources.medicine-dt*.05);}
 }
 advanceProjectiles(w,dt);
 for(const u of w.units){const men=Math.max(0,Math.ceil(u.hp/u.maxHp*UNIT_STATS[u.kind].men));if(men<u.soldiers){if(Math.random()<.35)w.zombies.push(makeZombie(u.x+3,u.z));u.soldiers=men;}if(u.hp<=0)report(w,`${u.name} потерян.${u.cargo?' Груз уничтожен.':''}`,'danger');}
 w.units=w.units.filter(u=>u.hp>0);pruneGroups(w);w.selected=w.selected.filter(id=>w.units.some(u=>u.id===id)||w.buildings.some(b=>b.id===id));
 for(const b of w.buildings)if(b.hp<=0)report(w,`${BUILDINGS[b.kind].label} уничтожен.`,'danger');w.buildings=w.buildings.filter(b=>b.hp>0);
 w.kills+=w.zombies.filter(z=>z.hp<=0).length;w.zombies=w.zombies.filter(z=>z.hp>0);
 if(Math.floor(w.time*2)!==Math.floor((w.time-dt)*2))for(const d of w.districts){const enemies=w.zombies.filter(z=>distance(d,z)<47).length;const friends=w.units.filter(u=>distance(d,u)<42).length;const base=w.buildings.some(b=>isReady(b)&&b.kind==='hq'&&distance(d,b)<35);d.status=(friends||base)?enemies>14?'critical':enemies>4?'threatened':'controlled':enemies>3?'lost':'threatened';if(d.status==='lost'&&enemies>8)d.survivors=Math.max(0,d.survivors-dt*.005);}
 for(const d of w.districts)if(d.status==='controlled'&&d.stock>0){const n=Math.min(dt*.8,d.stock);d.stock-=n;w.resources.materials+=n;w.resources.food+=n*.3;}
 const surrounded=w.zombies.filter(z=>distance(z,{x:-40,z:0})<30).length>12;
 w.resources.food=Math.max(0,w.resources.food-dt*w.units.reduce((n,u)=>n+u.soldiers,0)*.009);if(w.resources.food<=0)for(const u of w.units){u.hp-=dt*.35;u.morale=Math.max(0,u.morale-dt*.1);}
 w.resources.power=Math.max(0,w.resources.power-dt*w.buildings.length*.008);
 for(const b of w.buildings){if(!isReady(b))continue;if(b.kind==='workshop'&&w.resources.materials>0)for(const u of w.units)if(['humvee','tank','truck'].includes(u.kind)&&distance(u,b)<22&&u.hp<u.maxHp){const repair=Math.min(dt*4,u.maxHp-u.hp,w.resources.materials*10);u.hp+=repair;w.resources.materials=Math.max(0,w.resources.materials-repair/10);}if(b.kind==='generator'&&w.resources.fuel>0){w.resources.power=Math.min(200,w.resources.power+dt);w.resources.fuel=Math.max(0,w.resources.fuel-dt*.04);}if(!surrounded&&b.kind==='fuel')w.resources.fuel+=dt*.3;if(!surrounded&&b.kind==='ammo')w.resources.ammo+=dt*.6;}
 if(w.time>w.nextEvent){w.nextEvent=w.time+70;const roll=Math.floor(Math.random()*4);if(roll===0){for(let i=0;i<30&&w.zombies.length<MAP.maxZombies;i++)w.zombies.push(makeZombie(MAP.maxX-15+Math.random()*10,MAP.minZ+20+Math.random()*(MAP.depth-40),i===0&&w.time>200?'alpha':i%7===0?'runner':'walker'));report(w,'Разведка: новая орда на восточной границе.','danger');}else if(roll===1){const d=w.districts[Math.floor(Math.random()*12)];d.survivors+=8;report(w,`Сигнал SOS: ещё 8 выживших в ${d.name}.`,'warn');}else if(roll===2){const u=w.units.find(u=>u.kind==='humvee');if(u){u.hp=Math.max(1,u.hp-45);report(w,'VIKING: повреждение двигателя. Нужен ремонт.','warn');}}else{w.resources.food+=35;report(w,'Обнаружен тайник с продовольствием. +35','good');}}
 if(!w.buildings.some(b=>isReady(b)&&b.kind==='hq')||!w.units.length){w.outcome='lost';report(w,'Операция провалена. Командование потеряно.','danger');}
 const checks=[w.buildings.filter(isReady).length>=4,w.rescued>=15,w.units.some(u=>u.delivered),w.rescued>=40&&w.districts.filter(d=>d.status==='controlled').length>=3];if(checks[w.phase]){w.phase++;w.resources.materials+=80;report(w,'Задача выполнена. Резерв командования: +80 материалов.','good');if(w.phase>=4)w.outcome='won';}
}
