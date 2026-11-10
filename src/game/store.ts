import {create} from 'zustand';
import type {World,Point,Order,UnitKind} from './types';
import {createWorld,makeUnit,restoreWorld} from './world';
import {build,report,tick} from './systems';
import {UNIT_STATS} from './data';
import {MAP,clampToMap} from './mapConfig';
import {fireWeapon} from './ballistics';
import {isReady} from './construction';
const KEY='dead-tide-save-v1';
export const useGame=create<{world:World; revision:number; mutate:(fn:(w:World)=>void)=>void; step:(dt:number)=>void; reset:()=>void; save:()=>void;load:()=>void}>(set=>({world:createWorld(),revision:0,mutate:fn=>set(s=>{fn(s.world);return {revision:s.revision+1};}),step:dt=>set(s=>{tick(s.world,dt);return {revision:s.revision+1};}),reset:()=>set({world:createWorld()}),save:()=>set(s=>{try{localStorage.setItem(KEY,JSON.stringify({...s.world,shots:[],buildMode:null}));report(s.world,'Операция сохранена.','good');}catch{report(s.world,'Не удалось сохранить: хранилище браузера недоступно.','danger');}return {revision:s.revision+1};}),load:()=>set(s=>{try{const data=restoreWorld(JSON.parse(localStorage.getItem(KEY)||'null'));report(data,'Операция восстановлена.');return {world:data};}catch{report(s.world,'Корректное сохранение не найдено.','warn');return {revision:s.revision+1};}})}));
export function orderTo(p:Point,order:Order='move'){useGame.getState().mutate(w=>{for(const u of w.units.filter(u=>w.selected.includes(u.id))){u.target=clampToMap(p);u.order=order;}w.buildMode=null;});}
export function placeBuilding(p:Point){useGame.getState().mutate(w=>{if(w.buildMode&&build(w,w.buildMode,p))w.buildMode=null;});}
export function recruit(kind:UnitKind){useGame.getState().mutate(w=>{const hq=w.buildings.find(b=>isReady(b)&&b.kind==='hq');if(!hq)return;if(w.resources.materials<UNIT_STATS[kind].cost||w.resources.food<20){report(w,'Недостаточно материалов или продовольствия.','warn');return;}w.resources.materials-=UNIT_STATS[kind].cost;w.resources.food-=20;w.units.push(makeUnit(kind,hq.x+8,hq.z+8));report(w,`Подкрепление: ${UNIT_STATS[kind].label}.`,'good');});}
export function convoy(){useGame.getState().mutate(w=>{if(w.units.some(u=>u.kind==='truck'&&!u.delivered)){report(w,'Конвой уже в пути.','warn');return;}if(w.resources.fuel<40){report(w,'Нужно 40 топлива.','warn');return;}w.resources.fuel-=40;const u=makeUnit('truck',MAP.convoyX,0,'SUPPLY · Конвой');u.cargo=120;u.target={x:-40,z:0};u.order='move';w.units.push(u);report(w,'Конвой отправлен с западной границы. Прикройте маршрут.');});}
export function support(p:Point){useGame.getState().mutate(w=>{if(w.resources.ammo<100){report(w,'Огневая поддержка требует 100 боеприпасов.','warn');return;}w.resources.ammo-=100;const target=clampToMap(p);fireWeapon(w,{x:target.x-40,z:target.z-45},target,'artillery',180);report(w,'Огневая поддержка: снаряд в пути.','warn');});}
