import type {World,Structure,Point} from './types';
import {BUILDINGS,BUILDING_SIZE} from './data';
import {CITY_BUILDINGS} from './cityLayout';
import {MAP} from './mapConfig';
export const isReady=(b:Structure)=>!b.construction;
export const constructionProgress=(b:Structure)=>b.construction?Math.min(1,b.construction.elapsed/b.construction.duration):1;
export function placementError(w:World,kind:string,p:Point):string|null{
 const def=BUILDINGS[kind];if(!def)return 'Неизвестное сооружение.';
 const [sx,sz]=BUILDING_SIZE[kind];
 if(p.x-sx/2<MAP.minX+1||p.x+sx/2>MAP.maxX-1||p.z-sz/2<MAP.minZ+1||p.z+sz/2>MAP.maxZ-1)return 'Строительство за пределами сектора недоступно.';
 if(w.resources.materials<def.cost)return 'Недостаточно строительных материалов.';
 if(!w.units.some(u=>u.kind==='engineer'&&u.hp>0&&Math.hypot(u.x-p.x,u.z-p.z)<38))return 'Нужны инженеры в радиусе 38 м.';
 if(w.buildings.some(b=>{const [bx,bz]=BUILDING_SIZE[b.kind];return Math.abs(b.x-p.x)<(bx+sx)/2+1&&Math.abs(b.z-p.z)<(bz+sz)/2+1;}))return 'Площадка пересекается с другим сооружением.';
 if(CITY_BUILDINGS.some(b=>Math.abs(b.x-p.x)<(b.width+sx)/2+1&&Math.abs(b.z-p.z)<(b.depth+sz)/2+1))return 'Площадка занята городским зданием.';
 return null;
}
// Each engineer squad works on exactly one nearest site, so queuing sites has a real cost.
export function constructionCrew(w:World):Map<string,number>{
 const crew=new Map<string,number>();
 for(const u of w.units){if(u.kind!=='engineer'||u.hp<=0||u.soldiers<=0)continue;
  let site:Structure|undefined,best=38;
  for(const b of w.buildings){if(!b.construction||b.hp<=0)continue;const d=Math.hypot(u.x-b.x,u.z-b.z);if(d<best){site=b;best=d;}}
  if(site)crew.set(site.id,(crew.get(site.id)||0)+u.soldiers/4);
 }return crew;
}
export function advanceConstruction(w:World,dt:number):Structure[]{
 const crew=constructionCrew(w),completed:Structure[]=[];
 for(const b of w.buildings){if(!b.construction||b.hp<=0)continue;const c=b.construction;const work=Math.min(c.duration-c.elapsed,dt*Math.min(2,crew.get(b.id)||0));c.elapsed+=work;
  b.hp=Math.min(b.maxHp,b.hp+work/c.duration*b.maxHp*.8);
  if(c.duration-c.elapsed<1e-8){delete b.construction;completed.push(b);}
 }return completed;
}
export function cancelConstruction(w:World,id:string):number{
 const b=w.buildings.find(b=>b.id===id);if(!b?.construction)return 0;
 const refund=Math.floor(BUILDINGS[b.kind].cost*.65*(1-constructionProgress(b)));w.resources.materials+=refund;w.buildings=w.buildings.filter(b=>b.id!==id);w.selected=w.selected.filter(v=>v!==id);return refund;
}
