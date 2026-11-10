import {useGame} from '../game/store';
import type {Structure} from '../game/types';
import {BUILD_RADIUS} from '../game/mapConfig';
import {BUILDINGS} from '../game/data';
import {cancelConstruction,constructionCrew,constructionProgress,isReady} from '../game/construction';
import {report} from '../game/systems';
import {BUILDING_INFO,buildingCharacteristics} from '../game/intel';
import ResourceIcon from './ResourceIcon';
export default function StructureDetails({structure:b}:{structure:Structure}){
 const {world:w,mutate}=useGame();const ready=isReady(b),progress=constructionProgress(b),rate=Math.min(2,constructionCrew(w).get(b.id)||0);
 const remaining=b.construction?Math.ceil((b.construction.duration-b.construction.elapsed)/Math.max(.01,rate)):0;
 const refund=Math.floor(BUILDINGS[b.kind].cost*.65*(1-progress));
 return <><div className="detail-title"><small>{ready?'FORWARD OPERATING BASE':'ENGINEERING / CONSTRUCTION'}</small><h2>{BUILDINGS[b.kind].label}</h2><span className={`badge ${!ready?'building-badge':''}`}>{ready?`УРОВЕНЬ ${b.level}`:rate?'СТРОИТСЯ':'ОЖИДАНИЕ ИНЖЕНЕРОВ'}</span></div>
  <p className="entity-description">{BUILDING_INFO[b.kind].description}</p>
  {!ready&&<div className="construction-detail"><div><b>{Math.floor(progress*100)}%</b><span>{w.paused?'ПАУЗА':rate?`≈ ${remaining} с`:'РАБОТЫ ОСТАНОВЛЕНЫ'}</span></div><div className="construction-meter"><i style={{width:`${progress*100}%`}}/></div><p>{rate?'Инженеры возводят объект. Он начнёт работать после завершения.':`Держите инженеров в радиусе ${BUILD_RADIUS} м. Каждый отряд строит один ближайший объект.`}</p></div>}
  <div className="stats">{buildingCharacteristics(b.kind,b).map(row=><div key={row.label}><span>{row.label}</span><b>{row.value}</b></div>)}{!ready&&<><div>Объём работ<b>{Math.floor(b.construction!.elapsed)} / {b.construction!.duration} с</b></div><div>Инженерные бригады<b>{rate.toFixed(1)}</b></div></>}</div><p className="ability-note">{BUILDING_INFO[b.kind].effect}</p>
  {ready?<><button className="wide" onClick={()=>mutate(w=>{if(!isReady(b))return;if(w.resources.materials<60){report(w,'Для улучшения нужно 60 материалов.','warn');return;}w.resources.materials-=60;b.level++;b.maxHp+=200;b.hp=b.maxHp;})}>Улучшить · 60 <ResourceIcon kind="materials"/></button><button className="wide subtle" onClick={()=>mutate(w=>{if(!isReady(b))return;if(w.resources.materials>=20){w.resources.materials-=20;b.hp=b.maxHp;}else report(w,'Для ремонта нужно 20 материалов.','warn');})}>Ремонт · 20 <ResourceIcon kind="materials"/></button></>:<><button className="wide subtle" onClick={()=>mutate(w=>{const n=cancelConstruction(w,b.id);report(w,`Стройка отменена. Возврат: ${n} материалов.`,'warn');})}>Отменить стройку · вернуть {refund} <ResourceIcon kind="materials"/></button><p className="hint">Материалы зарезервированы. При отмене вернётся 65% стоимости невыполненных работ. Стройплощадку могут уничтожить.</p></>}
 </>;
}
