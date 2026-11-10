import type {Unit,Order} from '../game/types';
import {UNIT_INFO,unitCharacteristics,unitDamage} from '../game/intel';
import {UNIT_STATS} from '../game/data';
import {ORDER_LABELS as labels} from '../game/commands';
export default function UnitDetails({units,onOrder,onFocus,onInfo}:{units:Unit[];onOrder:(order:Order)=>void;onFocus:()=>void;onInfo:(kind:Unit['kind'])=>void}){
 const u=units[0],multi=units.length>1,men=units.reduce((n,u)=>n+u.soldiers,0),hp=units.reduce((n,u)=>n+u.hp,0),maxHp=units.reduce((n,u)=>n+u.maxHp,0),ammo=units.reduce((n,u)=>n+u.ammo,0)/units.length,morale=units.reduce((n,u)=>n+u.morale,0)/units.length;
 const rows=multi?[{label:'Отряды / бойцы',value:`${units.length} / ${men}`},{label:'Общее здоровье',value:`${Math.ceil(hp)} / ${maxHp}`},{label:'Средний боезапас',value:`${Math.floor(ammo)}%`},{label:'Средняя мораль',value:`${Math.floor(morale)}%`},{label:'Суммарный урон залпа',value:units.reduce((n,u)=>n+unitDamage(u),0).toFixed(1)},{label:'Скорость отрядов',value:`${Math.min(...units.map(u=>UNIT_STATS[u.kind].speed))}–${Math.max(...units.map(u=>UNIT_STATS[u.kind].speed))} м/с`}]:unitCharacteristics(u.kind,u);
 return <><div className="detail-title"><small>{multi?'JOINT TASK FORCE / MULTI SELECT':UNIT_INFO[u.kind].role}</small><h2>{multi?`Группа · ${units.length} отрядов`:u.name}</h2><span className="badge">{multi?'ОБЩИЕ ПРИКАЗЫ':labels[u.order]}</span></div>
  <p className="entity-description">{multi?'Все приказы применяются к выбранным отрядам. При движении каждый занимает отдельную позицию.':UNIT_INFO[u.kind].description}</p>
  {multi&&<div className="selection-members">{units.map(unit=><button key={unit.id} onClick={()=>onInfo(unit.kind)} title="Описание типа подразделения">{unit.name}<span>{unit.soldiers} чел.</span></button>)}</div>}
  <div className="stats">{!multi&&<><div>Боезапас<b>{Math.floor(u.ammo)}%</b></div><div>Мораль<b>{Math.floor(u.morale)}%</b></div></>}{rows.map(row=><div key={row.label}><span>{row.label}</span><b>{row.value}</b></div>)}</div>
  {!multi&&<><p className="ability-note">{UNIT_INFO[u.kind].ability}</p><button className="wide subtle" onClick={()=>onInfo(u.kind)}>i Справка о подразделении</button></>}
  <div className="subheading">{multi?'ПРИКАЗЫ ВСЕЙ ГРУППЕ':'ПРИКАЗЫ ПОДРАЗДЕЛЕНИЮ'}</div><div className="action-grid"><button onClick={()=>onOrder('hold')}>⊙ Удерживать</button><button onClick={()=>onOrder('rescue')}>♧ Спасать район</button><button onClick={()=>onOrder('retreat')}>↙ Отступать</button><button onClick={()=>onOrder('garrison')}>▣ Гарнизон</button><button onClick={()=>onOrder('escort')}>⇄ Сопроводить</button><button onClick={onFocus}>⌖ Найти группу</button></div><p className="hint">ЛКМ + протяжка — рамка. Shift + клик — добавить или убрать. ПКМ — общий приказ движения. Средняя кнопка / Alt + протяжка — камера.</p>
 </>;
}
