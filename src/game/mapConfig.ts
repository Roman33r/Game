export const MAP={minX:-320,maxX:320,minZ:-200,maxZ:200,width:640,depth:400,columns:8,rows:5,sectorSize:80,roadSpacing:40,convoyX:-310,maxZombies:1800} as const;
export const BUILD_RADIUS=90;
export const BASE_CLEARING={x:-40,z:0,width:160,depth:120} as const;
export const inBaseClearing=(p:{x:number;z:number})=>Math.abs(p.x-BASE_CLEARING.x)<BASE_CLEARING.width/2&&Math.abs(p.z-BASE_CLEARING.z)<BASE_CLEARING.depth/2;
export const clampToMap=(p:{x:number;z:number})=>({x:Math.max(MAP.minX+3,Math.min(MAP.maxX-3,p.x)),z:Math.max(MAP.minZ+3,Math.min(MAP.maxZ-3,p.z))});
