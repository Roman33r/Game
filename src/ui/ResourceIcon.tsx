import type {Resource} from '../game/types';
export default function ResourceIcon({kind,className=''}:{kind:Resource;className?:string}){
 const shapes:Record<Resource,React.ReactNode>={
 fuel:<><path d="M7 6V3h7l3 3v15H5V8l2-2Z"/><path d="M8 3v3h6M9 10l5 7m0-7-5 7M5 8 3 6l2-3"/></>,
 ammo:<><path d="M5 21V9l3-6 3 6v12H5Zm9 0V11l3-6 3 6v10h-6Z"/><path d="M5 9h6m3 2h6M5 18h6m3 0h6"/></>,
 food:<><path d="M6 7h12v14H6zM8 3h8v4M6 11h12"/><path d="M10 14v4m4-4v4M8 3v4m8-4v4"/></>,
 medicine:<><path d="M4 8h16v13H4zM8 8V4h8v4"/><path d="M12 11v7m-3-3.5h6"/></>,
 materials:<><path d="M3 5h18v5H3zM3 10h18v5H3zM3 15h18v5H3z"/><path d="M9 5v5m6 0v5m-6 0v5"/></>,
 power:<><path d="M7 4H4v17h16V4h-3M9 2h6v3H9z"/><path d="m13 7-5 7h5l-2 5 6-8h-5l1-4Z"/></>
 };
 return <svg className={`resource-icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{shapes[kind]}</svg>;
}
