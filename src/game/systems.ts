import type {World,Point,Unit,Structure} from './types';
import {BUILDINGS,UNIT_STATS,ZOMBIE_STATS} from './data';
import {makeZombie,uid} from './world';
import {placementError,isReady,advanceConstruction} from './construction';
export const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);
export const report=(w:World,text:string,type='info')=>{w.log.unshift({time:w.time,text,type});w.log=w.log.slice(0,45);};
export const districtAt=(w:World,p:Point)=>w.districts.reduce((a,b)=>distance(a,p)<distance(b,p)?a:b);
export const visible=(w:World,p:Point)=>w.units.some(u=>distance(u,p)<(u.kind==='scout'?60:44))||w.buildings.some(b=>isReady(b)&&b.kind==='hq'&&distance(b,p)<55);
function move(p:Point,to:Point,speed:number,dt:number){const d=distance(p,to);if(d<.5)return;const f=Math.min(1,speed*dt/d);p.x+=(to.x-p.x)*f;p.z+=(to.z-p.z)*f;}
export function build(w:World,kind:string,p:Point){
 const error=placementError(w,kind,p);if(error){report(w,error,'warn');return false;}
 const def=BUILDINGS[kind];w.resources.materials-=def.cost;
 const site:Structure={id:uid(),kind,...p,hp:def.hp*.2,maxHp:def.hp,level:1,construction:{elapsed:0,duration:def.buildTime}};
 w.buildings.push(site);w.selected=[site.id];report(w,`${def.label}: стройка начата · ${def.buildTime} сек.`);return true;
}
export function shoot(w:World,a:Point,b:Point,color='#f8d18a'){w.shots.push({from:{x:a.x,z:a.z},to:{x:b.x,z:b.z},color,life:.18});}
export function tick(w:World,dt:number){
 if(w.paused||w.outcome)return;dt=Math.min(dt,.25)*w.speed;w.time+=dt;w.shots=w.shots.filter(s=>(s.life-=dt)>0);
 for(const b of advanceConstruction(w,dt))report(w,`${BUILDINGS[b.kind].label}: строительство завершено.`,'good');
 // Unit controller, combat, rescue and logistics all operate on the same world.
 for(const u of w.units){
  if(u.hp<=0)continue;
  if(u.order==='escort'){const truck=w.units.find(t=>t.kind==='truck'&&!t.delivered);u.target=truck?{x:truck.x-7,z:truck.z+5}:undefined;}
  const s=UNIT_STATS[u.kind];u.cooldown-=dt;
  if(u.target){if(!['humvee','tank','truck'].includes(u.kind)||w.resources.fuel>0){move(u,u.target,s.speed,dt);if(['humvee','tank','truck'].includes(u.kind))w.resources.fuel=Math.max(0,w.resources.fuel-dt*.14);}if(distance(u,u.target)<2){u.target=undefined;if(u.order==='move'||u.order==='retreat')u.order='hold';}}
  const enemy=w.zombies.filter(z=>distance(u,z)<s.range).sort((a,b)=>distance(u,a)-distance(u,b))[0];
  if(enemy&&u.cooldown<=0&&u.ammo>0&&s.damage){enemy.hp-=s.damage*(u.soldiers/s.men)*(.5+u.morale/200);u.ammo=Math.max(0,u.ammo-1);shoot(w,u,enemy);u.cooldown=u.kind==='tank'?2.5:.8;u.morale=Math.max(20,u.morale-.04);}
  if(u.order==='rescue'){const d=districtAt(w,u);if(distance(d,u)<21&&d.survivors>0&&!w.zombies.some(z=>distance(z,u)<18)&&u.cooldown<=0){d.survivors=Math.max(0,d.survivors-1);d.rescued++;w.rescued++;w.resources.food+=3;u.cooldown=1.5;if(d.survivors===0)report(w,`${d.name}: все гражданские эвакуированы.`);}}
  const safe=w.buildings.find(b=>isReady(b)&&['hq','ammo'].includes(b.kind)&&distance(b,u)<22);
  if(safe&&u.ammo<100&&w.resources.ammo>0){const n=Math.min(dt*5,100-u.ammo,w.resources.ammo);u.ammo+=n;w.resources.ammo-=n;}
  if(u.kind==='medic'&&w.resources.medicine>0){for(const ally of w.units){if(distance(ally,u)<17&&ally.hp<ally.maxHp){const n=Math.min(dt*3,ally.maxHp-ally.hp,w.resources.medicine*5);ally.hp+=n;w.resources.medicine=Math.max(0,w.resources.medicine-n/5);}}}
  if(u.kind==='truck'&&u.cargo&&!u.delivered&&distance(u,{x:-40,z:0})<12){w.resources.materials+=u.cargo;w.resources.ammo+=u.cargo;u.cargo=0;u.delivered=true;report(w,'Конвой доставил материалы и боеприпасы.','good');}
 }
 // Enemy awareness includes weapon noise; larger groups are attracted to firefights.
 for(const z of w.zombies){z.cooldown-=dt;let target:Unit|Structure|undefined;let best=Infinity;for(const u of w.units){const d=distance(z,u);if(d<best&&d<(u.cooldown>0?63:40)){target=u;best=d;}}for(const b of w.buildings){const d=distance(z,b);if(d<best&&d<50){target=b;best=d;}}if(!target){const d=districtAt(w,z);if(d.survivors>0&&distance(z,d)>10)move(z,d,ZOMBIE_STATS[z.kind].speed*.25,dt);continue;}if(best>3.5)move(z,target,ZOMBIE_STATS[z.kind].speed,dt);else if(z.cooldown<=0){const cover='soldiers' in target&&target.order==='garrison'&&w.buildings.some(b=>isReady(b)&&distance(b,target!)<15);target.hp-=ZOMBIE_STATS[z.kind].damage*(cover?.5:1);z.cooldown=1.4;}}
 for(const b of w.buildings){if(!isReady(b)||b.hp<=0)continue;const def=BUILDINGS[b.kind];if(def.range&&w.resources.power>0&&Math.floor((w.time-dt)*1.3)!==Math.floor(w.time*1.3)&&w.resources.ammo>0){const e=w.zombies.find(z=>distance(z,b)<def.range!);if(e){e.hp-=(def.damage||10)*b.level;w.resources.ammo=Math.max(0,w.resources.ammo-1);shoot(w,b,e);}}if(b.kind==='medical'&&w.resources.medicine>0)for(const u of w.units)if(distance(b,u)<18&&u.hp<u.maxHp){u.hp=Math.min(u.maxHp,u.hp+dt*2);w.resources.medicine=Math.max(0,w.resources.medicine-dt*.05);}}
 for(const u of w.units){const men=Math.max(0,Math.ceil(u.hp/u.maxHp*UNIT_STATS[u.kind].men));if(men<u.soldiers){if(Math.random()<.35)w.zombies.push(makeZombie(u.x+3,u.z));u.soldiers=men;}if(u.hp<=0)report(w,`${u.name} потерян.${u.cargo?' Груз уничтожен.':''}`,'danger');}
 w.units=w.units.filter(u=>u.hp>0);w.selected=w.selected.filter(id=>w.units.some(u=>u.id===id)||w.buildings.some(b=>b.id===id));
 for(const b of w.buildings)if(b.hp<=0)report(w,`${BUILDINGS[b.kind].label} уничтожен.`,'danger');w.buildings=w.buildings.filter(b=>b.hp>0);
 w.kills+=w.zombies.filter(z=>z.hp<=0).length;w.zombies=w.zombies.filter(z=>z.hp>0);
 for(const d of w.districts){const enemies=w.zombies.filter(z=>distance(d,z)<47).length;const friends=w.units.filter(u=>distance(d,u)<42).length;const base=w.buildings.some(b=>isReady(b)&&b.kind==='hq'&&distance(d,b)<35);d.status=(friends||base)?enemies>14?'critical':enemies>4?'threatened':'controlled':enemies>3?'lost':'threatened';if(d.status==='lost'&&enemies>8)d.survivors=Math.max(0,d.survivors-dt*.005);}
 for(const d of w.districts)if(d.status==='controlled'&&d.stock>0){const n=Math.min(dt*.8,d.stock);d.stock-=n;w.resources.materials+=n;w.resources.food+=n*.3;}
 const surrounded=w.zombies.filter(z=>distance(z,{x:-40,z:0})<30).length>12;
 w.resources.food=Math.max(0,w.resources.food-dt*w.units.reduce((n,u)=>n+u.soldiers,0)*.009);if(w.resources.food<=0)for(const u of w.units){u.hp-=dt*.35;u.morale=Math.max(0,u.morale-dt*.1);}
 w.resources.power=Math.max(0,w.resources.power-dt*w.buildings.length*.008);
 for(const b of w.buildings){if(!isReady(b))continue;if(b.kind==='workshop'&&w.resources.materials>0)for(const u of w.units)if(['humvee','tank','truck'].includes(u.kind)&&distance(u,b)<22&&u.hp<u.maxHp){const repair=Math.min(dt*4,u.maxHp-u.hp,w.resources.materials*10);u.hp+=repair;w.resources.materials=Math.max(0,w.resources.materials-repair/10);}if(b.kind==='generator'&&w.resources.fuel>0){w.resources.power=Math.min(200,w.resources.power+dt);w.resources.fuel=Math.max(0,w.resources.fuel-dt*.04);}if(!surrounded&&b.kind==='fuel')w.resources.fuel+=dt*.3;if(!surrounded&&b.kind==='ammo')w.resources.ammo+=dt*.6;}
 if(w.time>w.nextEvent){w.nextEvent=w.time+70;const roll=Math.floor(Math.random()*4);if(roll===0){for(let i=0;i<30&&w.zombies.length<1200;i++)w.zombies.push(makeZombie(145+Math.random()*10,-100+Math.random()*200,i===0&&w.time>200?'alpha':i%7===0?'runner':'walker'));report(w,'Разведка: новая орда на восточной границе.','danger');}else if(roll===1){const d=w.districts[Math.floor(Math.random()*12)];d.survivors+=8;report(w,`Сигнал SOS: ещё 8 выживших в ${d.name}.`,'warn');}else if(roll===2){const u=w.units.find(u=>u.kind==='humvee');if(u){u.hp=Math.max(1,u.hp-45);report(w,'VIKING: повреждение двигателя. Нужен ремонт.','warn');}}else{w.resources.food+=35;report(w,'Обнаружен тайник с продовольствием. +35','good');}}
 if(!w.buildings.some(b=>isReady(b)&&b.kind==='hq')||!w.units.length){w.outcome='lost';report(w,'Операция провалена. Командование потеряно.','danger');}
 const checks=[w.buildings.filter(isReady).length>=4,w.rescued>=15,w.units.some(u=>u.delivered),w.rescued>=40&&w.districts.filter(d=>d.status==='controlled').length>=3];if(checks[w.phase]){w.phase++;w.resources.materials+=80;report(w,'Задача выполнена. Резерв командования: +80 материалов.','good');if(w.phase>=4)w.outcome='won';}
}
