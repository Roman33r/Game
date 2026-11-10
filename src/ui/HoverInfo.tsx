import {useEffect,useId,useLayoutEffect,useRef,useState} from 'react';
import type {HTMLAttributes,ReactNode} from 'react';
import {createPortal} from 'react-dom';
export interface HintAnchor {x:number;y:number;aboveY?:number}
export function Tooltip({children,anchor,id}:{children:ReactNode;anchor:HintAnchor;id?:string}){
 const ref=useRef<HTMLDivElement>(null),[position,setPosition]=useState({left:0,top:0,ready:false});
 useLayoutEffect(()=>{const el=ref.current;if(!el)return;const r=el.getBoundingClientRect(),width=document.documentElement.clientWidth,height=document.documentElement.clientHeight;const left=Math.max(10,Math.min(width-r.width-10,anchor.x));const top=anchor.y+r.height>height-10?Math.max(10,(anchor.aboveY??anchor.y)-r.height-10):Math.max(10,anchor.y);setPosition({left,top,ready:true});},[anchor.x,anchor.y,anchor.aboveY,children]);
 return createPortal(<div ref={ref} id={id} role="tooltip" className="hover-info" style={{left:position.left,top:position.top,visibility:position.ready?'visible':'hidden'}}>{children}</div>,document.body);
}
export default function HoverInfo({content,children}:{content:ReactNode;children:(events:HTMLAttributes<HTMLElement>)=>ReactNode}){
 const id=useId(),timer=useRef<ReturnType<typeof setTimeout>|null>(null),[anchor,setAnchor]=useState<HintAnchor|null>(null);
 const cancel=()=>{if(timer.current)clearTimeout(timer.current);timer.current=null;};
 const close=()=>{cancel();setAnchor(null);};
 const show=(element:HTMLElement,delay:number)=>{cancel();const r=element.getBoundingClientRect(),next={x:r.left,y:r.bottom+8,aboveY:r.top};if(delay)timer.current=setTimeout(()=>setAnchor(next),delay);else setAnchor(next);};
 useEffect(()=>{const escape=(e:KeyboardEvent)=>{if(e.key==='Escape')close();};window.addEventListener('keydown',escape);window.addEventListener('scroll',close,true);return()=>{cancel();window.removeEventListener('keydown',escape);window.removeEventListener('scroll',close,true);};},[]);
 return <>{children({onMouseEnter:e=>show(e.currentTarget,180),onMouseLeave:close,onMouseDown:close,onFocus:e=>show(e.currentTarget,0),onBlur:close,'aria-describedby':anchor?id:undefined})}{anchor&&<Tooltip anchor={anchor} id={id}>{content}</Tooltip>}</>;
}
