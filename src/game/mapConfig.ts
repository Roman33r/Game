export const MAP={minX:-320,maxX:320,minZ:-200,maxZ:200,width:640,depth:400,columns:8,rows:5,sectorSize:80,roadSpacing:40,convoyX:-310,maxZombies:1800} as const;
export const clampToMap=(p:{x:number;z:number})=>({x:Math.max(MAP.minX+3,Math.min(MAP.maxX-3,p.x)),z:Math.max(MAP.minZ+3,Math.min(MAP.maxZ-3,p.z))});
