// Shared deterministic footprints keep placement validation aligned with the rendered city.
import {MAP} from './mapConfig';
export interface CityBuilding {x:number;z:number;width:number;depth:number;height:number;style:number;ruined:boolean;seed:number}
function generateCity():CityBuilding[]{
 let seed=72;const rnd=()=>{seed=seed*16807%2147483647;return seed/2147483647;};const result:CityBuilding[]=[];
 // Generate the original centre first so saved bases still match the city.
 const blocks:{x:number;z:number}[]=[];
 for(let x=-140;x<=140;x+=40)for(let z=-100;z<=100;z+=40)blocks.push({x,z});
 for(let x=MAP.minX+20;x<MAP.maxX;x+=40)for(let z=MAP.minZ+20;z<MAP.maxZ;z+=40)if(Math.abs(x)>140||Math.abs(z)>100)blocks.push({x,z});
 for(const {x,z} of blocks){
  if(Math.hypot(x+40,z)<32)continue;
  for(let k=0;k<2;k++){const style=Math.floor(rnd()*4);result.push({x:x+(k?8:-8),z:z+(rnd()-.5)*3,width:11+rnd()*2,depth:18+rnd()*4,height:style===0?7:10+Math.floor(rnd()*4)*4,style,ruined:rnd()>.78,seed:Math.floor(rnd()*100000)});}
 }return result;
}
export const CITY_BUILDINGS=generateCity();
