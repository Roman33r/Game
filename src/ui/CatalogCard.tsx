import ResourceIcon from './ResourceIcon';
export default function CatalogCard({label,description,cost,extra,icon,active,onAction,onInfo}:{label:string;description:string;cost:number;extra:string;icon:string;active?:boolean;onAction:()=>void;onInfo:()=>void}){
 return <article className={`catalog-card ${active?'selected':''}`}><button className="catalog-action" onClick={onAction} title={`${label}. ${description}`}><span>{icon}</span><b>{label}</b><small><ResourceIcon kind="materials"/>{cost} · {icon==='⛨'&&<ResourceIcon kind="food"/>}{extra}</small></button><button className="catalog-info" onClick={onInfo} aria-label={`Описание: ${label}`} title="Описание и характеристики">i</button></article>;
}
