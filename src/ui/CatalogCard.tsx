import ResourceIcon from './ResourceIcon';
import type {ReactNode} from 'react';
import HoverInfo from './HoverInfo';
export default function CatalogCard({label,description,cost,extra,icon,active,onAction,onInfo,hint}:{label:string;description:string;cost:number;extra:string;icon:string;active?:boolean;onAction:()=>void;onInfo:()=>void;hint?:ReactNode}){
 return <HoverInfo content={hint||<><div className="hint-heading"><b>{label}</b></div><p>{description}</p><small>Кнопка i — характеристики.</small></>}>{events=><article {...events} className={`catalog-card ${active?'selected':''}`}><button className="catalog-action" onClick={onAction}><span>{icon}</span><b>{label}</b><small><ResourceIcon kind="materials"/>{cost} · {icon==='⛨'&&<ResourceIcon kind="food"/>}{extra}</small></button><button className="catalog-info" onClick={onInfo} aria-label={`Описание: ${label}`} title="Описание и характеристики">i</button></article>}</HoverInfo>;
}
