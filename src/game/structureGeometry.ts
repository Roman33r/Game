import {BUILDING_SIZE} from './data';
import type {World} from './types';
export const normalizeRotation=(degrees=0)=>Number.isFinite(degrees)?((Math.round(degrees/90)*90)%360+360)%360:0;
export function structureFootprint(kind:string,rotation=0):[number,number]{const [x,z]=BUILDING_SIZE[kind];return normalizeRotation(rotation)%180===90?[z,x]:[x,z];}
export function rotateBlueprint(w:World,direction=1){w.buildRotation=normalizeRotation((w.buildRotation||0)+90*direction);}
