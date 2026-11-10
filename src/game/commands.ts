import type {World,Unit,Point,Order} from './types';
import {MAP,clampToMap} from './mapConfig';
import {isReady} from './construction';
export const GROUP_KEYS=['4','5','6','7','8','9'];
export const ORDER_LABELS:Record<Order,string>={move:'В пути',attack:'Атака',rescue:'Эвакуация',hold:'Удержание',retreat:'Отступление',escort:'Сопровождение',garrison:'Гарнизон'};
export function groupKey(event:{code:string;key:string}):string{return /^(Digit|Numpad)([4-9])$/.exec(event.code)?.[2]||(/^[4-9]$/.test(event.key)?event.key:'');}
export const selectedUnits=(w:World)=>w.units.filter(u=>u.hp>0&&w.selected.includes(u.id));
export function selectUnits(w:World,ids:string[],mode:'replace'|'add'|'toggle'='replace'){
 const valid=new Set(w.units.filter(u=>u.hp>0).map(u=>u.id)),incoming=[...new Set(ids)].filter(id=>valid.has(id));
 const selection=mode==='replace'?new Set<string>():new Set(w.selected.filter(id=>valid.has(id)));
 for(const id of incoming){if(mode==='toggle'&&selection.has(id))selection.delete(id);else selection.add(id);}w.selected=[...selection];
}
export function selectionCentre(units:Unit[]):Point{return units.length?{x:units.reduce((n,u)=>n+u.x,0)/units.length,z:units.reduce((n,u)=>n+u.z,0)/units.length}:{x:-40,z:0};}
export function storeGroup(w:World,key:string):boolean{if(!GROUP_KEYS.includes(key))return false;const ids=selectedUnits(w).map(u=>u.id);if(!ids.length)return false;w.groups[key]=ids;return true;}
export function recallGroup(w:World,key:string,add=false):boolean{const alive=new Set(w.units.filter(u=>u.hp>0).map(u=>u.id));const ids=(w.groups[key]||[]).filter(id=>alive.has(id));if(!ids.length)return false;selectUnits(w,ids,add?'add':'replace');w.buildMode=null;return true;}
export function pruneGroups(w:World){const alive=new Set(w.units.filter(u=>u.hp>0).map(u=>u.id));for(const key of Object.keys(w.groups))w.groups[key]=[...new Set(w.groups[key])].filter(id=>alive.has(id));}
export function formationPoints(count:number,p:Point,spacing=6):Point[]{
 if(!count)return [];const columns=Math.ceil(Math.sqrt(count)),rows=Math.ceil(count/columns),marginX=(columns-1)*spacing/2,marginZ=(rows-1)*spacing/2;
 const centre={x:Math.max(MAP.minX+3+marginX,Math.min(MAP.maxX-3-marginX,p.x)),z:Math.max(MAP.minZ+3+marginZ,Math.min(MAP.maxZ-3-marginZ,p.z))};
 return Array.from({length:count},(_,i)=>({x:centre.x+(i%columns-(columns-1)/2)*spacing,z:centre.z+(Math.floor(i/columns)-(rows-1)/2)*spacing}));
}
export function issueOrder(w:World,order:Order,p?:Point):string|null{
 let units=selectedUnits(w);if(!units.length)return 'Сначала выберите один или несколько отрядов.';
 let target=p;const centre=selectionCentre(units);
 if(order==='retreat'||order==='garrison'){
  const bases=w.buildings.filter(b=>b.hp>0&&isReady(b)&&(order==='garrison'||b.kind==='hq')).sort((a,b)=>Math.hypot(a.x-centre.x,a.z-centre.z)-Math.hypot(b.x-centre.x,b.z-centre.z));
  if(!bases.length)return 'Нет готового объекта для этого приказа.';target={x:bases[0].x+7,z:bases[0].z+7};
 }
 if(order==='escort'){
  const truck=w.units.find(u=>u.kind==='truck'&&u.hp>0&&!u.delivered);if(!truck)return 'Сначала отправьте конвой из раздела снабжения.';
  units=units.filter(u=>u.id!==truck.id);if(!units.length)return 'Для охраны выберите боевые отряды.';target={x:truck.x-9,z:truck.z};
 }
 if(order!=='hold'&&!target)return 'Укажите точку назначения на карте.';
 const points=target?formationPoints(units.length,clampToMap(target)):[];
 units.forEach((u,i)=>{u.order=order;u.target=order==='hold'?undefined:points[i];delete u.escortOffset;if(order==='escort'&&target)u.escortOffset={x:points[i].x-target.x-9,z:points[i].z-target.z};});w.buildMode=null;return null;
}
export function unitsInRectangle(units:Unit[],project:(u:Unit)=>Point,start:Point,end:Point):string[]{return units.filter(u=>{if(u.hp<=0)return false;const p=project(u);return p.x>=Math.min(start.x,end.x)&&p.x<=Math.max(start.x,end.x)&&p.z>=Math.min(start.z,end.z)&&p.z<=Math.max(start.z,end.z);}).map(u=>u.id);}
